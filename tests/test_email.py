"""邮件发送：配置解析严格按用户隔离，且不存在部署级回退。

这些用例直接驱动 EmailService，把 SMTP 传输层替换成记录器，只断言“选了谁、
发给谁”，不碰真实网络。
"""
import os
import sys
import unittest
from datetime import datetime
from unittest import mock

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import support  # noqa: E402

support.bootstrap_environment()

from sqlalchemy import create_engine  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402

from app.core.config import Settings  # noqa: E402
from app.db.models import Base, EmailConfig, User  # noqa: E402
from app.services.email_service import EmailService  # noqa: E402


class EmailResolutionTestCase(unittest.TestCase):
    def setUp(self):
        state = support.bootstrap_environment()
        self.tmpdir = support.tempfile.mkdtemp(prefix="mail-", dir=state["tmpdir"])
        self.engine = create_engine(
            f"sqlite:///{os.path.join(self.tmpdir, 'db.sqlite')}",
            connect_args={"check_same_thread": False},
        )
        Base.metadata.create_all(bind=self.engine)
        self.Session = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)

        self.patch = mock.patch("app.services.email_service.SessionLocal", self.Session)
        self.patch.start()

        self.db = self.Session()
        self.alice = self._user("alice", "alice@example.com")
        self.bob = self._user("bob", "bob@example.com")

        self.service = EmailService()
        self.sent = []

    def tearDown(self):
        self.patch.stop()
        self.db.close()
        self.engine.dispose()
        support.shutil.rmtree(self.tmpdir, ignore_errors=True)

    def _user(self, username, email):
        user = User(
            username=username,
            email=email,
            hashed_password="x",
            is_active=True,
            is_admin=False,
            max_subscriptions=10,
        )
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user

    def _config(self, user, name, receiver, password="pw-1"):
        config = EmailConfig(
            name=name,
            smtp_server="smtp.example.com",
            smtp_port=2525,
            smtp_user=f"{name}@example.com",
            smtp_password=password,
            receiver_email=receiver,
            is_ssl=False,
            user_id=user.id,
        )
        self.db.add(config)
        self.db.commit()
        self.db.refresh(config)
        return config

    def _send(self, **kwargs):
        """调用真实解析路径，把实际传输换成内存记录。"""
        params = {
            "task_name": "t",
            "url": "http://example.com/a",
            "title": "title",
            "old_content": "old",
            "new_content": "new",
            "check_time": datetime(2024, 1, 1, 12, 0, 0),
        }
        params.update(kwargs)

        def fake_send(subject, content, smtp_server, smtp_port, smtp_user, smtp_password, receiver, is_ssl):
            self.sent.append(
                {
                    "smtp_server": smtp_server,
                    "smtp_user": smtp_user,
                    "smtp_password": smtp_password,
                    "receiver": receiver,
                }
            )
            return True

        with mock.patch.object(self.service, "_send_email", side_effect=fake_send):
            return self.service.send_change_notification(**params)

    # --- 没有回退 -----------------------------------------------------------
    def test_user_without_any_config_sends_nothing(self):
        result = self._send(user_id=self.alice.id)
        self.assertFalse(result)
        self.assertEqual(self.sent, [])

    def test_removed_settings_cannot_act_as_a_fallback(self):
        """即使进程环境里塞了 SMTP_*，也不能变成收件人来源。"""
        with mock.patch.dict(
            os.environ,
            {
                "SMTP_SERVER": "smtp.fallback.example",
                "SMTP_USER": "fallback@example.com",
                "SMTP_PASSWORD": "fallback-secret",
                "RECEIVER_EMAIL": "fallback@example.com",
            },
        ):
            with mock.patch.dict(os.environ, {}, clear=False):
                result = self._send(user_id=self.alice.id)

        self.assertFalse(result)
        self.assertEqual(self.sent, [])

    def test_settings_have_no_smtp_fields(self):
        with mock.patch.dict(os.environ, {}, clear=True):
            settings = Settings(SECRET_KEY="k" * 48, _env_file=None)
        for removed in ("SMTP_SERVER", "SMTP_PORT", "SMTP_USER", "SMTP_PASSWORD", "RECEIVER_EMAIL"):
            self.assertFalse(hasattr(settings, removed), removed)

    # --- 只发到本人地址 -----------------------------------------------------
    def test_uses_the_users_lowest_id_config(self):
        self._config(self.alice, "first", "first@example.com", password="pw-first")
        self._config(self.alice, "second", "second@example.com", password="pw-second")

        self.assertTrue(self._send(user_id=self.alice.id))
        self.assertEqual(len(self.sent), 1)
        self.assertEqual(self.sent[0]["receiver"], "first@example.com")
        self.assertEqual(self.sent[0]["smtp_password"], "pw-first")

    def test_explicit_config_id_wins(self):
        self._config(self.alice, "first", "first@example.com")
        second = self._config(self.alice, "second", "second@example.com", password="pw-second")

        self.assertTrue(self._send(user_id=self.alice.id, email_config_id=second.id))
        self.assertEqual(self.sent[0]["receiver"], "second@example.com")
        self.assertEqual(self.sent[0]["smtp_password"], "pw-second")

    def test_another_users_config_is_never_used(self):
        bob_config = self._config(self.bob, "bob", "bob@example.com", password="pw-bob")
        self._config(self.alice, "alice", "alice@example.com", password="pw-alice")

        # alice 明确指定 bob 的配置：失败，且不回退到她自己的配置
        result = self._send(user_id=self.alice.id, email_config_id=bob_config.id)
        self.assertFalse(result)
        self.assertEqual(self.sent, [])

    def test_missing_config_id_does_not_fall_back(self):
        self._config(self.alice, "alice", "alice@example.com")
        result = self._send(user_id=self.alice.id, email_config_id=9999)
        self.assertFalse(result)
        self.assertEqual(self.sent, [])

    def test_other_user_config_is_not_used_when_user_has_none(self):
        self._config(self.bob, "bob", "bob@example.com")
        result = self._send(user_id=self.alice.id)
        self.assertFalse(result)
        self.assertEqual(self.sent, [])

    def test_incomplete_config_does_not_send(self):
        config = self._config(self.alice, "alice", "alice@example.com")
        config.smtp_password = ""
        self.db.commit()

        self.assertFalse(self._send(user_id=self.alice.id))
        self.assertEqual(self.sent, [])


