"""
监控采集：Selenium 抓取 + 变化判定 + 通知 + 落库。

整个调用链是同步的（Selenium、SQLAlchemy 同步会话、smtplib），由 APScheduler
的工作线程直接调用，FastAPI 侧通过线程池调用，不再用 `asyncio.run` 包一层。
"""
import logging
from datetime import datetime
from typing import Optional, Tuple

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

from ..core.config import settings
from ..db.crud import (
    create_monitor_log,
    get_monitor_task,
    get_task_subscriptions,
    update_monitor_task_content,
)
from ..db.database import SessionLocal
from .email_service import EmailService
from .target_access import CollectorProxy, TargetForbidden, resolve_target

logger = logging.getLogger(__name__)

PAGE_LOAD_TIMEOUT_SECONDS = 30
ELEMENT_WAIT_TIMEOUT_SECONDS = 20


class MonitorService:
    """监控服务"""

    def __init__(self):
        self.email_service = EmailService()

    def get_content_with_selenium(self, url: str, xpath: str) -> Tuple[Optional[str], Optional[str], Optional[str]]:
        """通过受限代理采集公开 HTTP(S) 页面；每个连接重新校验目标。"""
        driver = None
        try:
            with CollectorProxy(settings.TARGET_ALLOWED_ORIGINS) as proxy:
                resolve_target(url, proxy.exceptions)
                chrome_options = Options()
                for argument in ("--headless", "--disable-gpu", "--no-sandbox", "--disable-dev-shm-usage",
                                 f"--proxy-server={proxy.url}", "--proxy-bypass-list=<-loopback>",
                                 "--disable-quic", "--force-webrtc-ip-handling-policy=disable_non_proxied_udp"):
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
        """检查单个监控任务。

        Returns:
            bool: 检查是否成功
        """
        db = SessionLocal()
        try:
            task = get_monitor_task(db, task_id)

            if not task or not task.is_active:
                logger.info("任务 %s 不存在或未启用，跳过检查", task_id)
                return False

            logger.info("开始检查任务: %s (ID: %s)", task.name, task_id)

            current_content, error_message, title = self.get_content_with_selenium(task.url, task.xpath)

            check_time = datetime.now()

            if error_message:
                create_monitor_log(
                    db=db,
                    task_id=task_id,
                    error_message=error_message,
                    check_time=check_time,
                )
                logger.error("任务 %s 检查失败: %s", task.name, error_message)
                return False

            old_content = task.last_content
            is_changed = old_content != current_content

            if is_changed:
                logger.info("任务 %s 检测到内容变化", task.name)

                # 任务可以完全没有邮件配置：那样只采集与记录，不发通知。
                if task.email_config_id is None:
                    logger.info("任务 %s 未配置邮件通知，跳过所有者通知", task.name)
                else:
                    try:
                        self.email_service.send_change_notification(
                            task_name=task.name,
                            url=task.url,
                            title=title or "未知标题",
                            old_content=old_content or "无历史内容",
                            new_content=current_content,
                            check_time=check_time,
                            email_config_id=task.email_config_id,
                            user_id=task.owner_id,
                        )
                    except Exception as exc:
                        logger.error("发送任务所有者邮件通知失败: %s", exc)

                if task.is_public:
                    self._notify_subscribers(task, title, current_content, old_content, check_time)

            update_monitor_task_content(db, task_id, current_content, check_time)

            create_monitor_log(
                db=db,
                task_id=task_id,
                old_content=old_content,
                new_content=current_content,
                is_changed=is_changed,
                check_time=check_time,
            )

            logger.info("任务 %s 检查完成，变化: %s", task.name, is_changed)
            return True

        except Exception as exc:
            error_msg = f"检查任务 {task_id} 时发生错误: {exc}"
            logger.error(error_msg)

            try:
                create_monitor_log(
                    db=db,
                    task_id=task_id,
                    error_message=error_msg,
                    check_time=datetime.now(),
                )
            except Exception as log_error:
                logger.error("记录错误日志失败: %s", log_error)

            return False

        finally:
            db.close()

    def test_task(self, task_id: int) -> dict:
        """测试监控任务：只抓取，不写 baseline、last_check 或日志。"""
        db = SessionLocal()
        try:
            task = get_monitor_task(db, task_id)

            if not task:
                return {"success": False, "error": "任务不存在"}

            logger.info("测试任务: %s (ID: %s)", task.name, task_id)

            current_content, error_message, title = self.get_content_with_selenium(task.url, task.xpath)

            if error_message:
                return {"success": False, "error": error_message}

            return {
                "success": True,
                "content": current_content,
                "title": title,
                "url": task.url,
                "message": "测试成功",
            }

        except Exception as exc:
            error_msg = f"测试任务 {task_id} 时发生错误: {exc}"
            logger.error(error_msg)
            return {"success": False, "error": error_msg}

        finally:
            db.close()

    def _notify_subscribers(
        self,
        task,
        title: Optional[str],
        new_content: str,
        old_content: Optional[str],
        check_time: datetime,
    ) -> None:
        """向公开任务的订阅者发送变更通知。"""
        db = SessionLocal()
        try:
            cursor = 0
            while True:
                db.expire_all()
                live = get_monitor_task(db, task.id)
                if live is None or not live.is_public or not live.is_active:
                    return
                subscriptions = get_task_subscriptions(db=db, task_id=task.id,
                                                       after_id=cursor, limit=100)
                if not subscriptions:
                    break
                for subscription in subscriptions:
                    cursor = subscription.id
                    try:
                        self.email_service.send_change_notification(
                            task_name=f"[订阅] {live.name}", url=live.url,
                            title=title or "未知标题", old_content=old_content or "无历史内容",
                            new_content=new_content, check_time=check_time,
                            email_config_id=subscription.email_config_id, user_id=subscription.user_id)
                    except Exception:
                        logger.warning("订阅邮件发送失败，继续处理其他订阅")

        except Exception as exc:
            logger.error("获取订阅者列表失败: %s", exc)
        finally:
            db.close()
