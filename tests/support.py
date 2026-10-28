"""
隔离测试设施。

约束：
- 环境变量必须在任何 `app.*` / `main` 导入之前设置好，因为 `Settings` 在 import
  时就实例化，`db.database` 也在 import 时创建 engine。所以调用方第一件事是
  `import support; support.bootstrap_environment()`，之后才 import 应用模块。
- 数据库永远是临时目录里的 SQLite，绝不碰真实业务库。
- 不走宿主代理：`urllib` 一律装空的 ProxyHandler，否则 loopback 会被代理劫持。
"""
import atexit
import json
import os
import shutil
import socket
import sys
import tempfile
import threading
import time
import unittest
import urllib.error
import urllib.request

TESTS_DIR = os.path.dirname(os.path.abspath(__file__))


def _backend_dir() -> str:
    """仓库布局是 `backend/main.py`；镜像布局是 `/app/main.py` + `/app/app/`。"""
    candidate = os.path.abspath(os.path.join(TESTS_DIR, "..", "backend"))
    if os.path.isfile(os.path.join(candidate, "main.py")):
        return candidate
    return os.path.abspath(os.path.join(TESTS_DIR, ".."))


BACKEND_DIR = _backend_dir()
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

_STATE = {}


def _free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind(("127.0.0.1", 0))
        return sock.getsockname()[1]


def bootstrap_environment() -> dict:
    """设置进程级测试环境；重复调用返回同一份状态。"""
    if _STATE:
        return _STATE

    tmpdir = tempfile.mkdtemp(prefix="webmonitor-test-")
    db_path = os.path.join(tmpdir, "test.db")

    os.environ.update(
        {
            "SECRET_KEY": "t" * 48,
            "ADMIN_USERNAME": "admin",
            "ADMIN_EMAIL": "admin@example.com",
            "ADMIN_PASSWORD": "test-admin-pass-1",
            "DATABASE_URL": f"sqlite:///{db_path}",
            "FRONTEND_DIST": os.path.join(tmpdir, "no-frontend"),
            "LOG_LEVEL": "WARNING",
        }
    )

    _STATE.update(
        {
            "tmpdir": tmpdir,
            "db_path": db_path,
            "database_url": f"sqlite:///{db_path}",
            "secret_key": "t" * 48,
            "admin_password": "test-admin-pass-1",
        }
    )

    atexit.register(lambda: shutil.rmtree(tmpdir, ignore_errors=True))
    return _STATE


def temp_database_url() -> str:
    """为单个测试创建独立的临时 SQLite URL。"""
    directory = tempfile.mkdtemp(prefix="webmonitor-db-", dir=_STATE.get("tmpdir"))
    atexit.register(lambda: shutil.rmtree(directory, ignore_errors=True))
    return f"sqlite:///{os.path.join(directory, 'db.sqlite')}"


class HttpResponse:
    def __init__(self, status: int, body, headers):
        self.status = status
        self.body = body
        self.headers = headers

    def json(self):
        return json.loads(self.body) if self.body else None


class HttpServer:
    """真实 uvicorn 线程 + 预绑定 loopback 端口。"""

    def __init__(self, app):
        import uvicorn

        self.port = _free_port()
        config = uvicorn.Config(
            app,
            host="127.0.0.1",
            port=self.port,
            log_level="warning",
            access_log=False,
            lifespan="on",
        )
        self.server = uvicorn.Server(config)
        self.thread = threading.Thread(target=self.server.run, daemon=True)

    def __enter__(self):
        self.thread.start()
        deadline = time.monotonic() + 30
        while time.monotonic() < deadline:
            if getattr(self.server, "started", False):
                return self
            if not self.thread.is_alive():
                break
            time.sleep(0.02)
        raise RuntimeError("uvicorn 未能在 30 秒内启动")

    def __exit__(self, exc_type, exc, tb):
        self.server.should_exit = True
        self.thread.join(timeout=30)
        return False

    @property
    def base_url(self) -> str:
        return f"http://127.0.0.1:{self.port}"

    def request(self, method: str, path: str, *, token=None, json_body=None, data=None, headers=None, params=None):
        from urllib.parse import urlencode

        url = f"{self.base_url}{path}"
        if params:
            url = f"{url}?{urlencode(params)}"

        request_headers = dict(headers or {})
        payload = None

        if json_body is not None:
            payload = json.dumps(json_body).encode("utf-8")
            request_headers.setdefault("Content-Type", "application/json")
        elif data is not None:
            payload = urlencode(data).encode("utf-8")
            request_headers.setdefault("Content-Type", "application/x-www-form-urlencoded")

        if token:
            request_headers["Authorization"] = f"Bearer {token}"

        request = urllib.request.Request(url, data=payload, headers=request_headers, method=method)

        # 空 ProxyHandler：宿主 http_proxy 不能劫持 loopback 请求
        opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
        try:
            with opener.open(request, timeout=30) as response:
                return HttpResponse(response.status, response.read().decode("utf-8"), dict(response.headers))
        except urllib.error.HTTPError as exc:
            return HttpResponse(exc.code, exc.read().decode("utf-8"), dict(exc.headers or {}))

    def get(self, path, **kwargs):
        return self.request("GET", path, **kwargs)

    def post(self, path, **kwargs):
        return self.request("POST", path, **kwargs)

    def put(self, path, **kwargs):
        return self.request("PUT", path, **kwargs)

    def delete(self, path, **kwargs):
        return self.request("DELETE", path, **kwargs)


def login(server: HttpServer, username: str, password: str):
    response = server.post("/api/auth/login", data={"username": username, "password": password})
    if response.status != 200:
        raise AssertionError(f"登录失败 {username}: {response.status} {response.body}")
    payload = response.json()
    return payload["access_token"], payload["user"]


class DatabaseTestCase(unittest.TestCase):
    """需要 app 已导入的测试基类：每个用例自己清空专用数据。"""

    @classmethod
    def setUpClass(cls):
        from app.db.database import Base, engine

        Base.metadata.create_all(bind=engine)

    def session(self):
        from app.db.database import SessionLocal

        return SessionLocal()

    def clear_data(self):
        """只清业务行，保留表结构。"""
        from app.db.models import (
            BlacklistDomain,
            EmailConfig,
            MonitorLog,
            MonitorTask,
            TaskSubscription,
            User,
        )

        db = self.session()
        try:
            db.query(TaskSubscription).delete()
            db.query(MonitorLog).delete()
            db.query(MonitorTask).delete()
            db.query(EmailConfig).delete()
            db.query(BlacklistDomain).delete()
            db.query(User).delete()
            db.commit()
        finally:
            db.close()
