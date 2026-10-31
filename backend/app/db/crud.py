"""
持久化层：只做查询与写入，不做权限/业务判定。

归属校验、黑名单、额度、调度同步都在 `app/services/` 里；这里的方法按
调用方给的 `user_id`/`task_id` 精确过滤，不再提供"全库第一条"这类会串用户
的入口。
"""
from datetime import datetime
from typing import List, Optional, Union
from urllib.parse import urlparse

from sqlalchemy import and_, desc, func
from sqlalchemy.orm import Session

from ..schemas.schemas import (
    BlacklistDomainCreate,
    BlacklistDomainUpdate,
    EmailConfigCreate,
    EmailConfigUpdate,
    MonitorTaskCreate,
    MonitorTaskUpdate,
    TaskSubscriptionCreate,
    TaskSubscriptionUpdate,
    UserCreate,
    UserUpdate,
)
from .models import BlacklistDomain, EmailConfig, MonitorLog, MonitorTask, TaskSubscription, User

DEFAULT_MAX_SUBSCRIPTIONS = 10


def validate_email_config_ownership(db: Session, email_config_id: Optional[int], user_id: int) -> bool:
    """验证邮箱配置是否属于指定用户"""
    if email_config_id is None:
        return True  # None 表示沿用默认配置

    config = db.query(EmailConfig).filter(
        EmailConfig.id == email_config_id,
        EmailConfig.user_id == user_id,
    ).first()
    return config is not None


def create_monitor_task(db: Session, task: MonitorTaskCreate, owner_id: int) -> MonitorTask:
    """创建监控任务"""
    db_task = MonitorTask(
        name=task.name,
        url=task.url,
        xpath=task.xpath,
        interval=task.interval,
        is_active=task.is_active,
        is_public=task.is_public,
        description=task.description,
        owner_id=owner_id,
        email_config_id=task.email_config_id,
    )
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task


def get_monitor_task(db: Session, task_id: int) -> Union[MonitorTask, None]:
    """获取单个监控任务"""
    return db.query(MonitorTask).filter(MonitorTask.id == task_id).first()


def update_monitor_task(db: Session, task_id: int, task: MonitorTaskUpdate) -> Union[MonitorTask, None]:
    """更新监控任务"""
    db_task = db.query(MonitorTask).filter(MonitorTask.id == task_id).first()
    if db_task is None:
        return None

    update_data = task.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_task, field, value)

    db.commit()
    db.refresh(db_task)
    return db_task


def delete_monitor_task(db: Session, task_id: int) -> bool:
    """删除监控任务"""
    db_task = db.query(MonitorTask).filter(MonitorTask.id == task_id).first()
    if db_task is None:
        return False

    db.delete(db_task)
    db.commit()
    return True


def create_monitor_log(
    db: Session,
    task_id: int,
    old_content: str = None,
    new_content: str = None,
    is_changed: bool = False,
    error_message: str = None,
    check_time: datetime = None,
) -> MonitorLog:
    """创建监控日志"""
    db_log = MonitorLog(
        task_id=task_id,
        old_content=old_content,
        new_content=new_content,
        is_changed=is_changed,
        error_message=error_message,
        check_time=check_time or datetime.now(),
    )
    db.add(db_log)
    db.commit()
    db.refresh(db_log)
    return db_log


def get_monitor_logs(db: Session, task_id: int, skip: int = 0, limit: int = 100) -> List[MonitorLog]:
    """获取监控任务日志（check_time 倒序，同一时刻按 id 倒序保证稳定分页）"""
    return (
        db.query(MonitorLog)
        .filter(MonitorLog.task_id == task_id)
        .order_by(desc(MonitorLog.check_time), desc(MonitorLog.id))
        .offset(skip)
        .limit(limit)
        .all()
    )


def count_monitor_logs(db: Session, task_id: int) -> int:
    """统计监控任务日志条数"""
    return db.query(MonitorLog).filter(MonitorLog.task_id == task_id).count()


