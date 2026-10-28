"""
邮件服务：配置解析 + SMTP 发送。

邮件配置只存在于数据库里，并且只对本人生效：
1. 显式 `email_config_id`：必须存在且属于该用户，否则失败并记录告警，
   绝不回退到别人的配置；
2. 未指定 ID：该用户 id 最小的配置；
3. 该用户没有任何配置：不发送，只记录一条告警。

没有部署级 SMTP 回退：环境变量不是收件人的来源，邮件只能发到用户自己
配置的地址。
"""
import logging
import smtplib
from datetime import datetime
from email.header import Header
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional

from ..db.crud import get_email_config as get_email_config_row
from ..db.crud import get_user_default_email_config
from ..db.database import SessionLocal
from ..db.models import EmailConfig

logger = logging.getLogger(__name__)


class EmailService:
    """邮件服务"""

    def get_email_config_by_id(self, config_id: int, user_id: int) -> Optional[EmailConfig]:
        """按 id + 归属获取邮件配置；不存在或不属于该用户时返回 None。"""
        db = SessionLocal()
        try:
            config = get_email_config_row(db, config_id)
            if config is None or config.user_id != user_id:
                return None
            return config
        finally:
            db.close()

    def get_email_config(self, user_id: int) -> Optional[EmailConfig]:
        """获取该用户的默认邮件配置（id 最小的一条）。"""
        db = SessionLocal()
        try:
            return get_user_default_email_config(db, user_id)
        finally:
            db.close()

    def _resolve_config(self, user_id: int, email_config_id: Optional[int]) -> Optional[dict]:
        """解析本次发送实际使用的 SMTP 参数；无法确定时返回 None。"""
        if email_config_id is not None:
            config = self.get_email_config_by_id(email_config_id, user_id)
            if config is None:
                logger.warning(
                    "指定的邮件配置不可用，跳过发送：config_id=%s user_id=%s",
                    email_config_id,
                    user_id,
                )
                return None
            return {
                "smtp_server": config.smtp_server,
                "smtp_port": config.smtp_port,
                "smtp_user": config.smtp_user,
                "smtp_password": config.smtp_password,
                "receiver_email": config.receiver_email,
                "is_ssl": config.is_ssl,
            }

        config = self.get_email_config(user_id)
        if config is None:
            logger.warning("用户没有邮件配置，跳过发送：user_id=%s", user_id)
            return None

        return {
            "smtp_server": config.smtp_server,
            "smtp_port": config.smtp_port,
            "smtp_user": config.smtp_user,
            "smtp_password": config.smtp_password,
            "receiver_email": config.receiver_email,
            "is_ssl": config.is_ssl,
        }

    def send_change_notification(
        self,
        task_name: str,
        url: str,
        title: str,
        old_content: str,
        new_content: str,
        check_time: datetime,
        email_config_id: Optional[int] = None,
        *,
        user_id: int,
    ) -> bool:
        """发送内容变化通知邮件给指定用户。"""
        config = self._resolve_config(user_id, email_config_id)
        if config is None:
            return False

        smtp_server = config["smtp_server"]
        smtp_user = config["smtp_user"]
        smtp_password = config["smtp_password"]
        receiver_email = config["receiver_email"]

        if not all([smtp_server, smtp_user, smtp_password, receiver_email]):
            logger.warning("邮件配置不完整，跳过发送：user_id=%s", user_id)
            return False

        subject = f"{title} - 内容更新通知"
        time_str = check_time.strftime("%Y-%m-%d %H:%M:%S")
        email_body = f"""
网页内容已更新！

监控任务: {task_name}
网页标题: {title}
监控URL: {url}
更新时间: {time_str}

---
原内容:
{old_content}

---
新内容:
{new_content}

---
此邮件由 WebMonitor 自动发送。
        """

        logger.info("正在发送变更通知邮件，收件人: %s", receiver_email)
        result = self._send_email(
            subject,
            email_body,
            smtp_server,
            config["smtp_port"],
            smtp_user,
            smtp_password,
            receiver_email,
            config["is_ssl"],
        )

        if result:
            logger.info("变更通知邮件发送成功，收件人: %s", receiver_email)
        else:
            logger.error("变更通知邮件发送失败，收件人: %s", receiver_email)
        return result

    def _send_email(
        self,
        subject: str,
        content: str,
        smtp_server: str,
        smtp_port: int,
        smtp_user: str,
        smtp_password: str,
        receiver_email: str,
        is_ssl: bool = True,
    ) -> bool:
        """发送邮件；失败只记录不含凭据的原因。"""
        if not all([smtp_server, smtp_user, smtp_password, receiver_email]):
            logger.warning("邮件配置不完整，无法发送")
            return False

        try:
            msg = MIMEMultipart()
            msg["From"] = smtp_user
            msg["To"] = receiver_email
            msg["Subject"] = Header(subject, "utf-8")
            msg.attach(MIMEText(content, "plain", "utf-8"))

            if is_ssl:
                server = smtplib.SMTP_SSL(smtp_server, smtp_port, local_hostname="localhost")
            else:
                server = smtplib.SMTP(smtp_server, smtp_port, local_hostname="localhost")
                server.starttls()

            server.set_debuglevel(0)
            server.login(smtp_user, smtp_password)
            server.sendmail(smtp_user, receiver_email, msg.as_string())
            server.quit()
            return True

        except (smtplib.SMTPException, UnicodeEncodeError, OSError) as exc:
            logger.error("邮件发送失败 (%s): %s", type(exc).__name__, exc)
            return False

    def test_email_connection_with_config(self, config: EmailConfig) -> dict:
        """使用指定配置测试 SMTP 连接"""
        return self._test_connection(
            config.smtp_server,
            config.smtp_port,
            config.smtp_user,
            config.smtp_password,
            config.is_ssl,
        )

    def send_test_email(self, config: EmailConfig) -> bool:
        """发送测试邮件"""
        test_time = datetime.now()
        subject = "WebMonitor 邮件配置测试"
        email_body = f"""
这是一封来自 WebMonitor 的测试邮件。

测试时间: {test_time.strftime("%Y-%m-%d %H:%M:%S")}
配置名称: {config.name}
SMTP服务器: {config.smtp_server}:{config.smtp_port}
发件人邮箱: {config.smtp_user}
接收者邮箱: {config.receiver_email}

如果您收到这封邮件，说明邮件配置正常工作！

---
此邮件由 WebMonitor 自动发送。
        """

        logger.info("正在发送测试邮件，配置ID: %s", config.id)
        result = self._send_email(
            subject,
            email_body,
            config.smtp_server,
            config.smtp_port,
            config.smtp_user,
            config.smtp_password,
            config.receiver_email,
            config.is_ssl,
        )

        if result:
            logger.info("测试邮件发送成功，配置ID: %s", config.id)
        else:
            logger.error("测试邮件发送失败，配置ID: %s", config.id)
        return result

    def _test_connection(
        self,
        smtp_server: str,
        smtp_port: int,
        smtp_user: str,
        smtp_password: str,
        is_ssl: bool,
    ) -> dict:
        """测试 SMTP 连接；错误信息不含凭据与异常 repr。"""
        if not all([smtp_server, smtp_user, smtp_password]):
            return {"success": False, "error": "邮件配置不完整"}

        try:
            if is_ssl:
                server = smtplib.SMTP_SSL(smtp_server, smtp_port, local_hostname="localhost")
            else:
                server = smtplib.SMTP(smtp_server, smtp_port, local_hostname="localhost")
                server.starttls()

            server.login(smtp_user, smtp_password)
            server.quit()
            return {"success": True, "message": "邮件连接测试成功"}

        except (smtplib.SMTPException, OSError) as exc:
            logger.error("邮件连接测试失败 (%s): %s", type(exc).__name__, exc)
            return {"success": False, "error": "邮件连接测试失败"}
