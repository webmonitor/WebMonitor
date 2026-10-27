"""
业务 API 路由。

路由只做三件事：绑定依赖、调用服务、交给 response_model 序列化。
权限判定（归属、黑名单、额度、公开性）全在 `app/services/` 里。
所有执行同步 ORM / Selenium / SMTP 的处理函数都用 `def`，由 FastAPI 的
线程池执行，避免阻塞事件循环。
"""
from typing import List

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.crud import (
    count_email_config_references,
    count_monitor_logs,
    create_blacklist_domain,
    create_email_config,
    delete_blacklist_domain,
    delete_email_config,
    get_blacklist_domain,
    get_blacklist_domains,
    get_email_config,
    get_latest_monitor_logs,
    get_monitor_logs,
    get_monitor_task,
    get_public_tasks,
    get_task_with_subscription_info,
    get_user_email_configs,
    get_user_monitor_tasks,
    get_user_subscription_info,
    get_user_subscriptions,
    is_url_in_blacklist,
    update_blacklist_domain,
    update_email_config,
    update_user_max_subscriptions,
    validate_email_config_ownership,
)
from app.db.database import get_db
from app.db.models import BlacklistDomain, EmailConfig, MonitorLog, MonitorTask, TaskSubscription, User
from app.schemas.schemas import (
    BlacklistDomainCreate,
    BlacklistDomainResponse,
    BlacklistDomainUpdate,
    EmailConfigCreate,
    EmailConfigResponse,
    EmailConfigSimpleResponse,
    EmailConfigUpdate,
    MonitorLogPage,
    MonitorLogResponse,
    MonitorTaskCreate,
    MonitorTaskResponse,
    MonitorTaskUpdate,
    PublicTaskResponse,
    SubscriptionEmailRequest,
    TaskSubscriptionCreate,
    TaskSubscriptionResponse,
    TaskSubscriptionUpdate,
    UserSubscriptionLimitResponse,
)
from app.services import subscription_service, task_service
from app.services.auth_service import get_current_active_user, get_current_admin_user
from app.services.email_service import EmailService
from app.services.errors import ServiceError

router = APIRouter()