class MonitorServiceNotificationTestCase(unittest.TestCase):
    """没有邮件配置的任务：采集照常，通知完全跳过。"""

    def setUp(self):
        state = support.bootstrap_environment()
        self.tmpdir = support.tempfile.mkdtemp(prefix="mon-", dir=state["tmpdir"])
        self.engine = create_engine(
            f"sqlite:///{os.path.join(self.tmpdir, 'db.sqlite')}",
            connect_args={"check_same_thread": False},
        )
        Base.metadata.create_all(bind=self.engine)
        self.Session = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)

        self.patches = [
            mock.patch("app.services.monitor_service.SessionLocal", self.Session),
            mock.patch("app.services.email_service.SessionLocal", self.Session),
        ]
        for patch in self.patches:
            patch.start()

        self.db = self.Session()
        self.user = User(
            username="owner",
            email="owner@example.com",
            hashed_password="x",
            is_active=True,
            is_admin=False,
            max_subscriptions=10,
        )
        self.db.add(self.user)
        self.db.commit()
        self.db.refresh(self.user)

    def tearDown(self):
        for patch in reversed(self.patches):
            patch.stop()
        self.db.close()
        self.engine.dispose()
        support.shutil.rmtree(self.tmpdir, ignore_errors=True)

    def _task(self, email_config_id):
        from app.db.models import MonitorTask

        task = MonitorTask(
            name="t",
            url="http://example.com/a",
            xpath="//div",
            interval=60,
            is_active=True,
            is_public=False,
            owner_id=self.user.id,
            email_config_id=email_config_id,
        )
        self.db.add(task)
        self.db.commit()
        self.db.refresh(task)
        return task

    def _run_check(self, task):
        from app.services.monitor_service import MonitorService

        service = MonitorService()
        with mock.patch.object(
            service, "get_content_with_selenium", return_value=("changed content", None, "title")
        ), mock.patch.object(service.email_service, "send_change_notification") as send:
            self.assertTrue(service.check_single_task(task.id))
        return send

    def test_task_without_config_collects_but_never_notifies(self):
        task = self._task(None)
        send = self._run_check(task)
        self.assertEqual(send.call_count, 0)

        # 采集结果仍然落库
        self.db.refresh(task)
        self.assertEqual(task.last_content, "changed content")

        from app.db.models import MonitorLog

        logs = self.db.query(MonitorLog).filter(MonitorLog.task_id == task.id).all()
        self.assertEqual(len(logs), 1)

    def test_task_with_config_notifies_the_owner(self):
        config = EmailConfig(
            name="cfg",
            smtp_server="smtp.example.com",
            smtp_port=2525,
            smtp_user="u@example.com",
            smtp_password="pw",
            receiver_email="owner-inbox@example.com",
            is_ssl=False,
            user_id=self.user.id,
        )
        self.db.add(config)
        self.db.commit()
        self.db.refresh(config)

        task = self._task(config.id)
        send = self._run_check(task)

        self.assertEqual(send.call_count, 1)
        kwargs = send.call_args.kwargs
        self.assertEqual(kwargs["email_config_id"], config.id)
        self.assertEqual(kwargs["user_id"], self.user.id)


if __name__ == "__main__":
    unittest.main()