def get_latest_monitor_logs(db: Session, user_id: int, limit: int = 10) -> List[MonitorLog]:
    """获取指定用户自己的任务的最新日志"""
    return (
        db.query(MonitorLog)
        .join(MonitorTask, MonitorLog.task_id == MonitorTask.id)
        .filter(MonitorTask.owner_id == user_id)
        .order_by(desc(MonitorLog.check_time), desc(MonitorLog.id))
        .limit(limit)
        .all()
    )


def update_monitor_task_content(db: Session, task_id: int, content: str, check_time: datetime) -> bool:
    """更新监控任务内容和检查时间"""
    db_task = db.query(MonitorTask).filter(MonitorTask.id == task_id).first()
    if db_task is None:
        return False

    db_task.last_content = content
    db_task.last_check = check_time
    db.commit()
    return True


def get_active_monitor_tasks(db: Session) -> List[MonitorTask]:
    """获取所有活跃的监控任务"""
    return db.query(MonitorTask).filter(MonitorTask.is_active == True).all()  # noqa: E712


# 邮件配置相关CRUD操作
def create_email_config(db: Session, config: EmailConfigCreate, user_id: int) -> EmailConfig:
    """创建邮件配置"""
    db_config = EmailConfig(
        name=config.name,
        smtp_server=config.smtp_server,
        smtp_port=config.smtp_port,
        smtp_user=config.smtp_user,
        smtp_password=config.smtp_password,
        receiver_email=config.receiver_email,
        is_ssl=config.is_ssl,
        user_id=user_id,
    )
    db.add(db_config)
    db.commit()
    db.refresh(db_config)
    return db_config


def get_user_email_configs(db: Session, user_id: int, skip: int = 0, limit: int = 100) -> List[EmailConfig]:
    """获取用户的邮件配置列表"""
    return (
        db.query(EmailConfig)
        .filter(EmailConfig.user_id == user_id)
        .order_by(EmailConfig.id)
        .offset(skip)
        .limit(limit)
        .all()
    )


def get_email_config(db: Session, config_id: int) -> Union[EmailConfig, None]:
    """获取单个邮件配置（调用方必须再校验归属）"""
    return db.query(EmailConfig).filter(EmailConfig.id == config_id).first()


def get_user_default_email_config(db: Session, user_id: int) -> Union[EmailConfig, None]:
    """获取用户的默认邮件配置：该用户 id 最小的配置。"""
    return (
        db.query(EmailConfig)
        .filter(EmailConfig.user_id == user_id)
        .order_by(EmailConfig.id)
        .first()
    )


def update_email_config(db: Session, config_id: int, config: EmailConfigUpdate) -> Union[EmailConfig, None]:
    """更新邮件配置"""
    db_config = db.query(EmailConfig).filter(EmailConfig.id == config_id).first()
    if db_config is None:
        return None

    update_data = config.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_config, field, value)

    db.commit()
    db.refresh(db_config)
    return db_config


def count_email_config_references(db: Session, config_id: int) -> int:
    """统计仍引用该邮件配置的任务与订阅（含停用订阅）。"""
    task_refs = db.query(MonitorTask).filter(MonitorTask.email_config_id == config_id).count()
    subscription_refs = db.query(TaskSubscription).filter(TaskSubscription.email_config_id == config_id).count()
    return task_refs + subscription_refs


def delete_email_config(db: Session, config_id: int) -> bool:
    """删除邮件配置"""
    db_config = db.query(EmailConfig).filter(EmailConfig.id == config_id).first()
    if db_config is None:
        return False

    db.delete(db_config)
    db.commit()
    return True


