"""空库、旧 create_all 库的 Alembic 升级路径与 SQLite 外键回归。"""
import os
import sys
import unittest
from unittest import mock

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import support  # noqa: E402

support.bootstrap_environment()

from sqlalchemy import inspect, text  # noqa: E402
from sqlalchemy.exc import IntegrityError  # noqa: E402

from app.db.database import create_database_engine  # noqa: E402
from app.db.models import Base  # noqa: E402
from app.services import bootstrap as bootstrap_module  # noqa: E402


class MigrationTestCase(unittest.TestCase):
    def setUp(self):
        state = support.bootstrap_environment()
        self.tmpdir = support.tempfile.mkdtemp(prefix="migration-", dir=state["tmpdir"])
        self.database_path = os.path.join(self.tmpdir, "webmonitor.db")
        self.engine = create_database_engine(f"sqlite:///{self.database_path}", debug=False)

    def tearDown(self):
        self.engine.dispose()
        support.shutil.rmtree(self.tmpdir, ignore_errors=True)

    def upgrade(self):
        with mock.patch.object(bootstrap_module, "engine", self.engine):
            bootstrap_module.upgrade_database()

    def assert_head_and_log_index(self):
        inspector = inspect(self.engine)
        with self.engine.connect() as connection:
            version = connection.execute(text("SELECT version_num FROM alembic_version")).scalar_one()
        self.assertEqual(version, "0002")
        indexes = {index["name"]: index for index in inspector.get_indexes("monitor_logs")}
        self.assertEqual(
            indexes["ix_monitor_logs_task_check_id"]["column_names"],
            ["task_id", "check_time", "id"],
        )

    def test_empty_database_upgrades_to_complete_current_schema(self):
        self.upgrade()
        table_names = set(inspect(self.engine).get_table_names())
        self.assertTrue(set(Base.metadata.tables).issubset(table_names))
        self.assert_head_and_log_index()

        # 重复启动只执行 upgrade head，不重建或清空任何表。
        self.upgrade()
        self.assert_head_and_log_index()

    def test_legacy_create_all_database_is_stamped_then_upgraded_without_data_loss(self):
        Base.metadata.create_all(bind=self.engine)
        with self.engine.begin() as connection:
            # 模拟旧版本：已有全部业务表，但尚无 Alembic 版本表和此次复合索引。
            connection.execute(text("DROP INDEX ix_monitor_logs_task_check_id"))
            user_id = connection.execute(
                text(
                    "INSERT INTO users (username, email, hashed_password) "
                    "VALUES ('legacy-admin', 'legacy@example.com', 'legacy-hash')"
                )
            ).lastrowid
            task_id = connection.execute(
                text(
                    "INSERT INTO monitor_tasks (name, url, xpath, config_version, owner_id) "
                    "VALUES ('legacy-task', 'https://example.com', '//main', 1, :owner_id)"
                ),
                {"owner_id": user_id},
            ).lastrowid
            connection.execute(
                text("INSERT INTO monitor_logs (task_id, old_content, new_content) VALUES (:task_id, 'old', 'new')"),
                {"task_id": task_id},
            )

        self.upgrade()

        self.assert_head_and_log_index()
        with self.engine.connect() as connection:
            self.assertEqual(
                connection.execute(text("SELECT username FROM users WHERE id = :id"), {"id": user_id}).scalar_one(),
                "legacy-admin",
            )
            self.assertEqual(
                connection.execute(text("SELECT name FROM monitor_tasks WHERE id = :id"), {"id": task_id}).scalar_one(),
                "legacy-task",
            )
            self.assertEqual(
                connection.execute(text("SELECT new_content FROM monitor_logs WHERE task_id = :id"), {"id": task_id}).scalar_one(),
                "new",
            )

    def test_sqlite_foreign_keys_are_enabled_on_every_pooled_connection(self):
        Base.metadata.create_all(bind=self.engine)
        for _ in range(2):
            with self.engine.connect() as connection:
                self.assertEqual(connection.execute(text("PRAGMA foreign_keys")).scalar_one(), 1)
        with self.assertRaises(IntegrityError):
            with self.engine.begin() as connection:
                connection.execute(
                    text(
                        "INSERT INTO monitor_tasks (name, url, xpath, config_version, owner_id) "
                        "VALUES ('orphan', 'https://example.com', '//main', 1, 999999)"
                    )
                )

    def test_bootstrap_uses_migration_upgrade_before_admin_seed(self):
        with mock.patch.object(bootstrap_module, "upgrade_database") as upgrade, mock.patch.object(
            bootstrap_module, "create_default_admin"
        ) as seed:
            bootstrap_module.bootstrap()
        upgrade.assert_called_once_with()
        seed.assert_called_once_with()


if __name__ == "__main__":
    unittest.main()
