"""
监控任务业务服务：归属校验、黑名单、邮件配置归属、提交后调度同步。

路由只做依赖绑定与序列化；所有判定都在这里，私人端点共用同一套规则。
"""
import logging

from sqlalchemy.orm import Session

from ..db.crud import (
    create_monitor_task,
    delete_monitor_task,
    get_monitor_task,
    is_url_allowed_for_user,
    update_monitor_task,
    validate_email_config_ownership,
)
from ..db.models import MonitorTask, User
from ..schemas.schemas import MonitorTaskCreate, MonitorTaskUpdate
from .errors import ServiceError
from .monitor_service import MonitorService
from .scheduler import monitor_scheduler

logger = logging.getLogger(__name__)

BLACKLIST_DETAIL = "该域名在黑名单中，普通用户无法监控此网站"
EMAIL_CONFIG_DETAIL = "邮箱配置不存在或不属于当前用户"


def require_owned_task(db: Session, task_id: int, user_id: int) -> MonitorTask:
    """取任务并校验归属。

    管理员也不能通过私人端点读取他人任务：这些端点按 owner 隔离。
    """
    task = get_monitor_task(db, task_id)
    if task is None:
        raise ServiceError(404, "监控任务不存在")
    if task.owner_id != user_id:
        raise ServiceError(403, "无权访问此任务")
    return task


def _require_url_allowed(db: Session, url: str, user: User) -> None:
    if not is_url_allowed_for_user(db=db, url=url, is_admin=user.is_admin):
        raise ServiceError(403, BLACKLIST_DETAIL)


def _require_owned_email_config(db: Session, email_config_id: int, user: User) -> None:
    if not validate_email_config_ownership(db, email_config_id, user.id):
        raise ServiceError(400, EMAIL_CONFIG_DETAIL)


def create_task(db: Session, data: MonitorTaskCreate, user: User) -> MonitorTask:
    """创建任务；成功后同步调度作业。"""
    _require_url_allowed(db, data.url, user)
    _require_owned_email_config(db, data.email_config_id, user)

    task = create_monitor_task(db=db, task=data, owner_id=user.id)
    monitor_scheduler.sync_tasks()
    return task


def update_task(db: Session, task_id: int, data: MonitorTaskUpdate, user: User) -> MonitorTask:
    """更新任务；成功后同步调度作业。"""
    existing = require_owned_task(db, task_id, user.id)

    if data.url is not None and data.url != existing.url:
        _require_url_allowed(db, data.url, user)

    if data.email_config_id is not None:
        _require_owned_email_config(db, data.email_config_id, user)

    task = update_monitor_task(db=db, task_id=task_id, task=data)
    if task is None:
        raise ServiceError(404, "监控任务不存在")

    monitor_scheduler.sync_tasks()
    return task


def delete_task(db: Session, task_id: int, user: User) -> None:
    """删除任务；成功后同步调度作业。"""
    require_owned_task(db, task_id, user.id)

    if not delete_monitor_task(db=db, task_id=task_id):
        raise ServiceError(404, "监控任务不存在")

    monitor_scheduler.sync_tasks()


def test_task(db: Session, task_id: int, user: User) -> dict:
    """测试任务采集：先授权，再抓取；不写 baseline、last_check 或日志。"""
    require_owned_task(db, task_id, user.id)

    result = MonitorService().test_task(task_id)
    if not result.get("success"):
        logger.warning("任务 %s 采集测试失败: %s", task_id, result.get("error"))
        raise ServiceError(502, "目标页面采集失败")

    return {
        "message": "监控任务测试完成",
        "status": "success",
        "content": result.get("content"),
        "title": result.get("title"),
        "url": result.get("url"),
    }
