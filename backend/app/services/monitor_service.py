"""
监控采集：Selenium 抓取 + 变化判定 + 通知 + 落库。

整个调用链是同步的（Selenium、SQLAlchemy 同步会话、smtplib），由 APScheduler
的工作线程直接调用，FastAPI 侧通过线程池调用，不再用 `asyncio.run` 包一层。
"""
import logging
import threading
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Optional, Tuple

from sqlalchemy import update
from sqlalchemy.orm import Session
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

from ..core.config import settings
from ..db.crud import get_monitor_task, get_task_subscriptions
from ..db.database import SessionLocal
from ..db.models import EmailConfig, MonitorLog, MonitorTask, NotificationOutbox
from .email_service import EmailService
from .outbox_service import OutboxService
from .target_access import CollectorProxy, TargetForbidden, resolve_target

logger = logging.getLogger(__name__)

PAGE_LOAD_TIMEOUT_SECONDS = 30
ELEMENT_WAIT_TIMEOUT_SECONDS = 20
# 手工测试与调度线程调用同一入口，因此共用进程级有界信号量。
_browser_slots = threading.BoundedSemaphore(settings.SELENIUM_MAX_CONCURRENCY)


@dataclass(frozen=True)
class TaskSnapshot:
    id: int
    name: str
    url: str
    xpath: str
    owner_id: int
    email_config_id: Optional[int]
    is_public: bool
    last_content: Optional[str]
    config_version: int