# ---------------------------------------------------------------------------
# 监控任务
# ---------------------------------------------------------------------------
@router.post("/monitor-tasks", response_model=MonitorTaskResponse)
def create_task(
    task: MonitorTaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> MonitorTask:
    """创建监控任务"""
    return task_service.create_task(db, task, current_user)


@router.get("/monitor-tasks", response_model=List[MonitorTaskResponse])
def read_tasks(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> List[MonitorTask]:
    """获取当前用户的监控任务列表"""
    return get_user_monitor_tasks(db=db, user_id=current_user.id, skip=skip, limit=limit)


@router.get("/monitor-tasks/{task_id}", response_model=MonitorTaskResponse)
def read_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> MonitorTask:
    """获取单个监控任务"""
    return task_service.require_owned_task(db, task_id, current_user.id)


@router.put("/monitor-tasks/{task_id}", response_model=MonitorTaskResponse)
def update_task(
    task_id: int,
    task: MonitorTaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> MonitorTask:
    """更新监控任务"""
    return task_service.update_task(db, task_id, task, current_user)


@router.delete("/monitor-tasks/{task_id}")
def delete_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> dict:
    """删除监控任务"""
    task_service.delete_task(db, task_id, current_user)
    return {"message": "监控任务删除成功"}


@router.get("/monitor-tasks/{task_id}/logs", response_model=MonitorLogPage)
def read_task_logs(
    task_id: int,
    page: int = Query(1, ge=1),
    limit: int = Query(100, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> MonitorLogPage:
    """分页获取监控任务日志"""
    task_service.require_owned_task(db, task_id, current_user.id)

    logs = get_monitor_logs(db=db, task_id=task_id, skip=(page - 1) * limit, limit=limit)
    total = count_monitor_logs(db=db, task_id=task_id)

    return MonitorLogPage(
        logs=[MonitorLogResponse.model_validate(log) for log in logs],
        total=total,
    )


@router.get("/monitor-logs/latest", response_model=List[MonitorLogResponse])
def read_latest_logs(
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> List[MonitorLog]:
    """获取本人任务的最新日志"""
    return get_latest_monitor_logs(db=db, user_id=current_user.id, limit=limit)


@router.post("/monitor-tasks/{task_id}/test")
def test_monitor_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> dict:
    """测试监控任务（只抓取，不写库）"""
    return task_service.test_task(db, task_id, current_user)


# ---------------------------------------------------------------------------
# 邮件配置
# ---------------------------------------------------------------------------
def _require_owned_config(db: Session, config_id: int, user_id: int) -> EmailConfig:
    config = get_email_config(db=db, config_id=config_id)
    if config is None:
        raise ServiceError(404, "邮件配置不存在")
    if config.user_id != user_id:
        raise ServiceError(403, "无权访问此邮件配置")
    return config


@router.post("/email-configs", response_model=EmailConfigResponse)
def create_email_config_route(
    config: EmailConfigCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> EmailConfig:
    """创建邮件配置"""
    return create_email_config(db=db, config=config, user_id=current_user.id)


@router.get("/email-configs", response_model=List[EmailConfigResponse])
def read_email_configs(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> List[EmailConfig]:
    """获取当前用户的邮件配置列表"""
    return get_user_email_configs(db=db, user_id=current_user.id, skip=skip, limit=limit)


@router.get("/email-configs/simple-list", response_model=List[EmailConfigSimpleResponse])
def get_simple_email_config_list(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> List[EmailConfigSimpleResponse]:
    """获取当前用户的邮件配置简单列表（用于任务选择）"""
    configs = get_user_email_configs(db=db, user_id=current_user.id, skip=skip, limit=limit)
    return [
        EmailConfigSimpleResponse(
            id=config.id,
            name=config.name,
            smtp_user=config.smtp_user,
            receiver_email=config.receiver_email,
        )
        for config in configs
    ]


@router.get("/email-configs/{config_id}", response_model=EmailConfigResponse)
def read_email_config(
    config_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> EmailConfig:
    """获取单个邮件配置"""
    return _require_owned_config(db, config_id, current_user.id)


@router.put("/email-configs/{config_id}", response_model=EmailConfigResponse)
def update_email_config_route(
    config_id: int,
    config: EmailConfigUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> EmailConfig:
    """更新邮件配置；省略 smtp_password 表示保留原密码。"""
    _require_owned_config(db, config_id, current_user.id)

    updated = update_email_config(db=db, config_id=config_id, config=config)
    if updated is None:
        raise ServiceError(404, "邮件配置不存在")
    return updated


@router.delete("/email-configs/{config_id}")
def delete_email_config_route(
    config_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> dict:
    """删除邮件配置；仍被任务或订阅引用时拒绝。"""
    _require_owned_config(db, config_id, current_user.id)

    if count_email_config_references(db, config_id) > 0:
        raise ServiceError(409, "邮件配置仍被任务或订阅引用，请先更换配置")

    if not delete_email_config(db=db, config_id=config_id):
        raise ServiceError(404, "邮件配置不存在")
    return {"message": "邮件配置删除成功"}


@router.post("/email-configs/{config_id}/test")
def test_email_config(
    config_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> dict:
    """测试邮件配置：连接失败立即返回；成功则恰好发送一封测试邮件。"""
    config = _require_owned_config(db, config_id, current_user.id)

    email_service = EmailService()

    connection_result = email_service.test_email_connection_with_config(config)
    if not connection_result.get("success"):
        return {"success": False, "error": "邮件连接测试失败"}

    if not email_service.send_test_email(config):
        return {"success": False, "error": "测试邮件发送失败"}

    return {"success": True, "message": "测试邮件发送成功"}


# ---------------------------------------------------------------------------
# 黑名单（仅管理员）
# ---------------------------------------------------------------------------
@router.post("/blacklist-domains", response_model=BlacklistDomainResponse)
def create_blacklist_domain_route(
    domain: BlacklistDomainCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
) -> BlacklistDomain:
    """创建黑名单域名（仅管理员）"""
    return create_blacklist_domain(db=db, domain=domain, created_by=current_user.id)


@router.get("/blacklist-domains", response_model=List[BlacklistDomainResponse])
def read_blacklist_domains(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
) -> List[BlacklistDomain]:
    """获取黑名单域名列表（仅管理员）"""
    return get_blacklist_domains(db=db, skip=skip, limit=limit)


@router.get("/blacklist-domains/{domain_id}", response_model=BlacklistDomainResponse)
def read_blacklist_domain(
    domain_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
) -> BlacklistDomain:
    """获取单个黑名单域名（仅管理员）"""
    domain = get_blacklist_domain(db=db, domain_id=domain_id)
    if domain is None:
        raise ServiceError(404, "黑名单域名不存在")
    return domain


@router.put("/blacklist-domains/{domain_id}", response_model=BlacklistDomainResponse)
def update_blacklist_domain_route(
    domain_id: int,
    domain: BlacklistDomainUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
) -> BlacklistDomain:
    """更新黑名单域名（仅管理员）"""
    updated = update_blacklist_domain(db=db, domain_id=domain_id, domain=domain)
    if updated is None:
        raise ServiceError(404, "黑名单域名不存在")
    return updated


@router.delete("/blacklist-domains/{domain_id}")
def delete_blacklist_domain_route(
    domain_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
) -> dict:
    """删除黑名单域名（仅管理员）"""
    if not delete_blacklist_domain(db=db, domain_id=domain_id):
        raise ServiceError(404, "黑名单域名不存在")
    return {"message": "黑名单域名删除成功"}


@router.post("/blacklist-domains/test")
def test_blacklist_matching(
    url: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
) -> dict:
    """测试黑名单匹配功能（仅管理员）"""
    is_blacklisted = is_url_in_blacklist(db=db, url=url)
    return {
        "url": url,
        "is_blacklisted": is_blacklisted,
        "message": "该URL在黑名单中" if is_blacklisted else "该URL不在黑名单中",
    }


# ---------------------------------------------------------------------------
# 公开任务
# ---------------------------------------------------------------------------
@router.get("/public-tasks", response_model=List[PublicTaskResponse])
def read_public_tasks(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> List[dict]:
    """获取公开任务列表"""
    return get_public_tasks(db=db, current_user_id=current_user.id, skip=skip, limit=limit)


@router.get("/public-tasks/{task_id}", response_model=PublicTaskResponse)
def read_public_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> dict:
    """获取公开任务详情；不存在/私人/停用一律 404。"""
    task_info = get_task_with_subscription_info(db=db, task_id=task_id, current_user_id=current_user.id)
    if not task_info:
        raise ServiceError(404, "公开任务不存在")
    return task_info


# ---------------------------------------------------------------------------
# 任务订阅
# ---------------------------------------------------------------------------
@router.post("/subscribe/{task_id}", response_model=TaskSubscriptionResponse)
def subscribe_to_task(
    task_id: int,
    subscription: TaskSubscriptionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> TaskSubscriptionResponse:
    """订阅任务"""
    if subscription.task_id != task_id:
        raise ServiceError(422, "路径与请求体中的任务ID不一致")

    created = subscription_service.subscribe(
        db,
        task_id,
        current_user,
        subscription.email_config_id,
        is_active=subscription.is_active,
    )
    return subscription_service.serialize_subscription(created)


@router.get("/subscriptions", response_model=List[TaskSubscriptionResponse])
def read_subscriptions(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> List[TaskSubscriptionResponse]:
    """获取当前用户的订阅列表"""
    subscriptions = get_user_subscriptions(db=db, user_id=current_user.id, skip=skip, limit=limit)
    return [subscription_service.serialize_subscription(item) for item in subscriptions]


@router.put("/subscriptions/{subscription_id}", response_model=TaskSubscriptionResponse)
def update_subscription(
    subscription_id: int,
    subscription: TaskSubscriptionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> TaskSubscriptionResponse:
    """更新订阅"""
    updated = subscription_service.update_subscription(db, subscription_id, subscription, current_user)
    return subscription_service.serialize_subscription(updated)


@router.delete("/subscriptions/{subscription_id}")
def delete_subscription(
    subscription_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> dict:
    """取消订阅"""
    subscription_service.delete_subscription(db, subscription_id, current_user)
    return {"message": "订阅取消成功"}


@router.get("/subscription-info", response_model=UserSubscriptionLimitResponse)
def get_subscription_limit_info(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> dict:
    """获取用户订阅限制信息"""
    return get_user_subscription_info(db=db, user_id=current_user.id)


@router.post("/subscriptions/{task_id}/toggle")
def toggle_subscription(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> dict:
    """切换任务订阅状态（一键订阅/取消订阅）"""
    return subscription_service.toggle(db, task_id, current_user)


@router.post("/subscriptions/{task_id}/subscribe-with-email")
def subscribe_with_email_config(
    task_id: int,
    subscription_data: SubscriptionEmailRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> dict:
    """订阅任务并指定邮件配置"""
    return subscription_service.subscribe_with_email(
        db, task_id, current_user, subscription_data.email_config_id
    )


# ---------------------------------------------------------------------------
# 管理员：用户订阅额度
# ---------------------------------------------------------------------------
@router.put("/users/{user_id}/max-subscriptions")
def update_user_subscription_limit(
    user_id: int,
    max_subscriptions: int = Query(..., ge=1),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
) -> dict:
    """更新用户最大订阅数量（仅管理员）"""
    if not update_user_max_subscriptions(db=db, user_id=user_id, max_subscriptions=max_subscriptions):
        raise ServiceError(404, "用户不存在")
    return {"message": f"用户最大订阅数量已更新为{max_subscriptions}"}