# 用户相关CRUD操作
def create_user(db: Session, user: UserCreate) -> User:
    """创建用户"""
    from ..services.auth_service import get_password_hash

    db_user = User(
        username=user.username,
        email=user.email,
        hashed_password=get_password_hash(user.password),
        full_name=user.full_name,
        is_active=user.is_active,
        is_admin=user.is_admin,
        max_subscriptions=user.max_subscriptions,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


def get_users(db: Session, skip: int = 0, limit: int = 100) -> List[User]:
    """获取用户列表"""
    return db.query(User).order_by(User.id).offset(skip).limit(limit).all()


def get_user(db: Session, user_id: int) -> Union[User, None]:
    """获取单个用户"""
    return db.query(User).filter(User.id == user_id).first()


def get_user_by_username(db: Session, username: str) -> Union[User, None]:
    """根据用户名获取用户"""
    return db.query(User).filter(User.username == username).first()


def get_user_by_email(db: Session, email: str) -> Union[User, None]:
    """根据邮箱获取用户"""
    return db.query(User).filter(User.email == email).first()


def update_user(db: Session, user_id: int, user: UserUpdate) -> Union[User, None]:
    """更新用户；password 省略或空字符串表示保留原密码。"""
    db_user = db.query(User).filter(User.id == user_id).first()
    if db_user is None:
        return None

    update_data = user.model_dump(exclude_unset=True)

    password = update_data.pop("password", None)
    if password:
        from ..services.auth_service import get_password_hash

        db_user.hashed_password = get_password_hash(password)

    for field, value in update_data.items():
        setattr(db_user, field, value)

    db.commit()
    db.refresh(db_user)
    return db_user


def delete_user(db: Session, user_id: int) -> bool:
    """删除用户"""
    db_user = db.query(User).filter(User.id == user_id).first()
    if db_user is None:
        return False

    db.delete(db_user)
    db.commit()
    return True


def get_user_monitor_tasks(db: Session, user_id: int, skip: int = 0, limit: int = 100) -> List[MonitorTask]:
    """获取用户的监控任务列表"""
    return (
        db.query(MonitorTask)
        .filter(MonitorTask.owner_id == user_id)
        .order_by(MonitorTask.id)
        .offset(skip)
        .limit(limit)
        .all()
    )


# 黑名单域名相关CRUD操作
def create_blacklist_domain(db: Session, domain: BlacklistDomainCreate, created_by: int) -> BlacklistDomain:
    """创建黑名单域名"""
    db_domain = BlacklistDomain(
        domain=domain.domain,
        description=domain.description,
        is_active=domain.is_active,
        created_by=created_by,
    )
    db.add(db_domain)
    db.commit()
    db.refresh(db_domain)
    return db_domain


def get_blacklist_domains(db: Session, skip: int = 0, limit: int = 100) -> List[BlacklistDomain]:
    """获取黑名单域名列表"""
    return (
        db.query(BlacklistDomain)
        .filter(BlacklistDomain.is_active == True)  # noqa: E712
        .order_by(BlacklistDomain.id)
        .offset(skip)
        .limit(limit)
        .all()
    )


def get_blacklist_domain(db: Session, domain_id: int) -> Union[BlacklistDomain, None]:
    """获取单个黑名单域名"""
    return db.query(BlacklistDomain).filter(BlacklistDomain.id == domain_id).first()


def update_blacklist_domain(db: Session, domain_id: int, domain: BlacklistDomainUpdate) -> Union[BlacklistDomain, None]:
    """更新黑名单域名"""
    db_domain = db.query(BlacklistDomain).filter(BlacklistDomain.id == domain_id).first()
    if db_domain is None:
        return None

    update_data = domain.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_domain, field, value)

    db.commit()
    db.refresh(db_domain)
    return db_domain


def delete_blacklist_domain(db: Session, domain_id: int) -> bool:
    """删除黑名单域名"""
    db_domain = db.query(BlacklistDomain).filter(BlacklistDomain.id == domain_id).first()
    if db_domain is None:
        return False

    db.delete(db_domain)
    db.commit()
    return True


def is_url_in_blacklist(db: Session, url: str) -> bool:
    """检查URL是否在黑名单中"""
    try:
        parsed_url = urlparse(url)
        domain = parsed_url.netloc.lower()

        if ":" in domain:
            domain = domain.split(":")[0]

        blacklist_rules = db.query(BlacklistDomain).filter(
            BlacklistDomain.is_active == True  # noqa: E712
        ).all()

        for rule in blacklist_rules:
            rule_domain = rule.domain.lower().strip()

            # 1. 精确匹配
            if rule_domain == domain:
                return True

            # 2. 通配符匹配 (*.example.com)
            if rule_domain.startswith("*."):
                wildcard_domain = rule_domain[2:]
                if domain == wildcard_domain or domain.endswith("." + wildcard_domain):
                    return True

            # 3. 部分匹配
            if rule_domain in domain:
                return True

        return False
    except Exception:
        return False


