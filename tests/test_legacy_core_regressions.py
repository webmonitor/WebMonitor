"""目标规范化、原子版本/管理员围栏与采集会话生命周期回归。"""
import os
import sys
import threading
import unittest
from unittest import mock

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import support  # noqa: E402

support.bootstrap_environment()

from app.db.crud import (  # noqa: E402
    create_blacklist_domain,
    is_url_in_blacklist,
    update_blacklist_domain,
    update_monitor_task,
)
from app.db.models import BlacklistDomain, MonitorTask, User  # noqa: E402
from app.schemas.schemas import (  # noqa: E402
    BlacklistDomainCreate,
    BlacklistDomainUpdate,
    MonitorTaskCreate,
    MonitorTaskUpdate,
    UserUpdate,
)
from app.services import task_service, user_service  # noqa: E402
from app.services.errors import ServiceError  # noqa: E402
from app.services.monitor_service import MonitorService  # noqa: E402


class LegacyCoreRegressionTestCase(support.DatabaseTestCase):
    def setUp(self):
        self.clear_data()

    def _user(self, db, name: str, *, is_admin: bool = False) -> User:
        row = User(
            username=name,
            email=f"{name}@example.test",
            hashed_password="not-used",
            is_active=True,
            is_admin=is_admin,
            max_subscriptions=10,
        )
        db.add(row)
        db.commit()
        db.refresh(row)
        return row

    def _task(self, db, owner: User, *, name: str = "task") -> MonitorTask:
        row = MonitorTask(
            name=name,
            url="http://example.test/path",
            xpath="//body",
            interval=60,
            is_active=True,
            is_public=False,
            owner_id=owner.id,
        )
        db.add(row)
        db.commit()
        db.refresh(row)
        return row

    def test_blacklist_normalizes_idna_and_trailing_dots_without_substring_matching(self):
        db = self.session()
        try:
            admin = self._user(db, "admin", is_admin=True)
            # 直接插入模拟规则规范化上线前的历史行。
            db.add(
                BlacklistDomain(
                    domain="ExAmple.COM.",
                    description="legacy",
                    is_active=True,
                    created_by=admin.id,
                )
            )
            db.commit()

            self.assertTrue(is_url_in_blacklist(db, "http://EXAMPLE.com./account"))
            self.assertFalse(is_url_in_blacklist(db, "http://notexample.com/"))
            self.assertFalse(is_url_in_blacklist(db, "http://example.com.evil.test/"))
            self.assertFalse(is_url_in_blacklist(db, "http://sub.example.com/"))

            wildcard = create_blacklist_domain(
                db,
                BlacklistDomainCreate(domain=" *.BÜCHER.Example. ", description="unicode"),
                admin.id,
            )
            self.assertEqual(wildcard.domain, "*.xn--bcher-kva.example")
            self.assertTrue(is_url_in_blacklist(db, "http://deep.bücher.example./path"))
            self.assertTrue(is_url_in_blacklist(db, "http://BÜCHER.EXAMPLE./"))
            self.assertFalse(is_url_in_blacklist(db, "http://notxn--bcher-kva.example/"))

            updated = update_blacklist_domain(
                db,
                wildcard.id,
                BlacklistDomainUpdate(domain="WWW.Example.ORG."),
            )
            self.assertIsNotNone(updated)
            self.assertEqual(updated.domain, "www.example.org")
        finally:
            db.close()

    def test_invalid_schemes_are_rejected_before_create_and_update_for_every_role(self):
        db = self.session()
        try:
            regular = self._user(db, "regular")
            admin = self._user(db, "admin", is_admin=True)
            task = self._task(db, regular)
            original_version = task.config_version

            for user in (regular, admin):
                for url in ("file:///etc/hosts", "ftp://example.com/file", "javascript:alert(1)"):
                    with self.subTest(user=user.username, operation="create", url=url):
                        with self.assertRaises(ServiceError) as raised:
                            task_service.create_task(
                                db,
                                MonitorTaskCreate(name="invalid", url=url, xpath="//body", interval=60),
                                user,
                            )
                        self.assertEqual(raised.exception.status_code, 400)

            self.assertEqual(db.query(MonitorTask).filter(MonitorTask.name == "invalid").count(), 0)
            with mock.patch.object(task_service.monitor_scheduler, "sync_tasks") as sync:
                with self.assertRaises(ServiceError) as raised:
                    task_service.update_task(
                        db,
                        task.id,
                        MonitorTaskUpdate(url="file:///etc/hosts"),
                        regular,
                    )
                self.assertEqual(raised.exception.status_code, 400)
                sync.assert_not_called()

            db.refresh(task)
            self.assertEqual(task.config_version, original_version)
            self.assertEqual(task.url, "http://example.test/path")
        finally:
            db.close()

    def test_concurrent_updates_increment_database_version_from_stale_orm_snapshots(self):
        setup = self.session()
        try:
            owner = self._user(setup, "owner")
            task_id = self._task(setup, owner).id
        finally:
            setup.close()

        first = self.session()
        second = self.session()
        # 两个事务都先持有同一旧版本；后执行者也不能把这个 Python 旧值写回。
        first_snapshot = first.get(MonitorTask, task_id)
        second_snapshot = second.get(MonitorTask, task_id)
        self.assertEqual(first_snapshot.config_version, 1)
        self.assertEqual(second_snapshot.config_version, 1)
        barrier = threading.Barrier(2)
        errors = []

        def rename(db, name):
            try:
                barrier.wait(timeout=10)
                updated = update_monitor_task(db, task_id, MonitorTaskUpdate(name=name))
                self.assertIsNotNone(updated)
            except BaseException as exc:  # 线程异常必须传回主测试线程。
                errors.append(exc)
            finally:
                db.close()

        threads = [
            threading.Thread(target=rename, args=(first, "first")),
            threading.Thread(target=rename, args=(second, "second")),
        ]
        for thread in threads:
            thread.start()
        for thread in threads:
            thread.join(timeout=20)
            self.assertFalse(thread.is_alive())
        self.assertEqual(errors, [])

        db = self.session()
        try:
            row = db.get(MonitorTask, task_id)
            self.assertEqual(row.config_version, 3)
            self.assertIn(row.name, {"first", "second"})
        finally:
            db.close()

    def test_last_enabled_admin_rejects_demotion_and_deactivation(self):
        db = self.session()
        try:
            admin = self._user(db, "only-admin", is_admin=True)
            for payload in (UserUpdate(is_admin=False), UserUpdate(is_active=False)):
                with self.subTest(fields=payload.model_fields_set):
                    with self.assertRaises(ServiceError) as raised:
                        user_service.update_user(db, admin.id, payload)
                    self.assertEqual(raised.exception.status_code, 409)
                    db.refresh(admin)
                    self.assertTrue(admin.is_admin)
                    self.assertTrue(admin.is_active)
        finally:
            db.close()

    def test_concurrent_demotion_and_deactivation_leave_one_enabled_admin(self):
        setup = self.session()
        try:
            first_id = self._user(setup, "admin-one", is_admin=True).id
            second_id = self._user(setup, "admin-two", is_admin=True).id
        finally:
            setup.close()

        first = self.session()
        second = self.session()
        # 预加载让两个请求都在任何并发降级前完成读取和授权所依赖的快照。
        first_admin = first.get(User, first_id)
        second_admin = second.get(User, second_id)
        self.assertTrue(first_admin.is_admin)
        self.assertTrue(second_admin.is_admin)
        barrier = threading.Barrier(2)
        outcomes = []
        errors = []

        def change_role(db, user_id, payload):
            try:
                barrier.wait(timeout=10)
                user_service.update_user(db, user_id, payload)
                outcomes.append(200)
            except ServiceError as exc:
                outcomes.append(exc.status_code)
            except BaseException as exc:
                errors.append(exc)
            finally:
                db.close()

        # 两个线程必须都完成服务层读取并到达 UPDATE，数据库才能继续执行任一写入。
        from sqlalchemy import event

        from app.db.database import engine

        def interleave_admin_updates(conn, cursor, statement, parameters, context, executemany):
            compact = "".join(statement.lower().split())
            if compact.startswith("updateusersset") and ("is_admin=" in compact or "is_active=" in compact):
                barrier.wait(timeout=10)

        event.listen(engine, "before_cursor_execute", interleave_admin_updates)
        threads = [
            threading.Thread(target=change_role, args=(first, first_id, UserUpdate(is_admin=False))),
            threading.Thread(target=change_role, args=(second, second_id, UserUpdate(is_active=False))),
        ]
        try:
            for thread in threads:
                thread.start()
            for thread in threads:
                thread.join(timeout=20)
        finally:
            event.remove(engine, "before_cursor_execute", interleave_admin_updates)
        for thread in threads:
            self.assertFalse(thread.is_alive())
        self.assertEqual(errors, [])
        self.assertCountEqual(outcomes, [200, 409])

        db = self.session()
        try:
            enabled_admins = db.query(User).filter(User.is_admin.is_(True), User.is_active.is_(True)).all()
            self.assertEqual(len(enabled_admins), 1)
            self.assertIn(enabled_admins[0].id, {first_id, second_id})
        finally:
            db.close()

    def test_test_task_closes_request_db_before_positional_collection(self):
        db = self.session()
        owner = self._user(db, "owner")
        task = self._task(db, owner)
        expected = (task.id, task.url, task.xpath)

        with mock.patch.object(db, "close", wraps=db.close) as close:
            with mock.patch.object(MonitorService, "test_task") as collect:
                def collected(*args):
                    close.assert_called_once_with()
                    self.assertEqual(args, expected)
                    return {"success": True, "content": "value", "title": "title", "url": task.url}

                collect.side_effect = collected
                response = task_service.test_task(db, task.id, owner)
                self.assertEqual(response["content"], "value")
                collect.assert_called_once_with(*expected)
            close.assert_called_once_with()

    def test_every_list_route_exposes_bounded_skip_and_limit(self):
        import main

        schema = main.app.openapi()
        paths = (
            "/api/monitor-tasks",
            "/api/email-configs",
            "/api/email-configs/simple-list",
            "/api/blacklist-domains",
            "/api/public-tasks",
            "/api/subscriptions",
            "/api/auth/users",
        )
        for path in paths:
            with self.subTest(path=path):
                parameters = {
                    parameter["name"]: parameter
                    for parameter in schema["paths"][path]["get"]["parameters"]
                }
                self.assertEqual(parameters["skip"]["schema"]["minimum"], 0)
                self.assertEqual(parameters["limit"]["schema"]["minimum"], 1)
                self.assertEqual(parameters["limit"]["schema"]["maximum"], 100)


if __name__ == "__main__":
    unittest.main()
