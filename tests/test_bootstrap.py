"""启动引导与配置校验。

Settings 测试用 `_env_file=None` 显式跳过 .env，避免读到开发者本地配置。
"""
import os
import sys
import unittest
from unittest import mock

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import support  # noqa: E402

support.bootstrap_environment()

import logging  # noqa: E402

from pydantic import ValidationError  # noqa: E402
from sqlalchemy import create_engine  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402

from app.core.config import FORBIDDEN_SECRET_KEYS, Settings  # noqa: E402
from app.core.passwords import validate_password  # noqa: E402
from app.db.models import Base, User  # noqa: E402
from app.services import bootstrap as bootstrap_module  # noqa: E402


def make_settings(**overrides) -> Settings:
    """构造一个既不读 .env、也不受进程环境影响的 Settings。"""
    values = {
        "SECRET_KEY": "k" * 48,
        "ADMIN_PASSWORD": "bootstrap-pass-1",
        "_env_file": None,
    }
    values.update(overrides)

    with mock.patch.dict(os.environ, {}, clear=True):
        return Settings(**values)


class SettingsTestCase(unittest.TestCase):
    def test_secret_key_is_required(self):
        with self.assertRaises(ValidationError):
            make_settings(SECRET_KEY=None)

    def test_secret_key_must_be_long_enough(self):
        with self.assertRaises(ValidationError):
            make_settings(SECRET_KEY="short")

    def test_example_secret_keys_are_rejected(self):
        for example in FORBIDDEN_SECRET_KEYS:
            with self.assertRaises(ValidationError, msg=example):
                make_settings(SECRET_KEY=example)

    def test_secret_key_is_not_leaked_in_errors(self):
        try:
            make_settings(SECRET_KEY="too-short-secret")
        except ValidationError as exc:
            self.assertNotIn("too-short-secret", str(exc))
        else:
            self.fail("应当拒绝过短的 SECRET_KEY")

    def test_admin_password_is_optional(self):
        settings = make_settings(ADMIN_PASSWORD=None)
        self.assertIsNone(settings.ADMIN_PASSWORD)

    def test_defaults_match_compose(self):
        settings = make_settings()
        self.assertEqual(settings.ADMIN_USERNAME, "admin")
        self.assertEqual(settings.ADMIN_EMAIL, "admin@example.com")
        self.assertEqual(settings.FRONTEND_DIST, "web")
        self.assertEqual(settings.SMTP_PORT, 465)

    def test_removed_settings_are_gone(self):
        settings = make_settings()
        for removed in (
            "LOG_FILE",
            "DEFAULT_CHECK_INTERVAL",
            "MAX_CHECK_INTERVAL",
            "MIN_CHECK_INTERVAL",
            "SELENIUM_HEADLESS",
            "SELENIUM_TIMEOUT",
        ):
            self.assertFalse(hasattr(settings, removed), removed)

    def test_smtp_password_is_secret(self):
        settings = make_settings(SMTP_PASSWORD="super-secret")
        self.assertNotIn("super-secret", repr(settings))
        self.assertEqual(settings.SMTP_PASSWORD.get_secret_value(), "super-secret")

    def test_extra_environment_variables_are_ignored(self):
        # 进程环境里通常有一堆无关变量，不能因此启动失败
        settings = make_settings(SOME_UNRELATED_VARIABLE="value")
        self.assertEqual(settings.APP_NAME, "WebMonitor")


class PasswordPolicyTestCase(unittest.TestCase):
    def test_minimum_length(self):
        with self.assertRaises(ValueError):
            validate_password("12345")
        self.assertEqual(validate_password("123456"), "123456")

    def test_byte_limit_not_character_limit(self):
        # 24 个三字节汉字 = 72 字节，正好通过
        validate_password("密" * 24)
        with self.assertRaises(ValueError):
            validate_password("密" * 25)

    def test_hash_does_not_truncate(self):
        from app.services.auth_service import get_password_hash

        with self.assertRaises(ValueError):
            get_password_hash("密" * 25)

    def test_verify_password_survives_bad_hash(self):
        from app.services.auth_service import verify_password

        self.assertFalse(verify_password("x", "not-a-bcrypt-hash"))
        self.assertFalse(verify_password("密" * 30, "$2b$12$invalid"))


