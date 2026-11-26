"""
启动引导：Alembic 数据库升级 + 首次管理员。

规则：
- 库里已有管理员：什么都不做（绝不重置已有密码）；
- 没有管理员：必须配置合法的 ADMIN_PASSWORD，否则启动失败；
- 用户名/邮箱冲突（例如同名的普通用户已存在）：启动失败；
- 日志只写原因，不写任何密码。
"""
import logging
from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import inspect
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
MIGRATIONS_DIR = Path(__file__).resolve().parents[2] / "migrations"
LEGACY_BASELINE_REVISION = "0001"


class BootstrapError(RuntimeError):
    """引导失败；消息里不得包含密码。"""


def upgrade_database() -> None:
    """空库执行全部 migration；旧 create_all 库先标记基线再增量升级。"""
    with engine.begin() as connection:
        config = Config()
        config.set_main_option("script_location", str(MIGRATIONS_DIR))
        config.attributes["connection"] = connection

        tables = set(inspect(connection).get_table_names())
        application_tables = set(Base.metadata.tables)
        legacy_tables = tables.intersection(application_tables)
        if "alembic_version" not in tables and legacy_tables:
            if legacy_tables != application_tables:
                raise BootstrapError("数据库结构不完整，无法自动标记 Alembic 基线")
            # stamp 不写业务表；0002 等后续增量 migration 仍会正常执行。
            command.stamp(config, LEGACY_BASELINE_REVISION)
        command.upgrade(config, "head")


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
    """升级数据库 + 引导管理员；任何失败都向调用方抛出。"""
    upgrade_database()
    create_default_admin()
