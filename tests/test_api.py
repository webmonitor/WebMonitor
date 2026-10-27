"""HTTP 行为：认证、归属隔离、日志分页、公开任务、邮件配置、订阅。"""
import os
import sys
import unittest
from datetime import datetime
from unittest import mock

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import support  # noqa: E402

support.bootstrap_environment()

import main  # noqa: E402
from app.db.models import EmailConfig, MonitorLog, MonitorTask, TaskSubscription, User  # noqa: E402


def _header(response, name):
    """大小写无关地读响应头。"""
    for key, value in response.headers.items():
        if key.lower() == name:
            return value
    return None


class ApiTestCase(unittest.TestCase):
    """整个类共享一个真实进程内的 app + scheduler（lifespan 只进出一次）。"""

    @classmethod
    def setUpClass(cls):
        cls.server = support.HttpServer(main.app).__enter__()

    @classmethod
    def tearDownClass(cls):
        cls.server.__exit__(None, None, None)

    def setUp(self):
        from app.db.database import SessionLocal
        from app.services.scheduler import monitor_scheduler

        db = SessionLocal()
        try:
            db.query(TaskSubscription).delete()
            db.query(MonitorLog).delete()
            db.query(MonitorTask).delete()
            db.query(EmailConfig).delete()
            db.query(User).delete()
            db.commit()
        finally:
            db.close()

        # 每次清库后让调度器看到真实状态，避免残留作业
        monitor_scheduler.sync_tasks()

        self.admin_token, self.admin = self._create_and_login("admin", "admin@example.com", "admin-pass-1", is_admin=True)
        self.alice_token, self.alice = self._create_and_login("alice", "alice@example.com", "alice-pass-1")
        self.bob_token, self.bob = self._create_and_login("bob", "bob@example.com", "bob-pass-1")

    # --- helpers -----------------------------------------------------------
    def _create_and_login(self, username, email, password, is_admin=False):
        from app.db.crud import create_user as create_user_row
        from app.db.database import SessionLocal
        from app.schemas.schemas import UserCreate

        db = SessionLocal()
        try:
            create_user_row(
                db,
                UserCreate(
                    username=username,
                    email=email,
                    password=password,
                    is_admin=is_admin,
                    is_active=True,
                    max_subscriptions=10,
                ),
            )
        finally:
            db.close()

        return support.login(self.server, username, password)

    def _email_config(self, token, name="cfg", receiver="r@example.com"):
        response = self.server.post(
            "/api/email-configs",
            token=token,
            json_body={
                "name": name,
                "smtp_server": "smtp.example.test",
                "smtp_port": 2525,
                "smtp_user": "u@example.com",
                "smtp_password": "smtp-secret-1",
                "receiver_email": receiver,
                "is_ssl": False,
            },
        )
        self.assertEqual(response.status, 200, response.body)
        return response.json()["id"]

    def _task(self, token, config_id, **overrides):
        payload = {
            "name": "task",
            "url": "http://example.test/a",
            "xpath": "//div[@id='value']",
            "interval": 60,
            "is_active": True,
            "is_public": False,
            "description": "desc",
            "email_config_id": config_id,
        }
        payload.update(overrides)
        response = self.server.post("/api/monitor-tasks", token=token, json_body=payload)
        self.assertEqual(response.status, 200, response.body)
        return response.json()

    # --- authentication ----------------------------------------------------
    def test_register_rejects_privileged_fields(self):
        response = self.server.post(
            "/api/auth/register",
            json_body={
                "username": "mallory",
                "email": "m@example.com",
                "password": "secret123",
                "is_admin": True,
            },
        )
        self.assertEqual(response.status, 422)

    def test_register_creates_regular_user_only(self):
        response = self.server.post(
            "/api/auth/register",
            json_body={"username": "carol", "email": "carol@example.com", "password": "secret123"},
        )
        self.assertEqual(response.status, 201, response.body)
        body = response.json()
        self.assertFalse(body["is_admin"])
        self.assertTrue(body["is_active"])
        self.assertEqual(body["max_subscriptions"], 10)
        self.assertNotIn("password", body)
        self.assertNotIn("hashed_password", body)

    def test_admin_can_create_user_with_role_and_quota(self):
        response = self.server.post(
            "/api/auth/users",
            token=self.admin_token,
            json_body={
                "username": "dave",
                "email": "dave@example.com",
                "password": "secret123",
                "is_admin": True,
                "max_subscriptions": 3,
            },
        )
        self.assertEqual(response.status, 201, response.body)
        self.assertTrue(response.json()["is_admin"])
        self.assertEqual(response.json()["max_subscriptions"], 3)

    def test_non_admin_cannot_create_users(self):
        response = self.server.post(
            "/api/auth/users",
            token=self.alice_token,
            json_body={"username": "eve", "email": "eve@example.com", "password": "secret123"},
        )
        self.assertEqual(response.status, 403)

    def test_duplicate_registration_is_conflict(self):
        response = self.server.post(
            "/api/auth/register",
            json_body={"username": "alice", "email": "other@example.com", "password": "secret123"},
        )
        self.assertEqual(response.status, 409)

        response = self.server.post(
            "/api/auth/register",
            json_body={"username": "other", "email": "alice@example.com", "password": "secret123"},
        )
        self.assertEqual(response.status, 409)

    def test_login_rejects_bad_password(self):
        response = self.server.post("/api/auth/login", data={"username": "alice", "password": "wrong"})
        self.assertEqual(response.status, 401)

    def test_missing_or_malformed_token_is_unauthorized(self):
        self.assertEqual(self.server.get("/api/monitor-tasks").status, 401)

        for token in ("not-a-jwt", self._signed({"sub": "abc"}), self._signed({"sub": "0"}), self._signed({})):
            response = self.server.get("/api/monitor-tasks", token=token)
            self.assertEqual(response.status, 401, token)
            self.assertEqual(_header(response, "www-authenticate"), "Bearer")

    def test_expired_token_is_unauthorized(self):
        from datetime import timedelta

        from app.services.auth_service import create_access_token

        expired = create_access_token({"sub": str(self.alice["id"])}, expires_delta=timedelta(seconds=-10))
        self.assertEqual(self.server.get("/api/auth/me", token=expired).status, 401)

    def test_deactivated_user_is_rejected(self):
        from app.db.database import SessionLocal

        db = SessionLocal()
        try:
            user = db.query(User).filter(User.id == self.bob["id"]).first()
            user.is_active = False
            db.commit()
        finally:
            db.close()

        self.assertEqual(self.server.get("/api/auth/me", token=self.bob_token).status, 403)
        self.assertEqual(
            self.server.post("/api/auth/login", data={"username": "bob", "password": "bob-pass-1"}).status,
            401,
        )

    def test_token_claim_cannot_grant_admin(self):
        forged = self._signed({"sub": str(self.alice["id"]), "is_admin": True})
        response = self.server.get("/api/auth/users", token=forged)
        self.assertEqual(response.status, 403)

    def test_removed_endpoints_are_gone(self):
        self.assertEqual(self.server.post("/api/auth/logout", token=self.alice_token).status, 404)
        self.assertEqual(self.server.post("/api/test-email", token=self.alice_token).status, 404)

    def _signed(self, payload):
        from app.services.auth_service import create_access_token

        return create_access_token(payload)

    # --- task ownership ----------------------------------------------------
    def test_private_task_endpoints_are_scoped(self):
        config_id = self._email_config(self.alice_token)
        task = self._task(self.alice_token, config_id)
        path = f"/api/monitor-tasks/{task['id']}"

        self.assertEqual(self.server.get(path).status, 401)
        self.assertEqual(self.server.get(path, token=self.bob_token).status, 403)
        self.assertEqual(self.server.put(path, token=self.bob_token, json_body={"name": "x"}).status, 403)
        self.assertEqual(self.server.delete(path, token=self.bob_token).status, 403)

        # 管理员也不能通过私人端点读他人任务
        self.assertEqual(self.server.get(path, token=self.admin_token).status, 403)

        with mock.patch("app.services.monitor_service.MonitorService.test_task") as test_task:
            response = self.server.post(f"{path}/test", token=self.bob_token)
            self.assertEqual(response.status, 403)
            self.assertEqual(test_task.call_count, 0)

        self.assertEqual(self.server.get(path, token=self.alice_token).status, 200)

    def test_latest_logs_exclude_other_users(self):
        alice_config = self._email_config(self.alice_token)
        bob_config = self._email_config(self.bob_token)
        alice_task = self._task(self.alice_token, alice_config, name="alice-task")
        bob_task = self._task(self.bob_token, bob_config, name="bob-task")

        from app.db.database import SessionLocal

        db = SessionLocal()
        try:
            for index in range(3):
                db.add(
                    MonitorLog(
                        task_id=alice_task["id"],
                        old_content=f"a{index}",
                        new_content=f"a{index + 1}",
                        is_changed=True,
                        check_time=datetime(2024, 1, 1, 12, index, 0),
                    )
                )
                db.add(
                    MonitorLog(
                        task_id=bob_task["id"],
                        old_content=f"b{index}",
                        new_content=f"b{index + 1}",
                        is_changed=True,
                        check_time=datetime(2024, 1, 1, 12, index, 0),
                    )
                )
            db.commit()
        finally:
            db.close()

        self.assertEqual(self.server.get("/api/monitor-logs/latest").status, 401)

        response = self.server.get("/api/monitor-logs/latest", token=self.alice_token)
        self.assertEqual(response.status, 200)
        logs = response.json()
        self.assertEqual(len(logs), 3)
        self.assertTrue(all(log["task_id"] == alice_task["id"] for log in logs))

    def test_log_pagination_is_stable_and_counted(self):
        config_id = self._email_config(self.alice_token)
        task = self._task(self.alice_token, config_id)

        from app.db.database import SessionLocal

        fixed_time = datetime(2024, 5, 1, 9, 0, 0)
        db = SessionLocal()
        try:
            for index in range(5):
                db.add(
                    MonitorLog(
                        task_id=task["id"],
                        old_content=f"o{index}",
                        new_content=f"n{index}",
                        is_changed=True,
                        check_time=fixed_time,
                    )
                )
            db.commit()
        finally:
            db.close()

        seen = []
        for page in (1, 2, 3):
            response = self.server.get(
                f"/api/monitor-tasks/{task['id']}/logs",
                token=self.alice_token,
                params={"page": page, "limit": 2},
            )
            self.assertEqual(response.status, 200, response.body)
            body = response.json()
            self.assertEqual(body["total"], 5)
            self.assertEqual(len(body["logs"]), [2, 2, 1][page - 1])
            seen.extend(log["id"] for log in body["logs"])

        self.assertEqual(len(seen), 5)
        self.assertEqual(len(set(seen)), 5)
        self.assertEqual(seen, sorted(seen, reverse=True))

        empty = self.server.get(
            f"/api/monitor-tasks/{task['id']}/logs",
            token=self.alice_token,
            params={"page": 9, "limit": 2},
        ).json()
        self.assertEqual(empty["logs"], [])
        self.assertEqual(empty["total"], 5)

        for params in ({"page": 0}, {"page": 1, "limit": 0}, {"page": 1, "limit": 101}):
            self.assertEqual(
                self.server.get(
                    f"/api/monitor-tasks/{task['id']}/logs", token=self.alice_token, params=params
                ).status,
                422,
                params,
            )

        self.assertEqual(
            self.server.get(f"/api/monitor-tasks/{task['id']}/logs", params={"page": 1}).status,
            401,
        )
        self.assertEqual(
            self.server.get(f"/api/monitor-tasks/{task['id']}/logs", token=self.bob_token).status,
            403,
        )

    def test_create_task_persists_public_flag_and_description(self):
        config_id = self._email_config(self.alice_token)
        task = self._task(
            self.alice_token,
            config_id,
            is_public=True,
            description="public description",
        )
        self.assertTrue(task["is_public"])
        self.assertEqual(task["description"], "public description")

    def test_update_rejects_null_for_required_columns(self):
        config_id = self._email_config(self.alice_token)
        task = self._task(self.alice_token, config_id)

        for field in ("name", "url", "xpath", "interval", "is_active", "is_public"):
            response = self.server.put(
                f"/api/monitor-tasks/{task['id']}", token=self.alice_token, json_body={field: None}
            )
            self.assertEqual(response.status, 422, field)

        # description / email_config_id 允许显式 null
        response = self.server.put(
            f"/api/monitor-tasks/{task['id']}",
            token=self.alice_token,
            json_body={"description": None, "email_config_id": None},
        )
        self.assertEqual(response.status, 200, response.body)
        self.assertIsNone(response.json()["description"])
        self.assertIsNone(response.json()["email_config_id"])

    def test_blacklist_blocks_regular_user_only(self):
        from app.db.database import SessionLocal
        from app.db.models import BlacklistDomain

        config_id = self._email_config(self.alice_token)
        db = SessionLocal()
        try:
            db.add(
                BlacklistDomain(
                    domain="blocked.example.test",
                    description="blocked",
                    is_active=True,
                    created_by=self.admin["id"],
                )
            )
            db.commit()
        finally:
            db.close()

        payload = {
            "name": "blocked",
            "url": "http://blocked.example.test/page",
            "xpath": "//div",
            "interval": 60,
            "email_config_id": config_id,
        }
        response = self.server.post("/api/monitor-tasks", token=self.alice_token, json_body=payload)
        self.assertEqual(response.status, 403)
        self.assertIn("黑名单", response.json()["detail"])

        admin_config = self._email_config(self.admin_token)
        payload["email_config_id"] = admin_config
        self.assertEqual(self.server.post("/api/monitor-tasks", token=self.admin_token, json_body=payload).status, 200)

    # --- public tasks ------------------------------------------------------
    def test_public_task_detail_hides_private_fields(self):
        config_id = self._email_config(self.alice_token)
        task = self._task(self.alice_token, config_id, is_public=True, description="shared")

        response = self.server.get(f"/api/public-tasks/{task['id']}", token=self.bob_token)
        self.assertEqual(response.status, 200, response.body)
        body = response.json()
        for hidden in ("xpath", "last_content", "email_config_id", "owner_id"):
            self.assertNotIn(hidden, body)
        self.assertEqual(body["owner_username"], "alice")
        self.assertEqual(body["interval"], 60)

        self.server.put(
            f"/api/monitor-tasks/{task['id']}", token=self.alice_token, json_body={"is_public": False}
        )
        self.assertEqual(self.server.get(f"/api/public-tasks/{task['id']}", token=self.bob_token).status, 404)

        self.server.put(
            f"/api/monitor-tasks/{task['id']}",
            token=self.alice_token,
            json_body={"is_public": True, "is_active": False},
        )
        self.assertEqual(self.server.get(f"/api/public-tasks/{task['id']}", token=self.bob_token).status, 404)

    def test_public_list_counts_only_active_subscriptions(self):
        config_id = self._email_config(self.alice_token)
        task = self._task(self.alice_token, config_id, is_public=True)
        idle = self._task(self.alice_token, config_id, is_public=True, name="idle")

        # 订阅需要 bob 自己有一个邮箱配置（默认配置规则）
        self._email_config(self.bob_token, name="bob-cfg", receiver="bob@example.com")

        toggle = self.server.post(f"/api/subscriptions/{task['id']}/toggle", token=self.bob_token)
        self.assertEqual(toggle.status, 200, toggle.body)

        listing = self.server.get("/api/public-tasks", token=self.bob_token).json()
        by_id = {item["id"]: item for item in listing}
        self.assertEqual(by_id[task["id"]]["subscription_count"], 1)
        self.assertTrue(by_id[task["id"]]["user_subscribed"])
        self.assertEqual(by_id[idle["id"]]["subscription_count"], 0)

        self.server.post(f"/api/subscriptions/{task['id']}/toggle", token=self.bob_token)
        listing = self.server.get("/api/public-tasks", token=self.bob_token).json()
        by_id = {item["id"]: item for item in listing}
        self.assertEqual(by_id[task["id"]]["subscription_count"], 0)
        self.assertFalse(by_id[task["id"]]["user_subscribed"])


class EmailConfigApiTestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = support.HttpServer(main.app).__enter__()

    @classmethod
    def tearDownClass(cls):
        cls.server.__exit__(None, None, None)

    def setUp(self):
        from app.db.database import SessionLocal

        db = SessionLocal()
        try:
            db.query(TaskSubscription).delete()
            db.query(MonitorLog).delete()
            db.query(MonitorTask).delete()
            db.query(EmailConfig).delete()
            db.query(User).delete()
            db.commit()
        finally:
            db.close()

        self.owner_token, self.owner = self._user("owner", "owner@example.com")
        self.other_token, self.other = self._user("other", "other@example.com")

    def _user(self, username, email):
        from app.db.crud import create_user as create_user_row
        from app.db.database import SessionLocal
        from app.schemas.schemas import UserCreate

        db = SessionLocal()
        try:
            create_user_row(
                db,
                UserCreate(username=username, email=email, password="secret123", is_active=True),
            )
        finally:
            db.close()
        return support.login(self.server, username, "secret123")

    def _create_config(self, token, password="smtp-secret-1", receiver="me@example.com"):
        response = self.server.post(
            "/api/email-configs",
            token=token,
            json_body={
                "name": "cfg",
                "smtp_server": "smtp.example.test",
                "smtp_port": 2525,
                "smtp_user": "u@example.com",
                "smtp_password": password,
                "receiver_email": receiver,
                "is_ssl": False,
            },
        )
        self.assertEqual(response.status, 200, response.body)
        return response.json()["id"]

    def test_responses_never_include_password(self):
        config_id = self._create_config(self.owner_token)

        for response in (
            self.server.get("/api/email-configs", token=self.owner_token),
            self.server.get(f"/api/email-configs/{config_id}", token=self.owner_token),
            self.server.put(f"/api/email-configs/{config_id}", token=self.owner_token, json_body={"name": "renamed"}),
        ):
            self.assertEqual(response.status, 200, response.body)
            self.assertNotIn("smtp_password", response.body)

    def test_update_keeps_password_when_omitted(self):
        config_id = self._create_config(self.owner_token)

        self.assertEqual(
            self.server.put(f"/api/email-configs/{config_id}", token=self.owner_token, json_body={"name": "x"}).status,
            200,
        )

        from app.db.database import SessionLocal

        db = SessionLocal()
        try:
            config = db.query(EmailConfig).filter(EmailConfig.id == config_id).first()
            self.assertEqual(config.smtp_password, "smtp-secret-1")
        finally:
            db.close()

        self.assertEqual(
            self.server.put(
                f"/api/email-configs/{config_id}", token=self.owner_token, json_body={"smtp_password": "new-secret-2"}
            ).status,
            200,
        )

        db = SessionLocal()
        try:
            config = db.query(EmailConfig).filter(EmailConfig.id == config_id).first()
            self.assertEqual(config.smtp_password, "new-secret-2")
        finally:
            db.close()

    def test_empty_or_null_password_is_rejected(self):
        config_id = self._create_config(self.owner_token)

        for body in ({"smtp_password": ""}, {"smtp_password": None}):
            response = self.server.put(f"/api/email-configs/{config_id}", token=self.owner_token, json_body=body)
            self.assertEqual(response.status, 422, body)

        for body in ({"name": None}, {"smtp_server": None}, {"smtp_port": None}):
            response = self.server.put(f"/api/email-configs/{config_id}", token=self.owner_token, json_body=body)
            self.assertEqual(response.status, 422, body)

    def test_cross_user_access_is_forbidden(self):
        config_id = self._create_config(self.owner_token)

        self.assertEqual(self.server.get(f"/api/email-configs/{config_id}", token=self.other_token).status, 403)
        self.assertEqual(
            self.server.put(
                f"/api/email-configs/{config_id}", token=self.other_token, json_body={"name": "hijack"}
            ).status,
            403,
        )
        self.assertEqual(self.server.delete(f"/api/email-configs/{config_id}", token=self.other_token).status, 403)
        self.assertEqual(
            self.server.post(f"/api/email-configs/{config_id}/test", token=self.other_token).status, 403
        )

    def test_delete_is_blocked_while_referenced(self):
        config_id = self._create_config(self.owner_token)
        task = self.server.post(
            "/api/monitor-tasks",
            token=self.owner_token,
            json_body={
                "name": "t",
                "url": "http://example.test/a",
                "xpath": "//div",
                "interval": 60,
                "email_config_id": config_id,
            },
        )
        self.assertEqual(task.status, 200, task.body)
        task_id = task.json()["id"]

        response = self.server.delete(f"/api/email-configs/{config_id}", token=self.owner_token)
        self.assertEqual(response.status, 409)
        self.assertIn("引用", response.json()["detail"])

        from app.db.database import SessionLocal

        db = SessionLocal()
        try:
            self.assertIsNotNone(db.query(EmailConfig).filter(EmailConfig.id == config_id).first())
            row = db.query(MonitorTask).filter(MonitorTask.id == task_id).first()
            self.assertEqual(row.email_config_id, config_id)
        finally:
            db.close()

        self.assertEqual(self.server.delete(f"/api/monitor-tasks/{task_id}", token=self.owner_token).status, 200)
        self.assertEqual(self.server.delete(f"/api/email-configs/{config_id}", token=self.owner_token).status, 200)

    def test_delete_is_blocked_by_inactive_subscription_reference(self):
        config_id = self._create_config(self.owner_token, receiver="sub@example.com")

        from app.db.database import SessionLocal

        db = SessionLocal()
        try:
            owner_config = db.query(EmailConfig).filter(EmailConfig.id == config_id).first()
            owner_id = owner_config.user_id
            task = MonitorTask(
                name="shared",
                url="http://example.test/shared",
                xpath="//div",
                interval=60,
                is_active=True,
                is_public=True,
                owner_id=owner_id,
            )
            db.add(task)
            db.commit()
            db.refresh(task)
            db.add(
                TaskSubscription(
                    user_id=owner_id,
                    task_id=task.id,
                    is_active=False,
                    email_config_id=config_id,
                )
            )
            db.commit()
        finally:
            db.close()

        response = self.server.delete(f"/api/email-configs/{config_id}", token=self.owner_token)
        self.assertEqual(response.status, 409, response.body)

    def test_connection_failure_does_not_send_test_mail(self):
        config_id = self._create_config(self.owner_token)

        with mock.patch(
            "app.services.email_service.EmailService.test_email_connection_with_config",
            return_value={"success": False, "error": "邮件连接测试失败"},
        ), mock.patch("app.services.email_service.EmailService.send_test_email") as send_test:
            response = self.server.post(f"/api/email-configs/{config_id}/test", token=self.owner_token)
            self.assertEqual(response.status, 200, response.body)
            self.assertEqual(response.json(), {"success": False, "error": "邮件连接测试失败"})
            self.assertEqual(send_test.call_count, 0)

    def test_successful_connection_sends_exactly_one_test_mail(self):
        config_id = self._create_config(self.owner_token)

        with mock.patch(
            "app.services.email_service.EmailService.test_email_connection_with_config",
            return_value={"success": True, "message": "邮件连接测试成功"},
        ), mock.patch(
            "app.services.email_service.EmailService.send_test_email", return_value=True
        ) as send_test:
            response = self.server.post(f"/api/email-configs/{config_id}/test", token=self.owner_token)
            self.assertEqual(response.status, 200, response.body)
            self.assertEqual(response.json(), {"success": True, "message": "测试邮件发送成功"})
            self.assertEqual(send_test.call_count, 1)

    def test_test_mail_failure_reports_failure(self):
        config_id = self._create_config(self.owner_token)

        with mock.patch(
            "app.services.email_service.EmailService.test_email_connection_with_config",
            return_value={"success": True},
        ), mock.patch("app.services.email_service.EmailService.send_test_email", return_value=False):
            response = self.server.post(f"/api/email-configs/{config_id}/test", token=self.owner_token)
            self.assertEqual(response.status, 200)
            self.assertEqual(response.json(), {"success": False, "error": "测试邮件发送失败"})


if __name__ == "__main__":
    unittest.main()
