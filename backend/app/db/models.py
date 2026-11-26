from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey, Index, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base

class User(Base):
    """用户模型"""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False, comment="用户名")
    email = Column(String(100), unique=True, index=True, nullable=False, comment="邮箱")
    hashed_password = Column(String(255), nullable=False, comment="加密密码")
    full_name = Column(String(100), comment="全名")
    is_active = Column(Boolean, default=True, comment="是否激活")
    is_admin = Column(Boolean, default=False, comment="是否管理员")
    max_subscriptions = Column(Integer, default=10, comment="最大订阅任务数量")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), comment="创建时间")
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), comment="更新时间")

    # 关联监控任务
    tasks = relationship("MonitorTask", back_populates="owner", cascade="all, delete-orphan")
    # 关联订阅记录
    subscriptions = relationship("TaskSubscription", back_populates="user", cascade="all, delete-orphan")
    # 删除用户时，同事务清除明文 SMTP 配置和该用户的投递记录
    email_configs = relationship("EmailConfig", back_populates="user", cascade="all, delete-orphan")
    outbox_deliveries = relationship("NotificationOutbox", back_populates="user", cascade="all, delete-orphan")
    blacklist_domains = relationship("BlacklistDomain", back_populates="creator", cascade="all, delete-orphan")


class MonitorTask(Base):
    """监控任务模型"""
    __tablename__ = "monitor_tasks"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False, comment="任务名称")
    url = Column(String(500), nullable=False, comment="监控URL")
    xpath = Column(String(500), nullable=False, comment="XPath选择器")
    interval = Column(Integer, default=300, comment="检查间隔（秒）")
    is_active = Column(Boolean, default=True, comment="是否启用")
    is_public = Column(Boolean, default=False, comment="是否公开")
    description = Column(Text, comment="任务描述")
    last_content = Column(Text, comment="上次内容")
    last_check = Column(DateTime, comment="上次检查时间")
    config_version = Column(Integer, nullable=False, default=1, comment="采集配置版本")
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False, comment="所有者ID")
    email_config_id = Column(Integer, ForeignKey("email_configs.id"), nullable=True, comment="邮件配置ID")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), comment="创建时间")
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), comment="更新时间")

    # 关联监控日志
    logs = relationship("MonitorLog", back_populates="task", cascade="all, delete-orphan")
    # 关联用户
    owner = relationship("User", back_populates="tasks")
    # 关联邮件配置
    email_config = relationship("EmailConfig")
    # 关联订阅记录
    subscriptions = relationship("TaskSubscription", back_populates="task", cascade="all, delete-orphan")
    outbox_deliveries = relationship("NotificationOutbox", back_populates="task", cascade="all, delete-orphan")


class MonitorLog(Base):
    """监控日志模型"""
    __tablename__ = "monitor_logs"
    __table_args__ = (
        Index("ix_monitor_logs_task_check_id", "task_id", "check_time", "id"),
    )

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("monitor_tasks.id"), nullable=False, comment="任务ID")
    old_content = Column(Text, comment="旧内容")
    new_content = Column(Text, comment="新内容")
    is_changed = Column(Boolean, default=False, comment="内容是否变化")
    error_message = Column(Text, comment="错误信息")
    check_time = Column(DateTime(timezone=True), server_default=func.now(), comment="检查时间")

    # 关联监控任务
    task = relationship("MonitorTask", back_populates="logs")


class NotificationOutbox(Base):
    """与采集结果同事务提交的邮件投递记录。"""

    __tablename__ = "notification_outbox"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("monitor_tasks.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    # 历史投递引用，不作为外键级联；待投递记录会阻止删除对应配置。
    email_config_id = Column(Integer, nullable=False, comment="投递时冻结的邮件配置ID")
    task_name = Column(String(200), nullable=False)
    url = Column(String(500), nullable=False)
    title = Column(String(500), nullable=False)
    old_content = Column(Text)
    new_content = Column(Text, nullable=False)
    check_time = Column(DateTime, nullable=False)
    status = Column(String(16), nullable=False, default="pending", index=True)
    attempts = Column(Integer, nullable=False, default=0)
    next_attempt_at = Column(DateTime, nullable=False, index=True)
    last_error = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    delivered_at = Column(DateTime)

    task = relationship("MonitorTask", back_populates="outbox_deliveries")
    user = relationship("User", back_populates="outbox_deliveries")


class EmailConfig(Base):
    """邮件配置模型"""
    __tablename__ = "email_configs"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, comment="配置名称")
    smtp_server = Column(String(200), nullable=False, comment="SMTP服务器地址")
    smtp_port = Column(Integer, default=465, comment="SMTP端口")
    smtp_user = Column(String(200), nullable=False, comment="发送者邮箱")
    smtp_password = Column(String(200), nullable=False, comment="SMTP密码")
    receiver_email = Column(String(200), nullable=False, comment="接收者邮箱")
    is_ssl = Column(Boolean, default=True, comment="是否使用SSL")
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, comment="用户ID")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), comment="创建时间")
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), comment="更新时间")

    # 关联用户
    user = relationship("User", back_populates="email_configs")


class BlacklistDomain(Base):
    """黑名单域名模型"""
    __tablename__ = "blacklist_domains"

    id = Column(Integer, primary_key=True, index=True)
    domain = Column(String(500), nullable=False, unique=True, index=True, comment="黑名单域名")
    description = Column(Text, comment="描述")
    is_active = Column(Boolean, default=True, comment="是否启用")
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False, comment="创建者ID")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), comment="创建时间")
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), comment="更新时间")

    # 关联创建者；ORM 删除用户时同步清理，满足启用的 SQLite 外键。
    creator = relationship("User", back_populates="blacklist_domains")


class TaskSubscription(Base):
    """任务订阅模型"""
    __tablename__ = "task_subscriptions"

    __table_args__ = (UniqueConstraint('user_id', 'task_id', name='unique_user_task_subscription'),)

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, comment="订阅用户ID")
    task_id = Column(Integer, ForeignKey("monitor_tasks.id"), nullable=False, comment="订阅任务ID")
    is_active = Column(Boolean, default=True, comment="是否启用订阅")
    email_config_id = Column(Integer, ForeignKey("email_configs.id"), nullable=True, comment="通知邮件配置ID")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), comment="订阅时间")
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), comment="更新时间")

    # 关联用户
    user = relationship("User", back_populates="subscriptions")
    # 关联任务
    task = relationship("MonitorTask", back_populates="subscriptions")
    # 关联邮件配置
    email_config = relationship("EmailConfig")