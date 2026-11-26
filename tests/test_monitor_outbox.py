"""采集事务、版本围栏、outbox 恢复与 SMTP 资源边界的确定性回归。"""
import os
import sys
import unittest
from datetime import datetime, timedelta
from unittest import mock

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import support  # noqa: E402

support.bootstrap_environment()

from sqlalchemy import create_engine  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402

from app.db.models import (  # noqa: E402
    Base,
    EmailConfig,
    MonitorLog,
    MonitorTask,
    NotificationOutbox,
    User,
)
from app.services.monitor_service import MonitorService  # noqa: E402
from app.services.outbox_service import OutboxService  # noqa: E402


class MonitorOutboxTestCase(unittest.TestCase):
    def setUp(self):
        state = support.bootstrap_environment()
        self.tmpdir = support.tempfile.mkdtemp(prefix="outbox-", dir=state["tmpdir"])
        self.engine = create_engine(
            f"sqlite:///{os.path.join(self.tmpdir, 'db.sqlite')}",
            connect_args={"check_same_thread": False},
        )
        Base.metadata.create_all(bind=self.engine)
        self.Session = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
        self.patches = [
            mock.patch("app.services.monitor_service.SessionLocal", self.Session),
            mock.patch("app.services.outbox_service.SessionLocal", self.Session),
            mock.patch("app.services.email_service.SessionLocal", self.Session),
        ]
        for patch in self.patches:
            patch.start()

        self.db = self.Session()
        self.owner = User(
            username="owner",
            email="owner@example.com",
            hashed_password="x",
            is_active=True,
            is_admin=False,
            max_subscriptions=10,
        )
        self.db.add(self.owner)
        self.db.flush()
        self.config = EmailConfig(
            name="cfg",
            smtp_server="smtp.example.com",
            smtp_port=2525,
            smtp_user="sender@example.com",
            smtp_password="test-only-password",
            receiver_email="owner-inbox@example.com",
            is_ssl=False,
            user_id=self.owner.id,
        )
        self.db.add(self.config)
        self.db.flush()
        self.task = self._task("task")

    def tearDown(self):
        for patch in reversed(self.patches):
            patch.stop()
        self.db.close()
        self.engine.dispose()
        support.shutil.rmtree(self.tmpdir, ignore_errors=True)

    def _task(self, name):
        task = MonitorTask(
            name=name,
            url="http://example.com/original",
            xpath="//div[@id='value']",
            interval=60,
            is_active=True,
            is_public=False,
            owner_id=self.owner.id,
            email_config_id=self.config.id,
            last_content=None,
        )
        self.db.add(task)
        self.db.commit()
        self.db.refresh(task)
        return task

    def _outbox(self, task=None, *, status="pending", attempts=0):
        task = task or self.task
        row = NotificationOutbox(
            task_id=task.id,
            user_id=self.owner.id,
            email_config_id=self.config.id,
            task_name=task.name,
            url=task.url,
            title="title",
            old_content="old",
            new_content="new",
            check_time=datetime(2026, 1, 1, 12, 0, 0),
            status=status,
            attempts=attempts,
            next_attempt_at=datetime.now() - timedelta(seconds=1),
        )
        self.db.add(row)
        self.db.commit()
        self.db.refresh(row)
        return row

    def test_smtp_runs_only_after_baseline_log_and_outbox_commit(self):
        service = MonitorService()
        observed = {}

        def send_after_commit(**kwargs):
            with self.Session() as db:
                observed["baseline"] = db.get(MonitorTask, self.task.id).last_content
                observed["logs"] = db.query(MonitorLog).filter(MonitorLog.task_id == self.task.id).count()
                outbox = db.query(NotificationOutbox).filter(NotificationOutbox.task_id == self.task.id).one()
                observed["outbox_status"] = outbox.status
                observed["attempts"] = outbox.attempts
            return True

        with mock.patch.object(
            service,
            "get_content_with_selenium",
            return_value=("new-content", None, "title"),
        ), mock.patch.object(service.email_service, "send_change_notification", side_effect=send_after_commit):
            self.assertTrue(service.check_single_task(self.task.id))

        self.assertEqual(observed["baseline"], "new-content")
        self.assertEqual(observed["logs"], 1)
        self.assertEqual(observed["outbox_status"], "sending")
        self.assertEqual(observed["attempts"], 1)
        with self.Session() as db:
            self.assertEqual(db.query(NotificationOutbox).one().status, "delivered")

    def test_outbox_failure_rolls_back_baseline_and_log_without_sending(self):
        service = MonitorService()
        with mock.patch.object(
            service,
            "get_content_with_selenium",
            return_value=("new-content", None, "title"),
        ), mock.patch.object(
            service,
            "_enqueue_outbox",
            side_effect=RuntimeError("forced outbox insert failure"),
        ), mock.patch.object(service.email_service, "send_change_notification") as send:
            self.assertFalse(service.check_single_task(self.task.id))

        send.assert_not_called()
        with self.Session() as db:
            task = db.get(MonitorTask, self.task.id)
            self.assertIsNone(task.last_content)
            self.assertIsNone(task.last_check)
            self.assertEqual(db.query(MonitorLog).filter(MonitorLog.task_id == self.task.id).count(), 0)
            self.assertEqual(db.query(NotificationOutbox).filter(NotificationOutbox.task_id == self.task.id).count(), 0)

    def test_scrape_result_is_discarded_after_every_version_fence_change(self):
        for mutation in ("url", "xpath", "deactivate", "version", "delete"):
            with self.subTest(mutation=mutation):
                task = self._task(f"task-{mutation}")
                service = MonitorService()

                def mutate_during_scrape(url, xpath, task_id=task.id, operation=mutation):
                    with self.Session() as db:
                        row = db.get(MonitorTask, task_id)
                        if operation == "url":
                            row.url = "http://example.com/edited"
                            row.config_version += 1
                        elif operation == "xpath":
                            row.xpath = "//span"
                            row.config_version += 1
                        elif operation == "deactivate":
                            row.is_active = False
                            row.config_version += 1
                        elif operation == "version":
                            row.config_version += 1
                        else:
                            db.delete(row)
                        db.commit()
                    return "stale-content", None, "stale-title"

                with mock.patch.object(
                    service,
                    "get_content_with_selenium",
                    side_effect=mutate_during_scrape,
                ), mock.patch.object(service.email_service, "send_change_notification") as send:
                    self.assertFalse(service.check_single_task(task.id))

                send.assert_not_called()
                with self.Session() as db:
                    row = db.get(MonitorTask, task.id)
                    if mutation == "delete":
                        self.assertIsNone(row)
                    else:
                        self.assertIsNone(row.last_content)
                        self.assertIsNone(row.last_check)
                    self.assertEqual(db.query(MonitorLog).filter(MonitorLog.task_id == task.id).count(), 0)
                    self.assertEqual(
                        db.query(NotificationOutbox).filter(NotificationOutbox.task_id == task.id).count(),
                        0,
                    )

    def test_task_edit_increments_the_collection_version(self):
        from app.db.crud import update_monitor_task
        from app.schemas.schemas import MonitorTaskUpdate

        original = self.task.config_version
        updated = update_monitor_task(self.db, self.task.id, MonitorTaskUpdate(name="renamed"))
        self.assertEqual(updated.config_version, original + 1)
        unchanged = update_monitor_task(self.db, self.task.id, MonitorTaskUpdate())
        self.assertEqual(unchanged.config_version, original + 1)

    def test_outbox_freezes_url_and_content_from_the_same_snapshot(self):
        service = MonitorService()
        with mock.patch.object(
            service,
            "get_content_with_selenium",
            return_value=("new-content", None, "title"),
        ), mock.patch.object(service.outbox_service, "deliver_pending"):
            self.assertTrue(service.check_single_task(self.task.id))

        with self.Session() as db:
            row = db.get(MonitorTask, self.task.id)
            row.url = "http://example.com/edited"
            row.config_version += 1
            db.commit()

        with mock.patch.object(service.email_service, "send_change_notification", return_value=True) as send:
            service.outbox_service.deliver_pending()
        self.assertEqual(send.call_args.kwargs["url"], "http://example.com/original")
        self.assertEqual(send.call_args.kwargs["new_content"], "new-content")

    def test_drain_batch_budget_leaves_pending_rows_for_later_cycles(self):
        first = self._outbox()
        second = self._outbox()
        service = OutboxService()
        with mock.patch.object(service.email_service, "send_change_notification", return_value=True) as send:
            self.assertEqual(
                service.deliver_pending(batch_size=1, max_batches=1, time_budget_seconds=60),
                1,
            )
            self.db.refresh(first)
            self.db.refresh(second)
            self.assertEqual(first.status, "delivered")
            self.assertEqual(second.status, "pending")
            self.assertEqual(second.attempts, 0)

            self.assertEqual(service.deliver_pending(), 1)
            self.db.refresh(second)
            self.assertEqual(second.status, "delivered")
        self.assertEqual(send.call_count, 2)

    def test_drain_time_budget_releases_unattempted_claims_without_retry_cost(self):
        first = self._outbox()
        second = self._outbox()
        service = OutboxService()
        with mock.patch("app.services.outbox_service.time.monotonic", side_effect=[0, 0, 0, 2]), mock.patch.object(
            service.email_service,
            "send_change_notification",
            return_value=True,
        ) as send:
            self.assertEqual(service.deliver_pending(time_budget_seconds=1), 1)
        self.db.refresh(first)
        self.db.refresh(second)
        self.assertEqual(first.status, "delivered")
        self.assertEqual(second.status, "pending")
        self.assertEqual(second.attempts, 0)
        self.assertEqual(send.call_count, 1)

    def test_unchanged_log_does_not_store_duplicate_old_and_new_content(self):
        self.task.last_content = "same-content"
        self.db.commit()
        service = MonitorService()
        with mock.patch.object(
            service,
            "get_content_with_selenium",
            return_value=("same-content", None, "title"),
        ), mock.patch.object(service.outbox_service, "deliver_pending"):
            self.assertTrue(service.check_single_task(self.task.id))
        log = self.db.query(MonitorLog).filter(MonitorLog.task_id == self.task.id).one()
        self.assertFalse(log.is_changed)
        self.assertIsNone(log.old_content)
        self.assertIsNone(log.new_content)

    def test_log_retention_deletes_only_expired_rows(self):
        old_log = MonitorLog(task_id=self.task.id, check_time=datetime.now() - timedelta(days=31))
        recent_log = MonitorLog(task_id=self.task.id, check_time=datetime.now())
        self.db.add_all([old_log, recent_log])
        self.db.commit()
        self.db.refresh(old_log)
        self.db.refresh(recent_log)

        with mock.patch("app.services.monitor_service.settings.LOG_RETENTION_DAYS", 30):
            self.assertEqual(MonitorService.cleanup_old_logs(), 1)
        remaining = self.db.query(MonitorLog).all()
        self.assertEqual([row.id for row in remaining], [recent_log.id])

    def test_failed_delivery_retries_are_bounded(self):
        row = self._outbox()
        service = OutboxService()
        with mock.patch.object(service.email_service, "send_change_notification", return_value=False) as send:
            for attempt in range(1, 4):
                if attempt > 1:
                    self.db.refresh(row)
                    row.next_attempt_at = datetime.now() - timedelta(seconds=1)
                    self.db.commit()
                self.assertEqual(service.deliver_pending(), 0)
                self.db.refresh(row)
                self.assertEqual(row.attempts, attempt)
                self.assertEqual(row.status, "failed" if attempt == 3 else "pending")

            row.next_attempt_at = datetime.now() - timedelta(seconds=1)
            self.db.commit()
            self.assertEqual(service.deliver_pending(), 0)

        self.assertEqual(send.call_count, 3)
        self.assertEqual(row.status, "failed")

    def test_crash_after_smtp_accept_is_recovered_with_at_least_once_delivery(self):
        class SimulatedProcessCrash(BaseException):
            pass

        row = self._outbox()
        service = OutboxService()
        calls = []

        def crash_after_accept(**kwargs):
            calls.append(kwargs)
            raise SimulatedProcessCrash

        with mock.patch.object(service.email_service, "send_change_notification", side_effect=crash_after_accept):
            with self.assertRaises(SimulatedProcessCrash):
                service.deliver_pending()

        self.db.refresh(row)
        self.assertEqual(row.status, "sending")
        self.assertEqual(row.attempts, 1)

        restarted = OutboxService()
        with mock.patch.object(restarted.email_service, "send_change_notification", return_value=True) as send:
            self.assertEqual(restarted.deliver_pending(), 1)
        self.db.refresh(row)
        self.assertEqual(row.status, "delivered")
        self.assertEqual(row.attempts, 2)
        self.assertEqual(len(calls) + send.call_count, 2)

    def test_pending_outbox_protects_its_frozen_smtp_config(self):
        from app.db.crud import count_email_config_references

        self.task.email_config_id = None
        self.db.commit()
        row = self._outbox()
        self.assertEqual(count_email_config_references(self.db, self.config.id), 1)
        row.status = "delivered"
        self.db.commit()
        self.assertEqual(count_email_config_references(self.db, self.config.id), 0)

    def test_deleting_user_removes_smtp_config_and_outbox_in_one_service_path(self):
        from app.services import user_service

        self._outbox()
        with mock.patch.object(user_service.monitor_scheduler, "sync_tasks"):
            user_service.delete_user(self.db, self.owner.id)

        with self.Session() as db:
            self.assertEqual(db.query(EmailConfig).count(), 0)
            self.assertEqual(db.query(NotificationOutbox).count(), 0)
            self.assertEqual(db.query(MonitorTask).count(), 0)
            self.assertEqual(db.query(User).count(), 0)