def is_url_allowed_for_user(db: Session, url: str, is_admin: bool) -> bool:
    """检查用户是否可以监控指定URL"""
    if is_admin:
        return True

    return not is_url_in_blacklist(db, url)


# 任务订阅相关CRUD操作
def create_task_subscription(db: Session, subscription: TaskSubscriptionCreate, user_id: int) -> TaskSubscription:
    """创建任务订阅（唯一性由数据库约束保证，调用方负责预检与业务规则）"""
    db_subscription = TaskSubscription(
        user_id=user_id,
        task_id=subscription.task_id,
        is_active=subscription.is_active,
        email_config_id=subscription.email_config_id,
    )
    db.add(db_subscription)
    db.commit()
    db.refresh(db_subscription)
    return db_subscription


def get_user_subscriptions(db: Session, user_id: int, skip: int = 0, limit: int = 100) -> List[TaskSubscription]:
    """获取用户的订阅列表"""
    return (
        db.query(TaskSubscription)
        .filter(TaskSubscription.user_id == user_id)
        .order_by(TaskSubscription.id)
        .offset(skip)
        .limit(limit)
        .all()
    )


def get_task_subscriptions(db: Session, task_id: int, skip: int = 0, limit: int = 100,
                           *, after_id: int = 0) -> List[TaskSubscription]:
    """获取任务当前生效的订阅列表"""
    return (
        db.query(TaskSubscription)
        .filter(TaskSubscription.task_id == task_id, TaskSubscription.is_active == True,
                TaskSubscription.id > after_id)  # noqa: E712
        .order_by(TaskSubscription.id)
        .offset(skip)
        .limit(limit)
        .all()
    )


def get_subscription(db: Session, subscription_id: int, user_id: int) -> Union[TaskSubscription, None]:
    """获取单个订阅"""
    return (
        db.query(TaskSubscription)
        .filter(TaskSubscription.id == subscription_id, TaskSubscription.user_id == user_id)
        .first()
    )


def get_subscription_for_task(db: Session, user_id: int, task_id: int) -> Union[TaskSubscription, None]:
    """获取用户对指定任务的订阅记录（不区分是否启用）"""
    return (
        db.query(TaskSubscription)
        .filter(TaskSubscription.user_id == user_id, TaskSubscription.task_id == task_id)
        .first()
    )


def update_task_subscription(
    db: Session,
    subscription_id: int,
    subscription: TaskSubscriptionUpdate,
    user_id: int,
) -> Union[TaskSubscription, None]:
    """更新任务订阅"""
    db_subscription = db.query(TaskSubscription).filter(
        TaskSubscription.id == subscription_id,
        TaskSubscription.user_id == user_id,
    ).first()

    if db_subscription is None:
        return None

    update_data = subscription.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_subscription, field, value)

    db.commit()
    db.refresh(db_subscription)
    return db_subscription


def delete_task_subscription(db: Session, subscription_id: int, user_id: int) -> bool:
    """删除任务订阅"""
    db_subscription = db.query(TaskSubscription).filter(
        TaskSubscription.id == subscription_id,
        TaskSubscription.user_id == user_id,
    ).first()

    if db_subscription is None:
        return False

    db.delete(db_subscription)
    db.commit()
    return True


def get_user_subscription_count(db: Session, user_id: int) -> int:
    """获取用户当前生效的订阅数量"""
    return db.query(TaskSubscription).filter(
        TaskSubscription.user_id == user_id,
        TaskSubscription.is_active == True,  # noqa: E712
    ).count()


def get_subscription_limit(user: User) -> int:
    """用户订阅额度；历史数据里的 NULL 按默认 10 处理。"""
    return user.max_subscriptions if user.max_subscriptions is not None else DEFAULT_MAX_SUBSCRIPTIONS


