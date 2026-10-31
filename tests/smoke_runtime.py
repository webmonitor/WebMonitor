"""
真实行为验收（非产品入口）。

做四件真实的事：
1. 起一个本地 HTTP fixture 站点（/a、/b 两个页面各带一个 #value 元素）；
2. 起一个 loopback SMTP sink（STARTTLS + AUTH，邮件只在内存里）；
3. 用临时数据库启动真实 `main.app`（含 lifespan、调度器、Selenium 采集）；
4. 通过 HTTP 走完注册/登录/建配置/建任务/变更/停用/删除/测试邮件。

用法：
    python tests/smoke_runtime.py              # 默认：完整行为验收后退出
    python tests/smoke_runtime.py --serve      # 验收后保留服务，供浏览器验收
"""
import argparse
import base64
import json
import os
import random
import re
import secrets
import shutil
import socket
import socketserver
import ssl
import string
import subprocess
import sys
import tempfile
import threading
import time
import traceback
from datetime import datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlencode

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


def _frontend_dist() -> str:
    """镜像里是 /app/web；仓库里是 frontend/build。找不到就留空（SPA 不提供，API 照常）。"""
    candidates = [
        os.path.abspath(os.path.join(BACKEND_DIR, "web")),
        os.path.abspath(os.path.join(BACKEND_DIR, "..", "web")),
        os.path.abspath(os.path.join(TESTS_DIR, "..", "frontend", "build")),
    ]
    for candidate in candidates:
        if os.path.isfile(os.path.join(candidate, "index.html")):
            return candidate
    return os.path.join(TESTS_DIR, "no-frontend")

FAILURES = []


def check(condition, message):
    if condition:
        print(f"  ok   {message}", flush=True)
        return True
    print(f"  FAIL {message}", flush=True)
    FAILURES.append(message)
    return False


# ---------------------------------------------------------------------------
# 本地 fixture 站点
# ---------------------------------------------------------------------------
class FixtureState:
    def __init__(self):
        self.lock = threading.Lock()
        self.values = {"a": "A0", "b": "B0"}

    def set(self, page, value):
        with self.lock:
            self.values[page] = value

    def get(self, page):
        with self.lock:
            return self.values[page]


FIXTURE = FixtureState()

PAGE_TEMPLATE = """<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>Fixture {page}</title></head>
<body>
  <h1>Fixture page {page}</h1>
  <div id="value">{value}</div>
</body>
</html>
"""


class FixtureHandler(BaseHTTPRequestHandler):
    def do_GET(self):  # noqa: N802
        page = self.path.strip("/").split("?")[0]
        if page not in ("a", "b"):
            self.send_response(404)
            self.end_headers()
            self.wfile.write(b"not found")
            return

        body = PAGE_TEMPLATE.format(page=page.upper(), value=FIXTURE.get(page)).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *args):
        pass


