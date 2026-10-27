"""
启动引导：建表 + 首次管理员。

规则：
- 库里已有管理员：什么都不做（绝不重置已有密码）；
- 没有管理员：必须配置合法的 ADMIN_PASSWORD，否则启动失败；
- 用户名/邮箱冲突（例如同名的普通用户已存在）：启动失败；
- 日志只写原因，不写任何密码。
"""
import logging

from sqlalchemy.orm import Session

from ..core.config import settings
from ..core.passwords import validate_password
from ..db.crud import create_user as create_user_row
from ..db.database import Base, SessionLocal, engine
from ..db.models import User
from ..schemas.schemas import UserCreate

logger = logging.getLogger(__name__)

DEFAULT_ADMIN_FULL_NAME = "系统管理员"
DEFAULT_ADMIN_MAX_SUBSCRIPTIONS = 10


class BootstrapError(RuntimeError):
    """引导失败；消息里不得包含密码。"""


def create_all_tables() -> None:
    """建表（幂等）。"""
    Base.metadata.create_all(bind=engine)


def _bootstrap_password() -> str:
    secret = settings.ADMIN_PASSWORD
    if secret is None or secret.get_secret_value() == "":
        raise BootstrapError(
            "数据库中还没有管理员账户，请设置 ADMIN_PASSWORD 后重新启动"
        )

    password = secret.get_secret_value()
    try:
        validate_password(password)
    except ValueError as exc:
        raise BootstrapError(f"ADMIN_PASSWORD 不合法：{exc}") from exc
    return password


def create_default_admin(db: Session | None = None) -> bool:
    """没有管理员时按配置创建；返回是否真的创建了新账户。"""
    own_session = db is None
    session = db or SessionLocal()
    try:
        if session.query(User).filter(User.is_admin == True).first() is not None:  # noqa: E712
            logger.info("管理员账户已存在，跳过引导")
            return False

        username = settings.ADMIN_USERNAME
        email = settings.ADMIN_EMAIL

        if session.query(User).filter(User.username == username).first() is not None:
            raise BootstrapError(f"用户名 {username} 已被非管理员账户占用，无法创建管理员")
        if session.query(User).filter(User.email == email).first() is not None:
            raise BootstrapError(f"邮箱 {email} 已被占用，无法创建管理员")

        password = _bootstrap_password()

        create_user_row(
            session,
            UserCreate(
                username=username,
                email=email,
                full_name=DEFAULT_ADMIN_FULL_NAME,
                password=password,
                is_admin=True,
                is_active=True,
                max_subscriptions=DEFAULT_ADMIN_MAX_SUBSCRIPTIONS,
            ),
        )
        logger.info("已创建引导管理员账户: %s", username)
        return True
    finally:
        if own_session:
            session.close()


def bootstrap() -> None:
    """建表 + 引导管理员；任何失败都向调用方抛出。"""
    create_all_tables()
    create_default_admin()
