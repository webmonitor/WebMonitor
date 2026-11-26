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
import ipaddress
import logging
import smtplib
import socket
import ssl
from datetime import datetime
from email.header import Header
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional

from ..core.config import settings
from ..db.crud import get_email_config as get_email_config_row
from ..db.crud import get_user_default_email_config
from ..db.database import SessionLocal
from ..db.models import EmailConfig

logger = logging.getLogger(__name__)


class _SMTPHostRejected(smtplib.SMTPException):
    """DNS 解析包含非公网地址，且主机不在运维例外列表中。"""


def _canonical_smtp_host(host: str) -> str:
    # DNS 主机名不区分大小写；末尾根标签不改变所指的是同一台主机。
    return host.strip().rstrip(".").casefold()


def _resolve_smtp_addresses(host: str, port: int) -> list[tuple]:
    """在建立任何 socket 前解析并验证全部地址，防止混合 DNS 记录重绑定。"""
    records = socket.getaddrinfo(host, port, type=socket.SOCK_STREAM)
    if not records:
        raise OSError("SMTP 主机没有可用地址")

    allowlist = {
        _canonical_smtp_host(item)
        for item in settings.SMTP_ALLOWED_HOSTS.split(",")
        if item.strip()
    }
    host_allowed = _canonical_smtp_host(host) in allowlist
    addresses = []
    seen = set()
    for family, socktype, proto, _canonical_name, sockaddr in records:
        if family not in (socket.AF_INET, socket.AF_INET6):
            raise OSError("SMTP 主机返回了不支持的地址")
        address = ipaddress.ip_address(sockaddr[0])
        if not host_allowed and (
            not address.is_global or address.is_multicast or address.is_reserved or address.is_unspecified
        ):
            raise _SMTPHostRejected("SMTP 主机地址不在允许范围内")
        key = (family, sockaddr)
        if key not in seen:
            seen.add(key)
            addresses.append((family, socktype, proto, sockaddr))
    if not addresses:
        raise OSError("SMTP 主机没有可用地址")
    return addresses


def _open_smtp_socket(
    host: str,
    port: int,
    timeout: float,
    source_address: Optional[tuple] = None,
) -> socket.socket:
    """只连接预先验证的数字地址；不再把原 hostname 交给 socket 解析。"""
    addresses = _resolve_smtp_addresses(host, port)
    last_error = None
    for family, socktype, proto, sockaddr in addresses:
        sock = None
        try:
            sock = socket.socket(family, socktype, proto)
            sock.settimeout(timeout)
            if source_address is not None:
                sock.bind(source_address)
            sock.connect(sockaddr)
            return sock
        except OSError as exc:
            last_error = exc
        except BaseException:
            if sock is not None:
                sock.close()
            raise
        if sock is not None:
            sock.close()
    raise OSError("无法连接 SMTP 服务器") from last_error


class _PinnedSMTP(smtplib.SMTP):
    """STARTTLS 连接：TCP 使用已验证 IP，TLS 仍使用原始主机名。"""

    def _get_socket(self, host, port, timeout):
        return _open_smtp_socket(host, port, timeout, self.source_address)


class _PinnedSMTP_SSL(smtplib.SMTP_SSL):
    """SMTP_SSL 连接：在已验证 IP 的 socket 上校验原 hostname 的证书。"""

    def _get_socket(self, host, port, timeout):
        raw_socket = _open_smtp_socket(host, port, timeout, self.source_address)
        try:
            return self.context.wrap_socket(raw_socket, server_hostname=host)
        except BaseException:
            raw_socket.close()
            raise


def _connect_smtp(host: str, port: int, is_ssl: bool) -> smtplib.SMTP:
    """发送与连接测试的唯一 SMTP 工厂；两种 TLS 模式均验证证书。"""
    context = ssl.create_default_context()
    smtp_class = _PinnedSMTP_SSL if is_ssl else _PinnedSMTP
    server = smtp_class(
        local_hostname="localhost",
        timeout=settings.SMTP_TIMEOUT_SECONDS,
        **({"context": context} if is_ssl else {}),
    )
    try:
        # 手动 connect 以便任何握手失败都能在此关闭半初始化连接。
        # smtplib.starttls 使用 _host 做 SNI/证书主机名，必须保留原始值。
        server._host = host
        code, message = server.connect(host, port)
        if code != 220:
            raise smtplib.SMTPConnectError(code, message)
        server.set_debuglevel(0)
        if not is_ssl:
            server.starttls(context=context)
        return server
    except BaseException:
        _close_smtp(server)
        raise


def _close_smtp(server: smtplib.SMTP) -> None:
    """无论认证、发送还是接收服务器响应是否失败，都释放连接。"""
    try:
        server.quit()
    except Exception:
        # 已经断开的连接会在下面的 close 中强制释放。
        pass
    try:
        server.close()
    except Exception:
        pass


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

        server = None
        try:
            msg = MIMEMultipart()
            msg["From"] = smtp_user
            msg["To"] = receiver_email
            msg["Subject"] = Header(subject, "utf-8")
            msg.attach(MIMEText(content, "plain", "utf-8"))

            server = _connect_smtp(smtp_server, smtp_port, is_ssl)
            server.login(smtp_user, smtp_password)
            server.sendmail(smtp_user, receiver_email, msg.as_string())
            return True

        except (smtplib.SMTPException, UnicodeEncodeError, OSError) as exc:
            logger.error("邮件发送失败 (%s)", type(exc).__name__)
            return False
        finally:
            if server is not None:
                _close_smtp(server)

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

        server = None
        try:
            server = _connect_smtp(smtp_server, smtp_port, is_ssl)
            server.login(smtp_user, smtp_password)
            return {"success": True, "message": "邮件连接测试成功"}

        except (smtplib.SMTPException, UnicodeEncodeError, OSError) as exc:
            logger.error("邮件连接测试失败 (%s)", type(exc).__name__)
            return {"success": False, "error": "邮件连接测试失败"}
        finally:
            if server is not None:
                _close_smtp(server)