def start_fixture():
    server = ThreadingHTTPServer(("127.0.0.1", 0), FixtureHandler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server, f"http://127.0.0.1:{server.server_address[1]}"


# ---------------------------------------------------------------------------
# SMTP sink
# ---------------------------------------------------------------------------
class SmtpSink:
    def __init__(self):
        self.lock = threading.Lock()
        self.messages = []
        self.credentials_seen = []
        self.auth_rejections = 0
        self.allowed_users = set()
        self.expected_password = None

    def add(self, recipient, sender, body):
        with self.lock:
            self.messages.append({"recipient": recipient, "sender": sender, "body": body})

    def for_recipient(self, recipient):
        with self.lock:
            return [m for m in self.messages if m["recipient"] == recipient]

    def count(self):
        with self.lock:
            return len(self.messages)

    def reset(self):
        with self.lock:
            self.messages.clear()


SINK = SmtpSink()


class SmtpHandler(socketserver.StreamRequestHandler):
    """最小可用 SMTP：EHLO/STARTTLS/AUTH PLAIN|LOGIN/MAIL/RCPT/DATA/QUIT。"""

    def _send(self, line):
        self.wfile.write((line + "\r\n").encode("utf-8"))
        self.wfile.flush()

    def handle(self):
        self._send("220 smoke-smtp ready")
        mail_from = None
        recipients = []
        authed = False
        buffer = []

        while True:
            raw = self.rfile.readline()
            if not raw:
                return
            line = raw.decode("utf-8", "replace").strip()
            if not line:
                continue
            command = line.split(" ", 1)[0].upper()

            if command == "EHLO" or command == "HELO":
                self._send("250-smoke-smtp")
                self._send("250-STARTTLS")
                self._send("250-AUTH PLAIN LOGIN")
                self._send("250 OK")

            elif command == "STARTTLS":
                self._send("220 Ready to start TLS")
                context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
                context.load_cert_chain(SMTP_TLS_CERT, SMTP_TLS_KEY)
                self.connection = context.wrap_socket(self.connection, server_side=True)
                self.rfile = self.connection.makefile("rb")
                self.wfile = self.connection.makefile("wb")
                authed = False

            elif command == "AUTH":
                parts = line.split(" ", 2)
                mechanism = parts[1] if len(parts) > 1 else ""
                initial = parts[2] if len(parts) > 2 else ""
                if mechanism.upper() == "PLAIN":
                    if not initial:
                        self._send("334 ")
                        initial = self.rfile.readline().decode("utf-8", "replace").strip()
                    try:
                        decoded = base64.b64decode(initial).decode("utf-8")
                        _, user, password = decoded.split("\x00")
                    except Exception:
                        self._send("535 5.7.8 Cannot decode credentials")
                        continue
                    authed = self._check_credentials(user, password)
                elif mechanism.upper() == "LOGIN":
                    self._send("334 VXNlcm5hbWU6")
                    user = base64.b64decode(self.rfile.readline().strip()).decode("utf-8")
                    self._send("334 UGFzc3dvcmQ6")
                    password = base64.b64decode(self.rfile.readline().strip()).decode("utf-8")
                    authed = self._check_credentials(user, password)
                else:
                    self._send("504 5.5.4 Unsupported mechanism")

            elif command == "MAIL":
                if not authed:
                    self._send("530 5.7.0 Authentication required")
                    continue
                match = re.search(r"<(.*)>", line)
                mail_from = match.group(1) if match else ""
                recipients = []
                buffer = []
                self._send("250 OK")

            elif command == "RCPT":
                match = re.search(r"<(.*)>", line)
                if match:
                    recipients.append(match.group(1))
                self._send("250 OK")

            elif command == "DATA":
                self._send("354 End data with <CR><LF>.<CR><LF>")
                lines = []
                while True:
                    chunk = self.rfile.readline()
                    if not chunk:
                        return
                    text = chunk.decode("utf-8", "replace")
                    if text.rstrip("\r\n") == ".":
                        break
                    lines.append(text)
                body = "".join(lines)
                for recipient in recipients or [""]:
                    SINK.add(recipient, mail_from or "", body)
                recipients = []
                self._send("250 OK queued")

            elif command == "RSET":
                recipients = []
                self._send("250 OK")

            elif command == "NOOP":
                self._send("250 OK")

            elif command == "QUIT":
                self._send("221 Bye")
                return

            else:
                self._send("500 5.5.2 Unrecognized command")

    def _check_credentials(self, user, password):
        with SINK.lock:
            SINK.credentials_seen.append((user, password))
        if user in SINK.allowed_users and password == SINK.expected_password:
            self._send("235 2.7.0 Authentication successful")
            return True
        with SINK.lock:
            SINK.auth_rejections += 1
        self._send("535 5.7.8 Authentication failed")
        return False


class ThreadedSmtpServer(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


SMTP_TLS_CERT = None
SMTP_TLS_KEY = None


def make_tls_material(tmpdir):
    """生成自签证书。优先用镜像里的 openssl；失败则用固定测试证书。"""
    cert = os.path.join(tmpdir, "cert.pem")
    key = os.path.join(tmpdir, "key.pem")

    provided = os.environ.get("WEBMONITOR_SMOKE_TLS_DIR")
    if provided:
        source_cert = os.path.join(provided, "cert.pem")
        source_key = os.path.join(provided, "key.pem")
        if os.path.isfile(source_cert) and os.path.isfile(source_key):
            shutil.copyfile(source_cert, cert)
            shutil.copyfile(source_key, key)
            return cert, key

    try:
        subprocess.run(
            [
                "openssl",
                "req",
                "-x509",
                "-newkey",
                "rsa:2048",
                "-nodes",
                "-keyout",
                key,
                "-out",
                cert,
                "-days",
                "1",
                "-subj",
                "/CN=localhost",
            ],
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        return cert, key
    except (OSError, subprocess.CalledProcessError):
        pass

    raise RuntimeError(
        "无法生成 TLS 证书：镜像里缺少 openssl。"
        "请在宿主生成证书并用 WEBMONITOR_SMOKE_TLS_DIR 指向该目录。"
    )


def start_smtp_sink():
    server = ThreadedSmtpServer(("127.0.0.1", 0), SmtpHandler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server, server.server_address[1]


# ---------------------------------------------------------------------------
# HTTP helpers
# ---------------------------------------------------------------------------
class Client:
    def __init__(self, base_url):
        self.base_url = base_url
        self.token = None

    def request(self, method, path, json_body=None, data=None, params=None, expect_json=True):
        url = f"{self.base_url}{path}"
        if params:
            url = f"{url}?{urlencode(params)}"

        headers = {}
        payload = None
        if json_body is not None:
            payload = json.dumps(json_body).encode("utf-8")
            headers["Content-Type"] = "application/json"
        elif data is not None:
            payload = urlencode(data).encode("utf-8")
            headers["Content-Type"] = "application/x-www-form-urlencoded"

        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"

        request = urllib.request.Request(url, data=payload, headers=headers, method=method)
        opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
        try:
            with opener.open(request, timeout=60) as response:
                body = response.read().decode("utf-8")
                return response.status, (json.loads(body) if expect_json and body else body)
        except urllib.error.HTTPError as exc:
            body = exc.read().decode("utf-8")
            try:
                return exc.code, json.loads(body)
            except json.JSONDecodeError:
                return exc.code, body

    def get(self, path, **kwargs):
        return self.request("GET", path, **kwargs)

    def post(self, path, **kwargs):
        return self.request("POST", path, **kwargs)

    def put(self, path, **kwargs):
        return self.request("PUT", path, **kwargs)

    def delete(self, path, **kwargs):
        return self.request("DELETE", path, **kwargs)

    def login(self, username, password):
        status, body = self.post("/api/auth/login", data={"username": username, "password": password})
        if status != 200:
            raise RuntimeError(f"登录失败 {username}: {status} {body}")
        self.token = body["access_token"]
        return body["user"]


def wait_until(predicate, timeout, interval=0.5):
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if predicate():
            return True
        time.sleep(interval)
    return False


# ---------------------------------------------------------------------------
# 主流程
# ---------------------------------------------------------------------------
def run_smoke(base_url, password):
    client = Client(base_url)
    smtp_port = SMTP_PORT

    print("== 准备账户 ==", flush=True)
    suffix = secrets.token_hex(3)
    users = {}
    for name in ("alice", "bob", "admin"):
        users[name] = f"{name}{suffix}"

    admin_client = Client(base_url)
    admin_client.login("admin", os.environ["ADMIN_PASSWORD"])

    for name, username in users.items():
        status, body = admin_client.post(
            "/api/auth/users",
            json_body={
                "username": username,
                "email": f"{username}@example.com",
                "password": password,
                "is_admin": name == "admin",
                "max_subscriptions": 10,
            },
        )
        check(status == 201, f"管理员创建用户 {name}: {status}")

    alice = Client(base_url)
    alice.login(users["alice"], password)
    bob = Client(base_url)
    bob.login(users["bob"], password)

    print("== 邮件配置 ==", flush=True)
    configs = {}
    for name, client in (("alice", alice), ("bob", bob)):
        status, body = client.post(
            "/api/email-configs",
            json_body={
                "name": f"{name}-sink",
                "smtp_server": "127.0.0.1",
                "smtp_port": smtp_port,
                "smtp_user": f"{name}@example.com",
                "smtp_password": password,
                "receiver_email": f"{name}-inbox@example.com",
                "is_ssl": False,
            },
        )
        check(status == 200, f"{name} 创建邮件配置: {status} {body}")
        check("smtp_password" not in json.dumps(body), f"{name} 配置响应不含密码")
        configs[name] = body["id"]

    print("== 创建任务 ==", flush=True)
    tasks = {}
    for name, client, page in (("alice", alice, "a"), ("bob", bob, "b")):
        status, body = client.post(
            "/api/monitor-tasks",
            json_body={
                "name": f"{name}-{page}",
                "url": f"{FIXTURE_URL}/{page}",
                "xpath": "//div[@id='value']",
                # 先给一个长间隔，保证下面的"测试端点"断言不会和定时采集抢跑
                "interval": 300,
                "is_active": True,
                "is_public": False,
                "description": f"{name} task",
                "email_config_id": configs[name],
            },
        )
        check(status == 200, f"{name} 创建任务: {status} {body}")
        tasks[name] = body["id"]

    print("== 无邮件配置的任务 ==", flush=True)
    status, body = alice.post(
        "/api/monitor-tasks",
        json_body={
            "name": "alice-no-mail",
            "url": f"{FIXTURE_URL}/b",
            "xpath": "//div[@id='value']",
            "interval": 10,
            "is_active": True,
            "is_public": False,
        },
    )
    check(status == 200, f"不配邮件也能创建任务: {status} {body}")
    check(body.get("email_config_id") is None, "任务未绑定邮件配置")
    no_mail_task_id = body.get("id")

    print("== 采集测试端点（同时预热 Selenium）==", flush=True)
    # 首次 webdriver.Chrome() 可能要解析/下载 driver，先用测试端点把它预热掉；
    # 顺带验证：测试只抓取，不写 baseline / last_check / 日志。
    status, body = alice.post(f"/api/monitor-tasks/{tasks['alice']}/test")
    check(status == 200, f"任务测试端点返回 200: {status} {body}")
    check(body.get("content") == "A0", f"测试拿到 A0（实际 {body.get('content')!r}）")
    check(body.get("title") == "Fixture A", f"测试拿到页面标题（实际 {body.get('title')!r}）")

    _, tasks_after_test = alice.get("/api/monitor-tasks")
    after_test = next(t for t in tasks_after_test if t["id"] == tasks["alice"])
    check(after_test.get("last_content") is None, "测试不写 baseline")
    check(after_test.get("last_check") is None, "测试不写 last_check")
    _, logs_after_test = alice.get(
        f"/api/monitor-tasks/{tasks['alice']}/logs", params={"page": 1, "limit": 100}
    )
    check(logs_after_test["total"] == 0, "测试不产生监控日志")

    # 另一个用户测试别人的任务必须 403，且不能启动浏览器
    status, _ = bob.post(f"/api/monitor-tasks/{tasks['alice']}/test")
    check(status == 403, f"他人测试被拒绝: {status}")

    print("== 调回短间隔，等待真实调度采集（最长 120 秒）==", flush=True)
    for name, client in (("alice", alice), ("bob", bob)):
        status, _ = client.put(f"/api/monitor-tasks/{tasks[name]}", json_body={"interval": 10})
        check(status == 200, f"{name} 间隔改为 10 秒")

    def both_collected():
        _, alice_tasks = alice.get("/api/monitor-tasks")
        _, bob_tasks = bob.get("/api/monitor-tasks")
        alice_task = next((t for t in alice_tasks if t["id"] == tasks["alice"]), None)
        bob_task = next((t for t in bob_tasks if t["id"] == tasks["bob"]), None)
        return bool(
            alice_task
            and bob_task
            and alice_task.get("last_content")
            and bob_task.get("last_content")
        )

    collected = wait_until(both_collected, timeout=120, interval=1.0)
    check(collected, "两个任务都完成了首次采集")

    if collected:
        _, alice_tasks = alice.get("/api/monitor-tasks")
        _, bob_tasks = bob.get("/api/monitor-tasks")
        alice_task = next(t for t in alice_tasks if t["id"] == tasks["alice"])
        bob_task = next(t for t in bob_tasks if t["id"] == tasks["bob"])

        check(alice_task["last_content"] == "A0", f"alice 采集到 A0（实际 {alice_task['last_content']!r}）")
        check(bob_task["last_content"] == "B0", f"bob 采集到 B0（实际 {bob_task['last_content']!r}）")

        _, alice_logs = alice.get(f"/api/monitor-tasks/{tasks['alice']}/logs", params={"page": 1, "limit": 100})
        _, bob_logs = bob.get(f"/api/monitor-tasks/{tasks['bob']}/logs", params={"page": 1, "limit": 100})
        check(alice_logs["total"] >= 1, "alice 任务产生了日志")
        check(bob_logs["total"] >= 1, "bob 任务产生了日志")

    print("== 无邮件任务：采集但不发通知 ==", flush=True)
    SINK.reset()

    def no_mail_task_collected():
        _, page = alice.get(f"/api/monitor-tasks/{no_mail_task_id}/logs", params={"page": 1, "limit": 50})
        return page["total"] > 0

    check(wait_until(no_mail_task_collected, timeout=90, interval=1.0), "无邮件任务照常采集并记录日志")
    check(SINK.count() == 0, f"无邮件任务不发送任何通知（sink 收到 {SINK.count()} 封）")

    _, no_mail_tasks = alice.get("/api/monitor-tasks")
    no_mail_task = next(t for t in no_mail_tasks if t["id"] == no_mail_task_id)
    check(no_mail_task.get("last_content") == "B0", f"无邮件任务更新了 baseline（{no_mail_task.get('last_content')!r}）")

    print("== 内容变更 + 通知 ==", flush=True)
    SINK.reset()
    FIXTURE.set("a", "A1")

    def alice_change_logged():
        _, page = alice.get(f"/api/monitor-tasks/{tasks['alice']}/logs", params={"page": 1, "limit": 50})
        return any(log["is_changed"] for log in page["logs"])

    changed = wait_until(alice_change_logged, timeout=90, interval=1.0)
    check(changed, "下一轮真实调度检测到内容变化")

    if changed:
        delivered = wait_until(
            lambda: len(SINK.for_recipient("alice-inbox@example.com")) >= 1, timeout=20, interval=0.5
        )
        check(delivered, "变更通知送达 alice 的接收邮箱")
        check(
            len(SINK.for_recipient("bob-inbox@example.com")) == 0,
            "bob 没有收到 alice 任务的通知",
        )

        _, alice_tasks = alice.get("/api/monitor-tasks")
        alice_task = next(t for t in alice_tasks if t["id"] == tasks["alice"])
        check(alice_task["last_content"] == "A1", "baseline 已更新为 A1")

    print("== 调度：改间隔 / 停用 / 删除 ==", flush=True)
    status, _ = alice.put(f"/api/monitor-tasks/{tasks['alice']}", json_body={"interval": 600})
    check(status == 200, "alice 把间隔改为 600")

    def bob_log_total():
        return bob.get(f"/api/monitor-tasks/{tasks['bob']}/logs", params={"page": 1, "limit": 100})[1]["total"]

    bob_total = bob_log_total()
    bob_kept_running = wait_until(lambda: bob_log_total() > bob_total, timeout=90, interval=1.0)
    check(
        bob_kept_running,
        f"另一个任务（间隔 10 秒）继续采集（{bob_total} → {bob_log_total()}）",
    )

    from app.services.scheduler import monitor_scheduler

    check(
        monitor_scheduler.scheduler.get_job(f"monitor_task_{tasks['alice']}") is not None,
        "alice 任务仍有作业",
    )
    check(
        monitor_scheduler.scheduler.get_job(f"monitor_task_{tasks['alice']}").trigger.interval.total_seconds() == 600,
        "alice 作业间隔已变为 600",
    )

    alice.put(f"/api/monitor-tasks/{tasks['alice']}", json_body={"is_active": False})
    check(
        monitor_scheduler.scheduler.get_job(f"monitor_task_{tasks['alice']}") is None,
        "停用后作业被移除",
    )

    alice.put(f"/api/monitor-tasks/{tasks['alice']}", json_body={"is_active": True})
    check(
        monitor_scheduler.scheduler.get_job(f"monitor_task_{tasks['alice']}") is not None,
        "重新启用后作业恢复",
    )

    alice.delete(f"/api/monitor-tasks/{tasks['alice']}")
    check(
        monitor_scheduler.scheduler.get_job(f"monitor_task_{tasks['alice']}") is None,
        "删除后作业被移除",
    )

    print("== 测试邮件 ==", flush=True)
    SINK.reset()
    status, body = bob.post(f"/api/email-configs/{configs['bob']}/test")
    check(status == 200 and body.get("success") is True, f"配置测试成功: {body}")
    time.sleep(1)
    check(
        len(SINK.for_recipient("bob-inbox@example.com")) == 1,
        f"测试邮件恰好一封（实际 {len(SINK.for_recipient('bob-inbox@example.com'))}）",
    )

    print("== 订阅 ==", flush=True)
    bob.put(f"/api/monitor-tasks/{tasks['bob']}", json_body={"is_public": True, "is_active": True})
    status, body = alice.post(f"/api/subscriptions/{tasks['bob']}/toggle")
    check(status == 200 and body.get("subscribed") is True, f"alice 订阅 bob 的任务: {body}")

    status, subs = alice.get("/api/subscriptions")
    check(status == 200 and len(subs) == 1, "订阅列表返回一条")
    if subs:
        check(subs[0]["task_owner"] == users["bob"], f"订阅暴露任务所有者: {subs[0].get('task_owner')}")

    return {"users": users, "tasks": tasks, "configs": configs}


def prepare_serve_data(base_url, password, created):
    """为浏览器验收准备三账户 + 公开/私人任务 + 至少 25 条日志。"""
    from app.db.database import SessionLocal
    from app.db.models import MonitorLog

    admin_client = Client(base_url)
    admin_client.login("admin", os.environ["ADMIN_PASSWORD"])

    alice = Client(base_url)
    alice.login(created["users"]["alice"], password)
    bob = Client(base_url)
    bob.login(created["users"]["bob"], password)

    # 公开任务（bob 的），供 alice 订阅
    status, public_task = alice.post(
        "/api/monitor-tasks",
        json_body={
            "name": "public-demo",
            "url": f"{FIXTURE_URL}/a",
            "xpath": "//div[@id='value']",
            "interval": 300,
            "is_active": True,
            "is_public": True,
            "description": "公开示例任务",
            "email_config_id": created["configs"]["alice"],
        },
    )
    check(status == 200, f"创建公开任务: {status}")

    status, private_task = bob.post(
        "/api/monitor-tasks",
        json_body={
            "name": "private-demo",
            "url": f"{FIXTURE_URL}/b",
            "xpath": "//div[@id='value']",
            "interval": 300,
            "is_active": True,
            "is_public": False,
            "description": "私人任务",
            "email_config_id": created["configs"]["bob"],
        },
    )
    check(status == 200, f"创建私人任务: {status}")

    # 25+ 条日志，供分页验收
    db = SessionLocal()
    try:
        base_time = datetime(2024, 6, 1, 8, 0, 0)
        for index in range(26):
            db.add(
                MonitorLog(
                    task_id=private_task["id"],
                    old_content=f"value-{index}",
                    new_content=f"value-{index + 1}",
                    is_changed=index % 3 == 0,
                    error_message=None if index % 7 else "演示错误",
                    check_time=base_time.replace(minute=index % 60, second=0),
                )
            )
        db.commit()
    finally:
        db.close()

    check(True, "已准备 26 条日志")

    # 黑名单里放一个域名，供 403 验收
    status, _ = admin_client.post(
        "/api/blacklist-domains",
        json_body={"domain": "blocked.example.com", "description": "演示黑名单", "is_active": True},
    )
    check(status == 200, "管理员添加黑名单域名")

    return {
        "public_task": public_task["id"] if status == 200 else None,
        "private_task": private_task["id"] if status == 200 else None,
    }


def main():
    global SMTP_PORT, FIXTURE_URL

    parser = argparse.ArgumentParser()
    parser.add_argument("--serve", action="store_true", help="验收后保留服务供浏览器使用")
    parser.add_argument(
        "--host",
        default=None,
        help="监听地址；--serve 默认 0.0.0.0（容器端口映射需要），否则 127.0.0.1",
    )
    parser.add_argument("--port", type=int, default=8000)
    args = parser.parse_args()

    if args.host is None:
        args.host = "0.0.0.0" if args.serve else "127.0.0.1"

    serve_password = os.environ.get("WEBMONITOR_SMOKE_PASSWORD")
    if args.serve and not serve_password:
        print("--serve 需要 WEBMONITOR_SMOKE_PASSWORD", file=sys.stderr)
        return 2

    password = serve_password or (
        "Smoke-" + "".join(random.choices(string.ascii_letters + string.digits, k=12))
    )

    tmpdir = tempfile.mkdtemp(prefix="webmonitor-smoke-")
    db_path = os.path.join(tmpdir, "smoke.db")

    os.environ.update(
        {
            "SECRET_KEY": secrets.token_hex(32),
            "ADMIN_USERNAME": "admin",
            "ADMIN_EMAIL": "admin@example.com",
            "ADMIN_PASSWORD": password,
            "DATABASE_URL": f"sqlite:///{db_path}",
            "FRONTEND_DIST": _frontend_dist(),
            "LOG_LEVEL": "INFO",
        }
    )

    fixture_server, fixture_url = start_fixture()
    FIXTURE_URL = fixture_url
    os.environ["TARGET_ALLOWED_ORIGINS"] = fixture_url

    smtp_server, smtp_port = start_smtp_sink()
    SMTP_PORT = smtp_port

    global SMTP_TLS_CERT, SMTP_TLS_KEY
    SMTP_TLS_CERT, SMTP_TLS_KEY = make_tls_material(tmpdir)
    # 两个测试账户共用同一个 sink 与同一套口令；凭据必须匹配，否则 AUTH 失败
    SINK.allowed_users = {f"{name}@example.com" for name in ("alice", "bob")}
    SINK.expected_password = password

    print(f"fixture: {fixture_url}")
    print(f"smtp sink: 127.0.0.1:{smtp_port}")

    import uvicorn

    import main as app_main

    config = uvicorn.Config(
        app_main.app,
        host=args.host,
        port=args.port,
        log_level="info",
        access_log=False,
        lifespan="on",
    )
    server = uvicorn.Server(config)
    thread = threading.Thread(target=server.run, daemon=True)
    thread.start()

    deadline = time.monotonic() + 60
    while time.monotonic() < deadline and not getattr(server, "started", False):
        if not thread.is_alive():
            break
        time.sleep(0.05)

    if not getattr(server, "started", False):
        print("服务未能启动", file=sys.stderr)
        return 1

    client_host = "127.0.0.1" if args.host in ("0.0.0.0", "::") else args.host
    base_url = f"http://{client_host}:{args.port}"
    print(f"app: {base_url}")

    exit_code = 0
    try:
        created = run_smoke(base_url, password)

        print("== 结果 ==", flush=True)
        if FAILURES:
            print(f"{len(FAILURES)} 项失败：")
            for item in FAILURES:
                print(f"  - {item}")
            exit_code = 1
        else:
            print("全部通过", flush=True)

        if args.serve:
            prepare_serve_data(base_url, password, created)
            print("READY", flush=True)
            print(f"URL: {base_url}", flush=True)
            print(f"USERS: admin, {created['users']['alice']}, {created['users']['bob']}", flush=True)
            print("（口令见 WEBMONITOR_SMOKE_PASSWORD，不在此输出）")

            while True:
                time.sleep(1)

    except KeyboardInterrupt:
        pass
    except Exception:
        traceback.print_exc()
        exit_code = 1
    finally:
        if not args.serve:
            server.should_exit = True
            thread.join(timeout=30)
            fixture_server.shutdown()
            smtp_server.shutdown()
            shutil.rmtree(tmpdir, ignore_errors=True)

    return exit_code


if __name__ == "__main__":
    sys.exit(main())
