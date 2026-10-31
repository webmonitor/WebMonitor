from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator

from ..core.passwords import validate_password


class UserBase(BaseModel):
    """用户基础模型"""

    username: str = Field(..., description="用户名", min_length=3, max_length=50)
    email: EmailStr = Field(..., description="邮箱")
    full_name: Optional[str] = Field(None, description="全名", max_length=100)
    is_active: bool = Field(default=True, description="是否激活")


class UserRegister(BaseModel):
    """公开注册：只接受自助注册允许的字段，角色与额度不可由客户端指定。"""

    model_config = ConfigDict(extra="forbid")

    username: str = Field(..., description="用户名", min_length=3, max_length=50)
    email: EmailStr = Field(..., description="邮箱")
    full_name: Optional[str] = Field(None, description="全名", max_length=100)
    password: str = Field(..., description="密码", min_length=6)

    @field_validator("password")
    @classmethod
    def _check_password(cls, value: str) -> str:
        return validate_password(value)


class UserCreate(UserBase):
    """创建用户（仅管理员可用）"""

    password: str = Field(..., description="密码", min_length=6)
    is_admin: bool = Field(default=False, description="是否管理员")
    max_subscriptions: int = Field(default=10, description="最大订阅任务数量", ge=1)

    @field_validator("password")
    @classmethod
    def _check_password(cls, value: str) -> str:
        return validate_password(value)


class UserUpdate(BaseModel):
    """更新用户"""

    username: Optional[str] = Field(None, description="用户名", min_length=3, max_length=50)
    email: Optional[EmailStr] = Field(None, description="邮箱")
    full_name: Optional[str] = Field(None, description="全名", max_length=100)
    is_active: Optional[bool] = Field(None, description="是否激活")
    password: Optional[str] = Field(None, description="密码；省略或空字符串表示保留原密码")
    is_admin: Optional[bool] = None
    max_subscriptions: Optional[int] = Field(None, description="最大订阅任务数量", ge=1)

    @field_validator("password")
    @classmethod
    def _check_password(cls, value: Optional[str]) -> Optional[str]:
        if value is None or value == "":
            return value
        return validate_password(value)


class UserResponse(BaseModel):
    """用户响应（永不包含密码字段）"""

    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    email: EmailStr
    full_name: Optional[str] = None
    is_active: bool
    is_admin: bool
    max_subscriptions: int = 10
    created_at: datetime
    updated_at: datetime

    @field_validator("max_subscriptions", mode="before")
    @classmethod
    def _default_max_subscriptions(cls, value):
        # 历史行的 max_subscriptions 可能是 NULL
        return 10 if value is None else value


class LoginResponse(BaseModel):
    """登录响应模型"""

    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class MonitorTaskBase(BaseModel):
    """监控任务基础模型"""

    name: str = Field(..., description="任务名称", min_length=1, max_length=200)
    url: str = Field(..., description="监控URL", min_length=1, max_length=500)
    xpath: str = Field(..., description="XPath选择器", min_length=1, max_length=500)
    interval: int = Field(default=300, description="检查间隔（秒）", ge=10)
    is_active: bool = Field(default=True, description="是否启用")
    is_public: bool = Field(default=False, description="是否公开")
    description: Optional[str] = Field(None, description="任务描述", max_length=1000)


class MonitorTaskCreate(MonitorTaskBase):
    """创建监控任务。

    邮件配置可选：不选就不发通知，任务照常采集与记录。
    """

    email_config_id: Optional[int] = Field(None, description="通知邮件配置ID（可选）")


class MonitorTaskUpdate(BaseModel):
    """更新监控任务。

    description 与 email_config_id 允许显式 null；其余字段是数据库非空列，
    显式 null 会得到 422 而不是把任务写坏。
    """

    name: Optional[str] = Field(None, description="任务名称", min_length=1, max_length=200)
    url: Optional[str] = Field(None, description="监控URL", min_length=1, max_length=500)
    xpath: Optional[str] = Field(None, description="XPath选择器", min_length=1, max_length=500)
    interval: Optional[int] = Field(None, description="检查间隔（秒）", ge=10)
    is_active: Optional[bool] = Field(None, description="是否启用")
    is_public: Optional[bool] = Field(None, description="是否公开")
    description: Optional[str] = Field(None, description="任务描述", max_length=1000)
    email_config_id: Optional[int] = Field(None, description="邮件配置ID")

    @model_validator(mode="after")
    def _reject_null_for_required_columns(self):
        nullable_ok = {"description", "email_config_id"}
        for field in self.model_fields_set - nullable_ok:
            if getattr(self, field) is None:
                raise ValueError(f"{field} 不能为 null")
        return self


class MonitorTaskResponse(MonitorTaskBase):
    """监控任务响应"""

    model_config = ConfigDict(from_attributes=True)

    id: int
    last_content: Optional[str] = None
    last_check: Optional[datetime] = None
    owner_id: int
    email_config_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    owner_username: Optional[str] = None
    subscription_count: Optional[int] = 0
    user_subscribed: Optional[bool] = False


class MonitorLogBase(BaseModel):
    """监控日志基础模型"""

    old_content: Optional[str] = None
    new_content: Optional[str] = None
    is_changed: bool = False
    error_message: Optional[str] = None


class MonitorLogResponse(MonitorLogBase):
    """监控日志响应"""

    model_config = ConfigDict(from_attributes=True)

    id: int
    task_id: int
    check_time: datetime