class DebugSqlLoggingTestCase(unittest.TestCase):
    def test_debug_sql_hides_smtp_password_and_every_bind_value(self):
        from app.db.database import create_database_engine

        state = support.bootstrap_environment()
        tmpdir = support.tempfile.mkdtemp(prefix="sql-log-", dir=state["tmpdir"])
        engine = create_database_engine(f"sqlite:///{os.path.join(tmpdir, 'db.sqlite')}", debug=True)
        Base.metadata.create_all(bind=engine)
        SessionLocal = sessionmaker(bind=engine)
        bind_values = (
            "debug-user-value",
            "debug-user@example.com",
            "debug-hash-value",
            "debug-cfg-value",
            "smtp.debug.example",
            "debug-sender@example.com",
            "debug-smtp-password-value",
            "debug-receiver@example.com",
        )
        try:
            with self.assertLogs("sqlalchemy.engine", level="INFO") as captured:
                with SessionLocal() as db:
                    user = User(
                        username=bind_values[0],
                        email=bind_values[1],
                        hashed_password=bind_values[2],
                    )
                    db.add(user)
                    db.flush()
                    db.add(
                        EmailConfig(
                            name=bind_values[3],
                            smtp_server=bind_values[4],
                            smtp_port=2525,
                            smtp_user=bind_values[5],
                            smtp_password=bind_values[6],
                            receiver_email=bind_values[7],
                            is_ssl=False,
                            user_id=user.id,
                        )
                    )
                    db.commit()
            logs = "\n".join(captured.output)
            self.assertIn("parameters hidden", logs)
            for value in bind_values:
                self.assertNotIn(value, logs)
        finally:
            engine.dispose()
            support.shutil.rmtree(tmpdir, ignore_errors=True)


