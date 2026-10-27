"""
订阅业务服务：公开性校验、额度、状态转换与序列化。

数据库对 `(user_id, task_id)` 有唯一约束，所以"重新订阅"必须复用已有行，
而不是插一条新的。所有读取-判定-提交都在同一把进程内 RLock 里完成：
当前部署是单 Uvicorn 进程 + 后台调度线程，这把锁足以消除本进程内的竞态。
"""
import logging
import threading

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..db.crud import (
    create_task_subscription,
    delete_task_subscription,
    get_email_config,
    get_subscription,
    get_subscription_for_task,
    get_subscription_limit,
    get_user_default_email_config,
    get_user_subscription_count,
    update_task_subscription,
    validate_email_config_ownership,
)
from ..db.models import MonitorTask, TaskSubscription, User
from ..schemas.schemas import (
    TaskSubscriptionCreate,
    TaskSubscriptionResponse,
    TaskSubscriptionUpdate,
)
from .errors import ServiceError

logger = logging.getLogger(__name__)

_lock = threading.RLock()

PUBLIC_TASK_MISSING = "公开任务不存在"
EMAIL_CONFIG_MISSING = "邮箱配置不存在或不属于当前用户"
SUBSCRIPTION_MISSING = "订阅不存在"
ALREADY_SUBSCRIBED = "已经订阅了该任务"
NO_EMAIL_CONFIG = "请先配置邮箱通知设置后再订阅任务"


def require_public_task(db: Session, task_id: int) -> MonitorTask:
    """任务必须存在、公开且启用；否则 404（不区分具体原因）。"""
    task = db.query(MonitorTask).filter(MonitorTask.id == task_id).first()
    if task is None or not task.is_public or not task.is_active:
        raise ServiceError(404, PUBLIC_TASK_MISSING)
    return task


def require_email_config(db: Session, config_id: int | None, user_id: int) -> None:
    """邮件配置必须是本人的；None 表示沿用默认配置。"""
    if config_id is None:
        return
    if get_email_config(db, config_id) is None or not validate_email_config_ownership(db, config_id, user_id):
        raise ServiceError(400, EMAIL_CONFIG_MISSING)


def _ensure_slot_available(db: Session, user: User) -> None:
    limit = get_subscription_limit(user)
    if get_user_subscription_count(db, user.id) >= limit:
        raise ServiceError(400, f"已达到最大订阅数量限制({limit})")


def subscribe(
    db: Session,
    task_id: int,
    user: User,
    email_config_id: int | None,
    is_active: bool = True,
    *,
    update_if_active: bool = False,
) -> TaskSubscription:
    """创建或重新激活订阅（唯一的写入实现）。

    - 已存在且启用：`update_if_active=False` 时 409，否则只更新邮件配置，不占额度；
    - 已存在但停用：复用原行，启用时校验公开性与额度；
    - 不存在：新建，启用时校验公开性与额度。
    """
    with _lock:
        existing = get_subscription_for_task(db, user.id, task_id)

        if existing is not None and existing.is_active and not update_if_active:
            raise ServiceError(409, ALREADY_SUBSCRIBED)

        stays_active = existing is not None and existing.is_active
        activating = is_active and not stays_active
        if existing is None or activating:
            # 只有新建或重新激活才要求任务仍公开/启用
            require_public_task(db, task_id)

        require_email_config(db, email_config_id, user.id)

        if activating:
            _ensure_slot_available(db, user)

        if existing is None:
            payload = TaskSubscriptionCreate(
                task_id=task_id,
                is_active=is_active,
                email_config_id=email_config_id,
            )
            try:
                return create_task_subscription(db, payload, user.id)
            except IntegrityError as exc:
                db.rollback()
                raise ServiceError(409, ALREADY_SUBSCRIBED) from exc

        update: dict = {"is_active": is_active}
        if email_config_id is not None:
            update["email_config_id"] = email_config_id

        try:
            subscription = update_task_subscription(
                db,
                subscription_id=existing.id,
                subscription=TaskSubscriptionUpdate(**update),
                user_id=user.id,
            )
        except IntegrityError as exc:
            db.rollback()
            raise ServiceError(409, ALREADY_SUBSCRIBED) from exc

        if subscription is None:
            raise ServiceError(404, SUBSCRIPTION_MISSING)
        return subscription


def toggle(db: Session, task_id: int, user: User) -> dict:
    """一键订阅/取消订阅。

    取消不要求任务仍然公开或启用（用户要能退出已下线的任务）；只有创建或
    重新激活才校验公开性、额度与默认邮箱配置。
    """
    with _lock:
        existing = get_subscription_for_task(db, user.id, task_id)

        if existing is not None and existing.is_active:
            if not delete_task_subscription(db, existing.id, user.id):
                raise ServiceError(404, SUBSCRIPTION_MISSING)
            return {"message": "订阅取消成功", "subscribed": False}

        require_public_task(db, task_id)

        default_config = get_user_default_email_config(db, user.id)
        if default_config is None:
            raise ServiceError(400, NO_EMAIL_CONFIG)

        subscribe(db, task_id, user, default_config.id, is_active=True)
        return {"message": "订阅成功", "subscribed": True}


def subscribe_with_email(db: Session, task_id: int, user: User, email_config_id: int) -> dict:
    """按指定邮件配置订阅；已有启用的订阅只更新配置。"""
    with _lock:
        require_email_config(db, email_config_id, user.id)

        existing = get_subscription_for_task(db, user.id, task_id)
        was_active = existing is not None and existing.is_active

        subscribe(
            db,
            task_id,
            user,
            email_config_id,
            is_active=True,
            update_if_active=True,
        )

        message = "订阅邮件配置更新成功" if was_active else "订阅成功"
        return {"message": message, "subscribed": True}


def update_subscription(
    db: Session,
    subscription_id: int,
    data: TaskSubscriptionUpdate,
    user: User,
) -> TaskSubscription:
    """更新订阅：显式 null 的 email_config_id 表示回到默认配置。"""
    with _lock:
        existing = get_subscription(db, subscription_id, user.id)
        if existing is None:
            raise ServiceError(404, SUBSCRIPTION_MISSING)

        if data.email_config_id is not None:
            require_email_config(db, data.email_config_id, user.id)

        if data.is_active is True and not existing.is_active:
            require_public_task(db, existing.task_id)
            _ensure_slot_available(db, user)

        updated = update_task_subscription(
            db,
            subscription_id=subscription_id,
            subscription=data,
            user_id=user.id,
        )
        if updated is None:
            raise ServiceError(404, SUBSCRIPTION_MISSING)
        return updated


def delete_subscription(db: Session, subscription_id: int, user: User) -> None:
    """取消订阅；不要求任务仍公开。"""
    with _lock:
        if not delete_task_subscription(db, subscription_id, user.id):
            raise ServiceError(404, SUBSCRIPTION_MISSING)


def serialize_subscription(subscription: TaskSubscription) -> TaskSubscriptionResponse:
    """ORM → 响应 DTO，补齐任务名/URL/所有者。

    用 `model_copy` 生成新的响应对象，不往 ORM 实例上挂临时属性。
    """
    task = subscription.task
    owner = task.owner if task is not None else None

    return TaskSubscriptionResponse.model_validate(subscription).model_copy(
        update={
            "task_name": task.name if task is not None else None,
            "task_url": task.url if task is not None else None,
            "task_owner": owner.username if owner is not None else None,
        }
    )