class MonitorLogPage(BaseModel):
    """监控日志分页响应"""

    logs: List[MonitorLogResponse]
    total: int


class EmailConfigBase(BaseModel):
    """邮件配置基础模型（不含任何密码字段）"""

    name: str = Field(..., description="配置名称", min_length=1, max_length=100)
    smtp_server: str = Field(..., description="SMTP服务器地址", min_length=1, max_length=200)
    smtp_port: int = Field(default=465, description="SMTP端口", ge=1, le=65535)
    smtp_user: str = Field(..., description="发送者邮箱", min_length=1, max_length=200)
    receiver_email: str = Field(..., description="接收者邮箱", min_length=1, max_length=200)
    is_ssl: bool = Field(default=True, description="是否使用SSL")


class EmailConfigCreate(EmailConfigBase):
    """创建邮件配置"""

    smtp_password: str = Field(..., description="SMTP密码", min_length=1, max_length=200)


class EmailConfigUpdate(BaseModel):
    """更新邮件配置。

    密码省略表示保留原值；显式空字符串或 null 是错误，避免"空密码被当成
    新密码写进数据库"这类静默故障。
    """

    name: Optional[str] = Field(None, description="配置名称", min_length=1, max_length=100)
    smtp_server: Optional[str] = Field(None, description="SMTP服务器地址", min_length=1, max_length=200)
    smtp_port: Optional[int] = Field(None, description="SMTP端口", ge=1, le=65535)
    smtp_user: Optional[str] = Field(None, description="发送者邮箱", min_length=1, max_length=200)
    smtp_password: Optional[str] = Field(None, description="SMTP密码；省略表示保留原密码", max_length=200)
    receiver_email: Optional[str] = Field(None, description="接收者邮箱", min_length=1, max_length=200)
    is_ssl: Optional[bool] = Field(None, description="是否使用SSL")

    @model_validator(mode="after")
    def _check_explicit_nulls(self):
        nullable_ok = {"smtp_password"}
        for field in self.model_fields_set - nullable_ok:
            if getattr(self, field) is None:
                raise ValueError(f"{field} 不能为 null")

        if "smtp_password" in self.model_fields_set:
            password = self.smtp_password
            if password is None or password == "":
                raise ValueError("smtp_password 不能为空；留空请省略该字段以保留原密码")
            if not 1 <= len(password) <= 200:
                raise ValueError("smtp_password 长度必须在 1 到 200 之间")
        return self


class EmailConfigSimpleResponse(BaseModel):
    """邮件配置简单响应（用于选择器）"""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    smtp_user: str
    receiver_email: str


class EmailConfigResponse(EmailConfigBase):
    """邮件配置响应（永不含 SMTP 密码）"""

    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime


class BlacklistDomainBase(BaseModel):
    """黑名单域名基础模型"""

    domain: str = Field(..., description="黑名单域名", min_length=1, max_length=500)
    description: Optional[str] = Field(None, description="描述")
    is_active: bool = Field(default=True, description="是否启用")


class BlacklistDomainCreate(BlacklistDomainBase):
    """创建黑名单域名"""


class BlacklistDomainUpdate(BaseModel):
    """更新黑名单域名"""

    domain: Optional[str] = Field(None, description="黑名单域名", min_length=1, max_length=500)
    description: Optional[str] = Field(None, description="描述")
    is_active: Optional[bool] = Field(None, description="是否启用")


class BlacklistDomainResponse(BlacklistDomainBase):
    """黑名单域名响应"""

    model_config = ConfigDict(from_attributes=True)

    id: int
    created_by: int
    created_at: datetime
    updated_at: datetime


class TaskSubscriptionBase(BaseModel):
    """任务订阅基础模型"""

    task_id: int = Field(..., description="订阅任务ID")
    is_active: bool = Field(default=True, description="是否启用订阅")
    email_config_id: Optional[int] = Field(None, description="通知邮件配置ID")


class TaskSubscriptionCreate(TaskSubscriptionBase):
    """创建任务订阅"""


class TaskSubscriptionUpdate(BaseModel):
    """更新任务订阅"""

    is_active: Optional[bool] = Field(None, description="是否启用订阅")
    email_config_id: Optional[int] = Field(None, description="通知邮件配置ID")

    @model_validator(mode="after")
    def _reject_null_is_active(self):
        if "is_active" in self.model_fields_set and self.is_active is None:
            raise ValueError("is_active 不能为 null")
        return self


class SubscriptionEmailRequest(BaseModel):
    """按指定邮件配置订阅"""

    email_config_id: int = Field(..., description="邮件配置ID", gt=0)


class TaskSubscriptionResponse(TaskSubscriptionBase):
    """任务订阅响应"""

    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime
    task_name: Optional[str] = None
    task_url: Optional[str] = None
    task_owner: Optional[str] = None
    task_available: bool = True


class PublicTaskResponse(BaseModel):
    """公开任务响应（用于公开任务列表与详情）"""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    url: str
    description: Optional[str] = None
    interval: int
    owner_username: Optional[str] = None
    created_at: datetime
    subscription_count: Optional[int] = 0
    user_subscribed: Optional[bool] = False


class UserSubscriptionLimitResponse(BaseModel):
    """用户订阅限制响应"""

    model_config = ConfigDict(from_attributes=True)

    current_subscriptions: int
    max_subscriptions: int
    remaining_slots: int
