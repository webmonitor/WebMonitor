"""事务 outbox 的同步投递、崩溃恢复与有限重试。

采集事务只负责写入待投递记录。本模块先把单条记录置为 sending 并提交，
再在数据库事务外调用 SMTP；成功或失败分别落库。若进程在 SMTP 接受邮件后、
标记 delivered 前崩溃，记录会恢复并重发，因此语义是 at-least-once，不是
exactly-once。
"""
import logging
import threading
import time
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy.orm import Session

from ..core.config import settings
from ..db.database import SessionLocal
from ..db.models import NotificationOutbox
from .email_service import EmailService

logger = logging.getLogger(__name__)

OUTBOX_BATCH_SIZE = 100
OUTBOX_MAX_BATCHES_PER_DRAIN = 2
OUTBOX_DRAIN_TIME_BUDGET_SECONDS = 30.0
_drain_lock = threading.Lock()


@dataclass(frozen=True)
class OutboxMessage:
    id: int
    user_id: int
    email_config_id: int
    task_name: str
    url: str
    title: str
    old_content: Optional[str]
    new_content: str
    check_time: datetime
    attempts: int


def _snapshot(row: NotificationOutbox) -> OutboxMessage:
    return OutboxMessage(
        id=row.id,
        user_id=row.user_id,
        email_config_id=row.email_config_id,
        task_name=row.task_name,
        url=row.url,
        title=row.title,
        old_content=row.old_content,
        new_content=row.new_content,
        check_time=row.check_time,
        attempts=row.attempts,
    )


class OutboxService:
    """单进程同步 outbox 投递器；模块锁避免检查线程与恢复作业重复 drain。"""

    def __init__(self, email_service: Optional[EmailService] = None):
        self.email_service = email_service or EmailService()

    @staticmethod
    def _recover_interrupted(db: Session) -> None:
        """没有 drain 持锁时仍存在的 sending 行都是上次中断留下的。"""
        now = datetime.now()
        rows = db.query(NotificationOutbox).filter(NotificationOutbox.status == "sending").all()
        for row in rows:
            if row.attempts >= settings.OUTBOX_MAX_ATTEMPTS:
                row.status = "failed"
                row.last_error = "投递中断且已达最大重试次数"
            else:
                row.status = "pending"
                row.next_attempt_at = now
                row.last_error = "投递中断，等待重试"

    @staticmethod
    def _claim_batch(batch_size: int) -> list[OutboxMessage]:
        db = SessionLocal()
        try:
            now = datetime.now()
            rows = (
                db.query(NotificationOutbox)
                .filter(
                    NotificationOutbox.status == "pending",
                    NotificationOutbox.attempts < settings.OUTBOX_MAX_ATTEMPTS,
                    NotificationOutbox.next_attempt_at <= now,
                )
                .order_by(NotificationOutbox.id)
                .limit(batch_size)
                .all()
            )
            messages = []
            for row in rows:
                row.status = "sending"
                row.attempts += 1
                row.last_error = None
                messages.append(_snapshot(row))
            # SMTP 之前先提交 claim；采集结果早已在另一事务中提交。
            db.commit()
            return messages
        except Exception:
            db.rollback()
            raise
        finally:
            db.close()

    @staticmethod
    def _release_unattempted(messages: list[OutboxMessage]) -> None:
        """时间预算耗尽时释放尚未调用 SMTP 的 claim，不消耗其重试次数。"""
        if not messages:
            return
        snapshots = {message.id: message for message in messages}
        db = SessionLocal()
        try:
            rows = (
                db.query(NotificationOutbox)
                .filter(
                    NotificationOutbox.id.in_(snapshots),
                    NotificationOutbox.status == "sending",
                )
                .all()
            )
            now = datetime.now()
            for row in rows:
                row.status = "pending"
                row.attempts = snapshots[row.id].attempts - 1
                row.next_attempt_at = now
                row.last_error = None
            db.commit()
        except Exception:
            db.rollback()
            raise
        finally:
            db.close()

    @staticmethod
    def _complete(message: OutboxMessage, *, delivered: bool, error: Optional[str] = None) -> None:
        db = SessionLocal()
        try:
            row = (
                db.query(NotificationOutbox)
                .filter(
                    NotificationOutbox.id == message.id,
                    NotificationOutbox.status == "sending",
                )
                .first()
            )
            if row is None:
                return

            now = datetime.now()
            if delivered:
                row.status = "delivered"
                row.delivered_at = now
                row.last_error = None
            else:
                row.last_error = error or "SMTP 投递失败"
                if message.attempts >= settings.OUTBOX_MAX_ATTEMPTS:
                    row.status = "failed"
                else:
                    row.status = "pending"
                    row.next_attempt_at = now + timedelta(
                        seconds=settings.OUTBOX_RETRY_SECONDS * message.attempts
                    )
            db.commit()
        except Exception:
            db.rollback()
            raise
        finally:
            db.close()

    def _deliver(self, message: OutboxMessage) -> bool:
        error = None
        try:
            delivered = self.email_service.send_change_notification(
                task_name=message.task_name,
                url=message.url,
                title=message.title,
                old_content=message.old_content or "无历史内容",
                new_content=message.new_content,
                check_time=message.check_time,
                email_config_id=message.email_config_id,
                user_id=message.user_id,
            )
            if not delivered:
                error = "SMTP 投递失败"
        except Exception as exc:
            # 单封邮件的异常不能中断调度或其他收件人的投递。
            delivered = False
            error = f"SMTP 投递异常: {type(exc).__name__}"
            logger.warning("outbox %s 投递异常 (%s)", message.id, type(exc).__name__)

        self._complete(message, delivered=delivered, error=error)
        return delivered

    def deliver_pending(
        self,
        *,
        batch_size: int = OUTBOX_BATCH_SIZE,
        max_batches: int = OUTBOX_MAX_BATCHES_PER_DRAIN,
        time_budget_seconds: float = OUTBOX_DRAIN_TIME_BUDGET_SECONDS,
    ) -> int:
        """在批次和单调时钟预算内投递；剩余 pending 行留给后续周期。"""
        if not _drain_lock.acquire(blocking=False):
            return 0

        delivered_count = 0
        deadline = time.monotonic() + time_budget_seconds
        try:
            db = SessionLocal()
            try:
                self._recover_interrupted(db)
                db.commit()
            except Exception:
                db.rollback()
                raise
            finally:
                db.close()

            batches = 0
            while batches < max_batches and time.monotonic() < deadline:
                messages = self._claim_batch(batch_size)
                if not messages:
                    break
                batches += 1
                for index, message in enumerate(messages):
                    if time.monotonic() >= deadline:
                        self._release_unattempted(messages[index:])
                        return delivered_count
                    if self._deliver(message):
                        delivered_count += 1
            return delivered_count
        except Exception:
            logger.error("处理 outbox 投递队列失败")
            return delivered_count
        finally:
            _drain_lock.release()