class SmtpResourceTestCase(unittest.TestCase):
    def test_send_closes_after_failure(self):
        from app.services.email_service import EmailService

        server = mock.Mock()
        server.login.side_effect = OSError("blackhole")
        with mock.patch("app.services.email_service._connect_smtp", return_value=server) as connect:
            self.assertFalse(
                EmailService()._send_email(
                    "subject",
                    "content",
                    "smtp.example.com",
                    587,
                    "sender@example.com",
                    "test-only-password",
                    "receiver@example.com",
                    False,
                )
            )
        connect.assert_called_once_with("smtp.example.com", 587, False)
        server.quit.assert_called_once_with()
        server.close.assert_called_once_with()

    def test_connection_test_closes_after_failure(self):
        from app.services.email_service import EmailService

        server = mock.Mock()
        server.login.side_effect = OSError("blackhole")
        with mock.patch("app.services.email_service._connect_smtp", return_value=server) as connect:
            result = EmailService()._test_connection(
                "smtp.example.com",
                465,
                "sender@example.com",
                "test-only-password",
                True,
            )
        self.assertFalse(result["success"])
        connect.assert_called_once_with("smtp.example.com", 465, True)
        server.quit.assert_called_once_with()
        server.close.assert_called_once_with()


if __name__ == "__main__":
    unittest.main()
