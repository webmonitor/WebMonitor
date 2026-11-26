"""现有 create_all 模型的 Alembic 基线。

Revision ID: 0001
Revises:
"""
import sqlalchemy as sa
from alembic import op

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("username", sa.String(length=50), nullable=False),
        sa.Column("email", sa.String(length=100), nullable=False),
        sa.Column("hashed_password", sa.String(length=255), nullable=False),
        sa.Column("full_name", sa.String(length=100), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=True),
        sa.Column("is_admin", sa.Boolean(), nullable=True),
        sa.Column("max_subscriptions", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
    )
    op.create_index("ix_users_id", "users", ["id"])
    op.create_index("ix_users_username", "users", ["username"], unique=True)
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "email_configs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("smtp_server", sa.String(length=200), nullable=False),
        sa.Column("smtp_port", sa.Integer(), nullable=True),
        sa.Column("smtp_user", sa.String(length=200), nullable=False),
        sa.Column("smtp_password", sa.String(length=200), nullable=False),
        sa.Column("receiver_email", sa.String(length=200), nullable=False),
        sa.Column("is_ssl", sa.Boolean(), nullable=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
    )
    op.create_index("ix_email_configs_id", "email_configs", ["id"])

    op.create_table(
        "monitor_tasks",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("url", sa.String(length=500), nullable=False),
        sa.Column("xpath", sa.String(length=500), nullable=False),
        sa.Column("interval", sa.Integer(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=True),
        sa.Column("is_public", sa.Boolean(), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("last_content", sa.Text(), nullable=True),
        sa.Column("last_check", sa.DateTime(), nullable=True),
        sa.Column("config_version", sa.Integer(), nullable=False),
        sa.Column("owner_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("email_config_id", sa.Integer(), sa.ForeignKey("email_configs.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
    )
    op.create_index("ix_monitor_tasks_id", "monitor_tasks", ["id"])

    op.create_table(
        "blacklist_domains",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("domain", sa.String(length=500), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=True),
        sa.Column("created_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
    )
    op.create_index("ix_blacklist_domains_id", "blacklist_domains", ["id"])
    op.create_index("ix_blacklist_domains_domain", "blacklist_domains", ["domain"], unique=True)

    op.create_table(
        "monitor_logs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("task_id", sa.Integer(), sa.ForeignKey("monitor_tasks.id"), nullable=False),
        sa.Column("old_content", sa.Text(), nullable=True),
        sa.Column("new_content", sa.Text(), nullable=True),
        sa.Column("is_changed", sa.Boolean(), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("check_time", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
    )
    op.create_index("ix_monitor_logs_id", "monitor_logs", ["id"])

    op.create_table(
        "notification_outbox",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("task_id", sa.Integer(), sa.ForeignKey("monitor_tasks.id"), nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("email_config_id", sa.Integer(), nullable=False),
        sa.Column("task_name", sa.String(length=200), nullable=False),
        sa.Column("url", sa.String(length=500), nullable=False),
        sa.Column("title", sa.String(length=500), nullable=False),
        sa.Column("old_content", sa.Text(), nullable=True),
        sa.Column("new_content", sa.Text(), nullable=False),
        sa.Column("check_time", sa.DateTime(), nullable=False),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.Column("attempts", sa.Integer(), nullable=False),
        sa.Column("next_attempt_at", sa.DateTime(), nullable=False),
        sa.Column("last_error", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("delivered_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_notification_outbox_id", "notification_outbox", ["id"])
    op.create_index("ix_notification_outbox_task_id", "notification_outbox", ["task_id"])
    op.create_index("ix_notification_outbox_user_id", "notification_outbox", ["user_id"])
    op.create_index("ix_notification_outbox_status", "notification_outbox", ["status"])
    op.create_index("ix_notification_outbox_next_attempt_at", "notification_outbox", ["next_attempt_at"])

    op.create_table(
        "task_subscriptions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("task_id", sa.Integer(), sa.ForeignKey("monitor_tasks.id"), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=True),
        sa.Column("email_config_id", sa.Integer(), sa.ForeignKey("email_configs.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.UniqueConstraint("user_id", "task_id", name="unique_user_task_subscription"),
    )
    op.create_index("ix_task_subscriptions_id", "task_subscriptions", ["id"])


def downgrade() -> None:
    op.drop_table("task_subscriptions")
    op.drop_table("notification_outbox")
    op.drop_table("monitor_logs")
    op.drop_table("blacklist_domains")
    op.drop_table("monitor_tasks")
    op.drop_table("email_configs")
    op.drop_table("users")
