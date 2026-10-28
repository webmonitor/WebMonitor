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

from ..db.crud import (
    create_monitor_log,
    get_monitor_task,
    get_task_subscriptions,
    update_monitor_task_content,
)
from ..db.database import SessionLocal
from .email_service import EmailService

logger = logging.getLogger(__name__)

PAGE_LOAD_TIMEOUT_SECONDS = 30
ELEMENT_WAIT_TIMEOUT_SECONDS = 20


class MonitorService:
    """监控服务"""

    def __init__(self):
        self.email_service = EmailService()

    def get_content_with_selenium(self, url: str, xpath: str) -> Tuple[Optional[str], Optional[str], Optional[str]]:
        """使用 Selenium 获取指定网页 xpath 路径的内容。

        Returns:
            tuple: (内容, 错误信息, 网页标题)
        """
        driver = None
        try:
            chrome_options = Options()
            chrome_options.add_argument("--headless")
            chrome_options.add_argument("--disable-gpu")
            chrome_options.add_argument("--no-sandbox")
            chrome_options.add_argument("--disable-dev-shm-usage")
            chrome_options.add_argument(
                "--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            )

            driver = webdriver.Chrome(options=chrome_options)
            driver.set_page_load_timeout(PAGE_LOAD_TIMEOUT_SECONDS)

            logger.info("正在访问: %s", url)
            driver.get(url)

            wait = WebDriverWait(driver, ELEMENT_WAIT_TIMEOUT_SECONDS)
            element = wait.until(EC.presence_of_element_located((By.XPATH, xpath)))

            content = element.text.strip()
            title = driver.title

            logger.info("成功获取内容: %s - %s...", title, content[:50])
            return content, None, title

        except Exception as exc:  # Selenium 的异常类型很多，统一转成错误串
            error_msg = f"获取内容出错 ({url}): {exc}"
            logger.error(error_msg)
            return None, error_msg, None

        finally:
            if driver:
                driver.quit()

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
            subscriptions = get_task_subscriptions(db=db, task_id=task.id)

            logger.info("任务 %s 有 %s 个订阅者需要通知", task.name, len(subscriptions))

            for subscription in subscriptions:
                try:
                    self.email_service.send_change_notification(
                        task_name=f"[订阅] {task.name}",
                        url=task.url,
                        title=title or "未知标题",
                        old_content=old_content or "无历史内容",
                        new_content=new_content,
                        check_time=check_time,
                        email_config_id=subscription.email_config_id,
                        user_id=subscription.user_id,
                    )
                    logger.info("已向订阅者 %s 发送通知", subscription.user_id)

                except Exception as exc:
                    logger.error("向订阅者 %s 发送通知失败: %s", subscription.user_id, exc)
                    continue

        except Exception as exc:
            logger.error("获取订阅者列表失败: %s", exc)
        finally:
            db.close()