class MonitorService:
    """监控服务"""

    def __init__(self):
        self.email_service = EmailService()
        self.outbox_service = OutboxService(self.email_service)

    def get_content_with_selenium(self, url: str, xpath: str) -> Tuple[Optional[str], Optional[str], Optional[str]]:
        """通过受限代理采集公开 HTTP(S) 页面；每个连接重新校验目标。"""
        with _browser_slots:
            driver = None
            try:
                with CollectorProxy(settings.TARGET_ALLOWED_ORIGINS) as proxy:
                    resolve_target(url, proxy.exceptions)
                    chrome_options = Options()
                    for argument in ("--headless", "--disable-gpu", "--no-sandbox", "--disable-dev-shm-usage",
                                     f"--proxy-server={proxy.url}", "--proxy-bypass-list=<-loopback>",
                                     "--disable-quic", "--force-webrtc-ip-handling-policy=disable_non_proxied_udp",
                                     "--disable-background-networking", "--disable-component-update", "--no-first-run"):
                        chrome_options.add_argument(argument)
                    chrome_options.add_argument(
                        "--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
                    try:
                        driver = webdriver.Chrome(options=chrome_options)
                        driver.set_page_load_timeout(PAGE_LOAD_TIMEOUT_SECONDS)
                        driver.get(url)
                        wait = WebDriverWait(driver, ELEMENT_WAIT_TIMEOUT_SECONDS)
                        element = wait.until(EC.presence_of_element_located((By.XPATH, xpath)))
                        content, title = element.text.strip(), driver.title
                        if proxy.blocked:
                            raise TargetForbidden("目标地址不在允许范围内")
                        return content, None, title
                    finally:
                        if driver is not None:
                            driver.quit()
            except TargetForbidden:
                return None, "目标地址不在允许范围内", None
            except Exception:
                logger.warning("网页采集失败")
                return None, "网页采集失败", None

    def check_single_task(self, task_id: int) -> bool:
        """版本围栏采集；baseline、last_check、日志和 outbox 只提交一次。"""
        db = SessionLocal()
        try:
            task = get_monitor_task(db, task_id)
            if task is None or not task.is_active:
                logger.info("任务 %s 不存在或未启用，跳过检查", task_id)
                return False
            snapshot = TaskSnapshot(
                id=task.id,
                name=task.name,
                url=task.url,
                xpath=task.xpath,
                owner_id=task.owner_id,
                email_config_id=task.email_config_id,
                is_public=task.is_public,
                last_content=task.last_content,
                config_version=task.config_version,
            )
        finally:
            db.close()

        logger.info("开始检查任务: %s (ID: %s)", snapshot.name, task_id)
        current_content, error_message, title = self.get_content_with_selenium(snapshot.url, snapshot.xpath)
        if current_content is None and error_message is None:
            error_message = "网页采集失败"
        check_time = datetime.now()
        old_content = snapshot.last_content
        is_changed = error_message is None and old_content != current_content

        db = SessionLocal()
        try:
            # 任一配置编辑都会递增版本；条件更新失败时整次采集直接丢弃。
            result = db.execute(
                update(MonitorTask)
                .where(
                    MonitorTask.id == snapshot.id,
                    MonitorTask.config_version == snapshot.config_version,
                    MonitorTask.is_active == True,  # noqa: E712
                    MonitorTask.url == snapshot.url,
                    MonitorTask.xpath == snapshot.xpath,
                )
                .values(
                    last_content=current_content if error_message is None else MonitorTask.last_content,
                    last_check=check_time,
                )
            )
            if result.rowcount != 1:
                db.rollback()
                logger.info("任务 %s 在采集期间已修改、停用或删除，丢弃过期结果", task_id)
                return False

            db.add(
                MonitorLog(
                    task_id=task_id,
                    # 未变化/失败日志只保留状态和错误，不重复存储两份正文。
                    old_content=old_content if is_changed else None,
                    new_content=current_content if is_changed else None,
                    is_changed=is_changed,
                    error_message=error_message,
                    check_time=check_time,
                )
            )

            if is_changed:
                if snapshot.email_config_id is None:
                    logger.info("任务 %s 未配置邮件通知，跳过所有者通知", task.name)
                else:
                    self._enqueue_outbox(
                        db,
                        snapshot=snapshot,
                        user_id=snapshot.owner_id,
                        email_config_id=snapshot.email_config_id,
                        task_name=snapshot.name,
                        title=title or "未知标题",
                        new_content=current_content,
                        check_time=check_time,
                    )
                if snapshot.is_public:
                    self._enqueue_subscriber_outbox(
                        db,
                        snapshot=snapshot,
                        title=title or "未知标题",
                        new_content=current_content,
                        check_time=check_time,
                    )

            # 唯一提交点：此后才允许任何 SMTP 调用。
            db.commit()
        except Exception as exc:
            db.rollback()
            logger.error(
                "任务 %s 的采集事务失败 (%s)，baseline、日志和 outbox 均已回滚",
                task_id,
                type(exc).__name__,
            )
            return False
        finally:
            db.close()

        self.outbox_service.deliver_pending()
        logger.info("任务 %s 检查完成，变化: %s", task.name, is_changed)
        return error_message is None

    def test_task(self, task_id: int, url: str, xpath: str) -> dict:
        """使用调用方已授权的快照测试采集；本路径不创建数据库会话。"""
        logger.info("测试任务 ID: %s", task_id)
        try:
            current_content, error_message, title = self.get_content_with_selenium(url, xpath)
            if error_message:
                return {"success": False, "error": error_message}

            return {
                "success": True,
                "content": current_content,
                "title": title,
                "url": url,
                "message": "测试成功",
            }
        except Exception as exc:
            # 不把可能包含 URL、凭据或内部路径的异常文本返回给客户端。
            logger.error("测试任务 %s 时发生错误 (%s)", task_id, type(exc).__name__)
            return {"success": False, "error": "测试任务时发生错误"}

    @staticmethod
    def cleanup_old_logs() -> int:
        """删除超过保留期的日志并返回行数；由调度作业周期调用。"""
        cutoff = datetime.now() - timedelta(days=settings.LOG_RETENTION_DAYS)
        db = SessionLocal()
        try:
            deleted = (
                db.query(MonitorLog)
                .filter(MonitorLog.check_time < cutoff)
                .delete(synchronize_session=False)
            )
            db.commit()
            return deleted
        except Exception:
            db.rollback()
            raise
        finally:
            db.close()

    @staticmethod
    def _enqueue_outbox(
        db: Session,
        *,
        snapshot: TaskSnapshot,
        user_id: int,
        email_config_id: int,
        task_name: str,
        title: str,
        new_content: str,
        check_time: datetime,
    ) -> None:
        """只持久化同一采集快照；此函数不得调用 SMTP 或 commit。"""
        db.add(
            NotificationOutbox(
                task_id=snapshot.id,
                user_id=user_id,
                email_config_id=email_config_id,
                task_name=task_name,
                url=snapshot.url,
                title=title,
                old_content=snapshot.last_content or "无历史内容",
                new_content=new_content,
                check_time=check_time,
                status="pending",
                attempts=0,
                next_attempt_at=check_time,
            )
        )

    def _enqueue_subscriber_outbox(
        self,
        db: Session,
        *,
        snapshot: TaskSnapshot,
        title: str,
        new_content: str,
        check_time: datetime,
    ) -> None:
        """分批读取全部启用订阅，并在同一事务中冻结各自默认配置。"""
        cursor = 0
        while True:
            subscriptions = get_task_subscriptions(
                db=db,
                task_id=snapshot.id,
                after_id=cursor,
                limit=100,
            )
            if not subscriptions:
                return
            cursor = subscriptions[-1].id

            explicit_ids = {row.email_config_id for row in subscriptions if row.email_config_id is not None}
            configs = (
                db.query(EmailConfig).filter(EmailConfig.id.in_(explicit_ids)).all()
                if explicit_ids
                else []
            )
            by_id = {config.id: config for config in configs}
            default_rows = (
                db.query(EmailConfig)
                .filter(EmailConfig.user_id.in_({row.user_id for row in subscriptions}))
                .order_by(EmailConfig.user_id, EmailConfig.id)
                .all()
            )
            defaults = {}
            for config in default_rows:
                defaults.setdefault(config.user_id, config)

            for subscription in subscriptions:
                if subscription.email_config_id is None:
                    config = defaults.get(subscription.user_id)
                else:
                    config = by_id.get(subscription.email_config_id)
                if config is None or config.user_id != subscription.user_id:
                    logger.warning(
                        "订阅 %s 的邮件配置不可用，跳过创建 outbox",
                        subscription.id,
                    )
                    continue
                self._enqueue_outbox(
                    db,
                    snapshot=snapshot,
                    user_id=subscription.user_id,
                    email_config_id=config.id,
                    task_name=f"[订阅] {snapshot.name}",
                    title=title,
                    new_content=new_content,
                    check_time=check_time,
                )
