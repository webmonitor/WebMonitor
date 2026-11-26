"""为任务日志时间线及保留清理增加稳定游标索引。

Revision ID: 0002
Revises: 0001
"""
import sqlalchemy as sa
from alembic import op

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None

INDEX_NAME = "ix_monitor_logs_task_check_id"


def upgrade() -> None:
    # 兼容在过渡期间已由新版 metadata.create_all 建过该索引的数据库。
    indexes = {index["name"] for index in sa.inspect(op.get_bind()).get_indexes("monitor_logs")}
    if INDEX_NAME not in indexes:
        op.create_index(INDEX_NAME, "monitor_logs", ["task_id", "check_time", "id"])


def downgrade() -> None:
    indexes = {index["name"] for index in sa.inspect(op.get_bind()).get_indexes("monitor_logs")}
    if INDEX_NAME in indexes:
        op.drop_index(INDEX_NAME, table_name="monitor_logs")