def is_user_subscribed_to_task(db: Session, user_id: int, task_id: int) -> bool:
    """检查用户是否已启用对指定任务的订阅"""
    subscription = db.query(TaskSubscription).filter(
        TaskSubscription.user_id == user_id,
        TaskSubscription.task_id == task_id,
        TaskSubscription.is_active == True,  # noqa: E712
    ).first()
    return subscription is not None


def _subscribed_task_ids(db: Session, user_id: int, task_ids: List[int]) -> set:
    """一次查出当前用户在这些任务上的启用订阅。"""
    if not task_ids:
        return set()
    rows = (
        db.query(TaskSubscription.task_id)
        .filter(
            TaskSubscription.user_id == user_id,
            TaskSubscription.task_id.in_(task_ids),
            TaskSubscription.is_active == True,  # noqa: E712
        )
        .all()
    )
    return {row[0] for row in rows}


def get_public_tasks(db: Session, current_user_id: Optional[int] = None, skip: int = 0, limit: int = 100) -> List[dict]:
    """获取公开任务列表（仅公开且启用的任务；订阅数只统计启用订阅）"""
    query = (
        db.query(
            MonitorTask,
            User.username.label("owner_username"),
            func.count(TaskSubscription.id).label("subscription_count"),
        )
        .join(User, MonitorTask.owner_id == User.id)
        .outerjoin(
            TaskSubscription,
            and_(
                MonitorTask.id == TaskSubscription.task_id,
                TaskSubscription.is_active == True,  # noqa: E712
            ),
        )
        .filter(MonitorTask.is_public == True, MonitorTask.is_active == True)  # noqa: E712
        .group_by(MonitorTask.id, User.username)
        .order_by(desc(MonitorTask.created_at), desc(MonitorTask.id))
        .offset(skip)
        .limit(limit)
    )

    rows = query.all()
    subscribed = _subscribed_task_ids(db, current_user_id, [task.id for task, _, _ in rows]) if current_user_id else set()

    return [
        {
            "id": task.id,
            "name": task.name,
            "url": task.url,
            "description": task.description,
            "interval": task.interval,
            "owner_username": owner_username,
            "created_at": task.created_at,
            "subscription_count": subscription_count or 0,
            "user_subscribed": task.id in subscribed,
        }
        for task, owner_username, subscription_count in rows
    ]


def get_task_with_subscription_info(db: Session, task_id: int, current_user_id: Optional[int] = None) -> Union[dict, None]:
    """获取公开任务详情；不存在、私人或停用一律返回 None。"""
    result = (
        db.query(
            MonitorTask,
            User.username.label("owner_username"),
            func.count(TaskSubscription.id).label("subscription_count"),
        )
        .join(User, MonitorTask.owner_id == User.id)
        .outerjoin(
            TaskSubscription,
            and_(
                MonitorTask.id == TaskSubscription.task_id,
                TaskSubscription.is_active == True,  # noqa: E712
            ),
        )
        .filter(
            MonitorTask.id == task_id,
            MonitorTask.is_public == True,  # noqa: E712
            MonitorTask.is_active == True,  # noqa: E712
        )
        .group_by(MonitorTask.id, User.username)
        .first()
    )

    if not result:
        return None

    task, owner_username, subscription_count = result

    return {
        "id": task.id,
        "name": task.name,
        "url": task.url,
        "description": task.description,
        "interval": task.interval,
        "owner_username": owner_username,
        "created_at": task.created_at,
        "subscription_count": subscription_count or 0,
        "user_subscribed": bool(current_user_id) and is_user_subscribed_to_task(db, current_user_id, task.id),
    }


def update_user_max_subscriptions(db: Session, user_id: int, max_subscriptions: int) -> bool:
    """更新用户最大订阅数量"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return False

    user.max_subscriptions = max_subscriptions
    db.commit()
    return True


def get_user_subscription_info(db: Session, user_id: int) -> dict:
    """获取用户订阅信息"""
    current_count = get_user_subscription_count(db, user_id)
    user = db.query(User).filter(User.id == user_id).first()
    limit = get_subscription_limit(user) if user else DEFAULT_MAX_SUBSCRIPTIONS

    return {
        "current_subscriptions": current_count,
        "max_subscriptions": limit,
        "remaining_slots": max(0, limit - current_count),
    }
