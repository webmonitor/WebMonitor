"""订阅服务：状态转换、额度、归属与级联。

直接调用服务层（真实 ORM + 真实 Session），覆盖 HTTP 层不容易表达的状态边界。
"""
import os
import sys
import unittest
from unittest import mock

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import support  # noqa: E402

support.bootstrap_environment()

from sqlalchemy import create_engine  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402

from app.db.models import Base, EmailConfig, MonitorLog, MonitorTask, TaskSubscription, User  # noqa: E402
from app.schemas.schemas import TaskSubscriptionUpdate  # noqa: E402
from app.services import subscription_service  # noqa: E402
from app.services.errors import ServiceError  # noqa: E402


class SubscriptionServiceTestCase(unittest.TestCase):
    def setUp(self):
        state = support.bootstrap_environment()
        self.tmpdir = support.tempfile.mkdtemp(prefix="subs-", dir=state["tmpdir"])
        self.engine = create_engine(
            f"sqlite:///{os.path.join(self.tmpdir, 'db.sqlite')}",
            connect_args={"check_same_thread": False},
        )
        Base.metadata.create_all(bind=self.engine)
        self.Session = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)

        self.patches = [
            mock.patch("app.services.email_service.SessionLocal", self.Session),
            mock.patch("app.services.subscription_service.get_subscription_limit", wraps=_limit),
        ]
        for patch in self.patches:
            patch.start()

        self.db = self.Session()
        self.owner = self._user("owner", "owner@example.com")
        self.reader = self._user("reader", "reader@example.com", max_subscriptions=2)
        self.stranger = self._user("stranger", "stranger@example.com")

        self.owner_config = self._config(self.owner, "owner-cfg")
        self.reader_config = self._config(self.reader, "reader-cfg")
        self.stranger_config = self._config(self.stranger, "stranger-cfg")

        self.task = self._task(self.owner, "shared", is_public=True)

    def tearDown(self):
        for patch in reversed(self.patches):
            patch.stop()
        self.db.close()
        self.engine.dispose()
        support.shutil.rmtree(self.tmpdir, ignore_errors=True)

    # --- fixtures ----------------------------------------------------------
    def _user(self, username, email, max_subscriptions=10):
        user = User(
            username=username,
            email=email,
            hashed_password="x",
            is_active=True,
            is_admin=False,
            max_subscriptions=max_subscriptions,
        )
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user

    def _config(self, user, name):
        config = EmailConfig(
            name=name,
            smtp_server="smtp.example.com",
            smtp_port=2525,
            smtp_user="u@example.com",
            smtp_password="pw",
            receiver_email=f"{name}@example.com",
            is_ssl=False,
            user_id=user.id,
        )
        self.db.add(config)
        self.db.commit()
        self.db.refresh(config)
        return config

    def _task(self, owner, name, is_public=True, is_active=True):
        task = MonitorTask(
            name=name,
            url=f"http://example.com/{name}",
            xpath="//div",
            interval=60,
            is_active=is_active,
            is_public=is_public,
            owner_id=owner.id,
        )
        self.db.add(task)
        self.db.commit()
        self.db.refresh(task)
        return task

    def _rows(self):
        return self.db.query(TaskSubscription).all()

    # --- tests -------------------------------------------------------------
    def test_existing_active_subscription_rejects_foreign_config(self):
        subscription_service.subscribe(self.db, self.task.id, self.reader, self.reader_config.id)

        with self.assertRaises(ServiceError) as ctx:
            subscription_service.subscribe(
                self.db,
                self.task.id,
                self.reader,
                self.stranger_config.id,
                update_if_active=True,
            )
        self.assertEqual(ctx.exception.status_code, 400)

        row = self.db.query(TaskSubscription).one()
        self.assertEqual(row.email_config_id, self.reader_config.id)

    def test_existing_active_subscription_rejects_missing_config(self):
        subscription_service.subscribe(self.db, self.task.id, self.reader, self.reader_config.id)

        with self.assertRaises(ServiceError):
            subscription_service.subscribe(
                self.db, self.task.id, self.reader, 9999, update_if_active=True
            )

        self.assertEqual(self.db.query(TaskSubscription).count(), 1)

    def test_plain_duplicate_subscribe_is_conflict(self):
        subscription_service.subscribe(self.db, self.task.id, self.reader, self.reader_config.id)

        with self.assertRaises(ServiceError) as ctx:
            subscription_service.subscribe(self.db, self.task.id, self.reader, self.reader_config.id)
        self.assertEqual(ctx.exception.status_code, 409)
        self.assertEqual(self.db.query(TaskSubscription).count(), 1)

    def test_reactivation_reuses_the_same_row(self):
        created = subscription_service.subscribe(self.db, self.task.id, self.reader, self.reader_config.id)
        row_id = created.id

        updated = subscription_service.update_subscription(
            self.db, row_id, TaskSubscriptionUpdate(is_active=False), self.reader
        )
        self.assertFalse(updated.is_active)

        reactivated = subscription_service.subscribe(self.db, self.task.id, self.reader, self.reader_config.id)
        self.assertEqual(reactivated.id, row_id)
        self.assertTrue(reactivated.is_active)
        self.assertEqual(self.db.query(TaskSubscription).count(), 1)

    def test_reactivation_respects_the_limit(self):
        second_task = self._task(self.owner, "second", is_public=True)
        third_task = self._task(self.owner, "third", is_public=True)

        first = subscription_service.subscribe(self.db, self.task.id, self.reader, self.reader_config.id)
        subscription_service.subscribe(self.db, second_task.id, self.reader, self.reader_config.id)

        # 停用一条后不占额度，可以再订阅一个（重新回到满额）
        subscription_service.update_subscription(
            self.db, first.id, TaskSubscriptionUpdate(is_active=False), self.reader
        )
        subscription_service.subscribe(self.db, third_task.id, self.reader, self.reader_config.id)
        self.assertEqual(self.db.query(TaskSubscription).filter(TaskSubscription.is_active == True).count(), 2)  # noqa: E712

        # 满额后再激活被停用的那条必须被额度挡住
        with self.assertRaises(ServiceError) as ctx:
            subscription_service.subscribe(self.db, self.task.id, self.reader, self.reader_config.id)
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("2", ctx.exception.detail)

        row = self.db.query(TaskSubscription).filter(TaskSubscription.task_id == self.task.id).one()
        self.assertFalse(row.is_active)

    def test_full_quota_still_allows_changing_config_on_active_subscription(self):
        subscription_service.subscribe(self.db, self.task.id, self.reader, self.reader_config.id)
        second_task = self._task(self.owner, "second", is_public=True)
        subscription_service.subscribe(self.db, second_task.id, self.reader, self.reader_config.id)

        alt_config = self._config(self.reader, "reader-alt")
        result = subscription_service.subscribe_with_email(
            self.db, self.task.id, self.reader, alt_config.id
        )
        self.assertTrue(result["subscribed"])

        row = self.db.query(TaskSubscription).filter(TaskSubscription.task_id == self.task.id).one()
        self.assertEqual(row.email_config_id, alt_config.id)

    def test_cancel_still_works_after_task_goes_private(self):
        subscription_service.subscribe(self.db, self.task.id, self.reader, self.reader_config.id)

        self.task.is_public = False
        self.db.commit()

        result = subscription_service.toggle(self.db, self.task.id, self.reader)
        self.assertFalse(result["subscribed"])
        self.assertEqual(self.db.query(TaskSubscription).count(), 0)

        # 重新订阅必须被公开性挡住
        with self.assertRaises(ServiceError) as ctx:
            subscription_service.toggle(self.db, self.task.id, self.reader)
        self.assertEqual(ctx.exception.status_code, 404)

    def test_toggle_without_email_config_fails(self):
        no_config_user = self._user("noconfig", "noconfig@example.com")

        with self.assertRaises(ServiceError) as ctx:
            subscription_service.toggle(self.db, self.task.id, no_config_user)
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertEqual(self.db.query(TaskSubscription).count(), 0)

    def test_null_config_uses_default_semantics(self):
        created = subscription_service.subscribe(self.db, self.task.id, self.reader, None)
        self.assertIsNone(created.email_config_id)

        updated = subscription_service.update_subscription(
            self.db, created.id, TaskSubscriptionUpdate(email_config_id=self.reader_config.id), self.reader
        )
        self.assertEqual(updated.email_config_id, self.reader_config.id)

        # 显式 null 表示回到默认配置
        back = subscription_service.update_subscription(
            self.db, created.id, TaskSubscriptionUpdate(email_config_id=None), self.reader
        )
        self.assertIsNone(back.email_config_id)

    def test_update_rejects_null_is_active(self):
        created = subscription_service.subscribe(self.db, self.task.id, self.reader, self.reader_config.id)
        with self.assertRaises(Exception):
            TaskSubscriptionUpdate(is_active=None)

        self.assertTrue(
            subscription_service.update_subscription(
                self.db, created.id, TaskSubscriptionUpdate(is_active=False), self.reader
            ).is_active
            is False
        )

    def test_subscribe_to_private_or_inactive_task_is_not_found(self):
        private_task = self._task(self.owner, "private", is_public=False)
        inactive_task = self._task(self.owner, "inactive", is_public=True, is_active=False)

        for task in (private_task, inactive_task):
            with self.assertRaises(ServiceError) as ctx:
                subscription_service.subscribe(self.db, task.id, self.reader, self.reader_config.id)
            self.assertEqual(ctx.exception.status_code, 404)

        self.assertEqual(self.db.query(TaskSubscription).count(), 0)

    def test_serialization_exposes_task_and_owner(self):
        created = subscription_service.subscribe(self.db, self.task.id, self.reader, self.reader_config.id)
        self.db.refresh(created)

        payload = subscription_service.serialize_subscription(created)
        self.assertEqual(payload.task_name, "shared")
        self.assertEqual(payload.task_url, self.task.url)
        self.assertEqual(payload.task_owner, "owner")

        # 不往 ORM 实例上挂临时属性
        self.assertFalse(hasattr(created, "task_name"))

    def test_deleting_task_cascades_subscriptions_and_logs(self):
        subscription_service.subscribe(self.db, self.task.id, self.reader, self.reader_config.id)
        self.db.add(MonitorLog(task_id=self.task.id, new_content="x", is_changed=True))
        self.db.commit()

        self.db.delete(self.task)
        self.db.commit()

        self.assertEqual(self.db.query(TaskSubscription).count(), 0)
        self.assertEqual(self.db.query(MonitorLog).count(), 0)

    def test_remaining_slots_never_negative(self):
        from app.db.crud import get_user_subscription_info

        subscription_service.subscribe(self.db, self.task.id, self.reader, self.reader_config.id)
        second = self._task(self.owner, "second", is_public=True)
        subscription_service.subscribe(self.db, second.id, self.reader, self.reader_config.id)

        info = get_user_subscription_info(self.db, self.reader.id)
        self.assertEqual(info["current_subscriptions"], 2)
        self.assertEqual(info["max_subscriptions"], 2)
        self.assertEqual(info["remaining_slots"], 0)

        # 手工把额度降到 1（管理员操作），剩余额度不能是负数
        self.reader.max_subscriptions = 1
        self.db.commit()
        info = get_user_subscription_info(self.db, self.reader.id)
        self.assertEqual(info["remaining_slots"], 0)

    def test_null_quota_falls_back_to_default(self):
        from app.db.crud import get_subscription_limit

        self.reader.max_subscriptions = None
        self.db.commit()

        self.assertEqual(get_subscription_limit(self.reader), 10)


def _limit(user):
    """与 crud.get_subscription_limit 相同的 null→10 规则。"""
    return user.max_subscriptions if user.max_subscriptions is not None else 10


if __name__ == "__main__":
    unittest.main()