class BootstrapTestCase(unittest.TestCase):
    def setUp(self):
        state = support.bootstrap_environment()
        self.tmpdir = support.tempfile.mkdtemp(prefix="boot-", dir=state["tmpdir"])
        self.engine = create_engine(
            f"sqlite:///{os.path.join(self.tmpdir, 'db.sqlite')}",
            connect_args={"check_same_thread": False},
        )
        Base.metadata.create_all(bind=self.engine)
        self.Session = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
        self.db = self.Session()

    def tearDown(self):
        self.db.close()
        self.engine.dispose()
        support.shutil.rmtree(self.tmpdir, ignore_errors=True)

    def test_missing_admin_password_fails_startup(self):
        with mock.patch.object(bootstrap_module.settings, "ADMIN_PASSWORD", None):
            with self.assertRaises(bootstrap_module.BootstrapError) as ctx:
                bootstrap_module.create_default_admin(self.db)
        self.assertIn("ADMIN_PASSWORD", str(ctx.exception))
        self.assertEqual(self.db.query(User).count(), 0)

    def test_empty_admin_password_fails_startup(self):
        from pydantic import SecretStr

        with mock.patch.object(bootstrap_module.settings, "ADMIN_PASSWORD", SecretStr("")):
            with self.assertRaises(bootstrap_module.BootstrapError):
                bootstrap_module.create_default_admin(self.db)

    def test_invalid_admin_password_fails_startup(self):
        from pydantic import SecretStr

        with mock.patch.object(bootstrap_module.settings, "ADMIN_PASSWORD", SecretStr("123")):
            with self.assertRaises(bootstrap_module.BootstrapError) as ctx:
                bootstrap_module.create_default_admin(self.db)
        self.assertIn("ADMIN_PASSWORD", str(ctx.exception))
        self.assertNotIn("123", str(ctx.exception).replace("ADMIN_PASSWORD", ""))

    def test_creates_admin_with_configured_identity(self):
        from pydantic import SecretStr

        with mock.patch.object(bootstrap_module.settings, "ADMIN_PASSWORD", SecretStr("bootstrap-pass-1")), \
             mock.patch.object(bootstrap_module.settings, "ADMIN_USERNAME", "root-admin"), \
             mock.patch.object(bootstrap_module.settings, "ADMIN_EMAIL", "root@example.com"):
            created = bootstrap_module.create_default_admin(self.db)

        self.assertTrue(created)

        admin = self.db.query(User).filter(User.is_admin == True).one()  # noqa: E712
        self.assertEqual(admin.username, "root-admin")
        self.assertEqual(admin.email, "root@example.com")
        self.assertTrue(admin.is_active)
        self.assertEqual(admin.max_subscriptions, 10)

        from app.services.auth_service import verify_password

        self.assertTrue(verify_password("bootstrap-pass-1", admin.hashed_password))

    def test_existing_admin_is_not_reset(self):
        from app.services.auth_service import get_password_hash, verify_password

        self.db.add(
            User(
                username="existing",
                email="existing@example.com",
                hashed_password=get_password_hash("existing-pass-1"),
                is_active=True,
                is_admin=True,
                max_subscriptions=10,
            )
        )
        self.db.commit()

        with mock.patch.object(bootstrap_module.settings, "ADMIN_PASSWORD", None):
            # 已有管理员时不需要引导密码
            created = bootstrap_module.create_default_admin(self.db)

        self.assertFalse(created)
        admin = self.db.query(User).filter(User.is_admin == True).one()  # noqa: E712
        self.assertEqual(admin.username, "existing")
        self.assertTrue(verify_password("existing-pass-1", admin.hashed_password))

    def test_username_conflict_fails_startup(self):
        from pydantic import SecretStr

        self.db.add(
            User(
                username="admin",
                email="someone-else@example.com",
                hashed_password="x",
                is_active=True,
                is_admin=False,
                max_subscriptions=10,
            )
        )
        self.db.commit()

        with mock.patch.object(bootstrap_module.settings, "ADMIN_PASSWORD", SecretStr("bootstrap-pass-1")):
            with self.assertRaises(bootstrap_module.BootstrapError) as ctx:
                bootstrap_module.create_default_admin(self.db)

        self.assertIn("admin", str(ctx.exception))
        self.assertEqual(self.db.query(User).filter(User.is_admin == True).count(), 0)  # noqa: E712

    def test_email_conflict_fails_startup(self):
        from pydantic import SecretStr

        with mock.patch.object(bootstrap_module.settings, "ADMIN_EMAIL", "taken@example.com"):
            self.db.add(
                User(
                    username="someone",
                    email="taken@example.com",
                    hashed_password="x",
                    is_active=True,
                    is_admin=False,
                    max_subscriptions=10,
                )
            )
            self.db.commit()

            with mock.patch.object(bootstrap_module.settings, "ADMIN_PASSWORD", SecretStr("bootstrap-pass-1")):
                with self.assertRaises(bootstrap_module.BootstrapError):
                    bootstrap_module.create_default_admin(self.db)

    def test_logs_never_contain_the_password(self):
        from pydantic import SecretStr

        with mock.patch.object(bootstrap_module.settings, "ADMIN_PASSWORD", SecretStr("bootstrap-pass-1")):
            with self.assertLogs("app.services.bootstrap", level="INFO") as captured:
                bootstrap_module.create_default_admin(self.db)

        joined = "\n".join(captured.output)
        self.assertNotIn("bootstrap-pass-1", joined)
        self.assertIn("admin", joined)


if __name__ == "__main__":
    unittest.main()
