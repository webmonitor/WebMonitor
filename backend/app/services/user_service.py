"""
用户管理业务服务：唯一性冲突、密码策略与删除后的调度同步。

公开注册与管理员创建走同一个 `create_user`，区别只在构造 `UserCreate` 时
填什么角色/额度，路由不再自己拼业务判断。
"""
import logging

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..db.crud import (
    create_user as create_user_row,
    delete_user as delete_user_row,
    get_user,
    get_user_by_email,
    get_user_by_username,
    update_user as update_user_row,
)
from ..db.models import User
from ..schemas.schemas import UserCreate, UserUpdate
from .errors import ServiceError
from .scheduler import monitor_scheduler

logger = logging.getLogger(__name__)

USERNAME_EXISTS = "用户名已存在"
EMAIL_EXISTS = "邮箱已存在"
DUPLICATE_DETAIL = "用户名或邮箱已存在"
USER_MISSING = "用户不存在"


def _check_uniqueness(db: Session, username: str, email: str, *, exclude_user_id: int | None = None) -> None:
    existing = get_user_by_username(db, username)
    if existing is not None and existing.id != exclude_user_id:
        raise ServiceError(409, USERNAME_EXISTS)

    existing = get_user_by_email(db, email)
    if existing is not None and existing.id != exclude_user_id:
        raise ServiceError(409, EMAIL_EXISTS)


def create_user(db: Session, data: UserCreate) -> User:
    """创建用户；唯一键冲突统一 409。"""
    _check_uniqueness(db, data.username, str(data.email))

    try:
        return create_user_row(db, data)
    except IntegrityError as exc:
        db.rollback()
        raise ServiceError(409, DUPLICATE_DETAIL) from exc


def update_user(db: Session, user_id: int, data: UserUpdate) -> User:
    """更新用户；密码省略/空字符串表示保留原密码。"""
    existing = get_user(db, user_id)
    if existing is None:
        raise ServiceError(404, USER_MISSING)

    username = data.username if data.username is not None else existing.username
    email = str(data.email) if data.email is not None else existing.email
    _check_uniqueness(db, username, email, exclude_user_id=user_id)

    try:
        updated = update_user_row(db, user_id, data)
    except IntegrityError as exc:
        db.rollback()
        raise ServiceError(409, DUPLICATE_DETAIL) from exc

    if updated is None:
        raise ServiceError(404, USER_MISSING)
    return updated


def delete_user(db: Session, user_id: int) -> None:
    """删除用户；级联删除的任务必须同步移出调度作业表。"""
    if not delete_user_row(db, user_id):
        raise ServiceError(404, USER_MISSING)

    monitor_scheduler.sync_tasks()
