"""采集浏览器专用代理：每次连接验证目标，并固定连接到已验证的 IP。"""
import ipaddress
import select
import socket
import threading
from contextlib import suppress
from http.client import HTTPConnection
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import SplitResult, urlsplit, urlunsplit
from typing import Self


class TargetForbidden(ValueError):
    """地址不满足采集策略；不在错误中携带目标内容。"""


def parse_target(url: str) -> tuple[SplitResult, str]:
    """只接受没有凭据的 HTTP(S) URL，并规范化 origin。"""
    try:
        parsed = urlsplit(url)
        if (parsed.scheme not in {"http", "https"} or not parsed.hostname
                or parsed.username is not None or parsed.password is not None
                or any(ord(char) <= 32 or ord(char) == 127 for char in url)
                or "\\" in url):
            raise TargetForbidden("目标地址只允许 HTTP(S) 且不能包含凭据")
        port = parsed.port or (443 if parsed.scheme == "https" else 80)
        if not 1 <= port <= 65535:
            raise TargetForbidden("目标端口无效")
        host = parsed.hostname.encode("idna").decode("ascii").lower().rstrip(".")
        authority = f"[{host}]" if ":" in host else host
        return parsed, f"{parsed.scheme}://{authority}:{port}"
    except (ValueError, UnicodeError) as exc:
        raise TargetForbidden("目标地址无效") from exc


def allowed_origins(value: str) -> frozenset[str]:
    """例外必须是精确 origin，不允许路径、通配符或隐式全网放行。"""
    origins = set()
    for item in value.split(","):
        if not item.strip():
            continue
        parsed, origin = parse_target(item.strip())
        if parsed.path not in {"", "/"} or parsed.query or parsed.fragment:
            raise TargetForbidden("TARGET_ALLOWED_ORIGINS 必须是精确 HTTP(S) origin")
        origins.add(origin)
    return frozenset(origins)


def resolve_target(url: str, exceptions: frozenset[str]) -> tuple[str, int, list[str]]:
    """验证全部解析结果，后续直接连接数字地址，不进行第二次 DNS 解析。"""
    parsed, origin = parse_target(url)
    host = parsed.hostname.encode("idna").decode("ascii").lower().rstrip(".")
    port = parsed.port or (443 if parsed.scheme == "https" else 80)
    addresses = list(dict.fromkeys(
        item[4][0] for item in socket.getaddrinfo(host, port, type=socket.SOCK_STREAM)))
    if not addresses:
        raise TargetForbidden("目标地址无法解析")
    for address in addresses:
        ip = ipaddress.ip_address(address)
        if isinstance(ip, ipaddress.IPv6Address) and ip.ipv4_mapped is not None:
            ip = ip.ipv4_mapped
        if (not ip.is_global or ip.is_multicast or ip.is_reserved or ip.is_unspecified) and origin not in exceptions:
            raise TargetForbidden("目标地址不在允许范围内")
    return host, port, addresses


class _ProxyServer(ThreadingHTTPServer):
    daemon_threads = True

    def __init__(self, owner: "CollectorProxy") -> None:
        self.owner = owner
        super().__init__(("127.0.0.1", 0), _ProxyHandler)

    def handle_error(self, request, client_address) -> None:
        # 页面断开连接属于正常收尾，不能把请求或异常内容写入日志。
        pass


class _ProxyHandler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.0"

    def log_message(self, *args) -> None:
        pass

    def _reject(self, status: int) -> None:
        self.send_response(status)
        self.send_header("Content-Length", "0")
        self.send_header("Connection", "close")
        self.end_headers()
        self.close_connection = True

    def do_CONNECT(self) -> None:
        owner = self.server.owner
        remote = None
        try:
            parsed, _ = parse_target("https://" + self.path)
            if parsed.path or parsed.query or parsed.fragment or parsed.port is None:
                raise TargetForbidden("隧道目标无效")
            _, port, addresses = resolve_target("https://" + self.path, owner.exceptions)
            remote = owner.connect(addresses, port)
            self.send_response(200, "Connection Established")
            self.end_headers()
            self.wfile.flush()
            self.connection.settimeout(30)
            while not owner.stopped.is_set():
                readable, _, _ = select.select([self.connection, remote], [], [], 0.2)
                for source in readable:
                    data = source.recv(65536)
                    if not data:
                        return
                    destination = remote if source is self.connection else self.connection
                    destination.sendall(data)
        except TargetForbidden:
            owner.blocked = True
            self._reject(403)
        except OSError:
            if remote is None:
                self._reject(502)
        finally:
            if remote is not None:
                owner.release(remote)
            self.close_connection = True

    def _forward(self) -> None:
        owner = self.server.owner
        remote = None
        connection = None
        try:
            parsed, _ = parse_target(self.path)
            if parsed.scheme != "http" or self.headers.get("Upgrade"):
                raise TargetForbidden("不支持该采集请求")
            host, port, addresses = resolve_target(self.path, owner.exceptions)
            remote = owner.connect(addresses, port)
            connection = HTTPConnection(host, port, timeout=30)
            connection.sock = remote
            hop_headers = {"connection", "proxy-connection", "proxy-authorization", "proxy-authenticate",
                           "keep-alive", "transfer-encoding", "te", "trailer", "upgrade", "host"}
            hop_headers.update(item.strip().lower() for item in self.headers.get("Connection", "").split(","))
            headers = {key: value for key, value in self.headers.items() if key.lower() not in hop_headers}
            authority = f"[{host}]" if ":" in host else host
            headers["Host"] = f"{authority}:{port}"
            headers["Connection"] = "close"
            if self.headers.get("Transfer-Encoding"):
                self._reject(400)
                return
            length = int(self.headers.get("Content-Length", "0"))
            if length < 0:
                self._reject(400)
                return
            body = self.rfile.read(length) if length else None
            path = urlunsplit(("", "", parsed.path or "/", parsed.query, ""))
            connection.request(self.command, path, body, headers)
            response = connection.getresponse()
            self.send_response(response.status)
            for key, value in response.getheaders():
                if key.lower() not in hop_headers:
                    self.send_header(key, value)
            self.send_header("Connection", "close")
            self.end_headers()
            while not owner.stopped.is_set():
                chunk = response.read(65536)
                if not chunk:
                    break
                self.wfile.write(chunk)
        except TargetForbidden:
            owner.blocked = True
            self._reject(403)
        except (OSError, ValueError):
            if connection is None:
                self._reject(502)
        finally:
            if connection is not None:
                connection.close()
            if remote is not None:
                owner.release(remote)
            self.close_connection = True

    do_GET = do_HEAD = do_POST = do_PUT = do_PATCH = do_DELETE = do_OPTIONS = _forward


class CollectorProxy:
    """每次采集独立启停，所有重定向和子请求使用同一连接策略。"""

    def __init__(self, allowed: str = "") -> None:
        self.exceptions = allowed_origins(allowed)
        self.blocked = False
        self.stopped = threading.Event()
        self._sockets: set[socket.socket] = set()
        self._lock = threading.Lock()
        self.server = _ProxyServer(self)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)

    @property
    def url(self) -> str:
        return f"http://127.0.0.1:{self.server.server_port}"

    def connect(self, addresses: list[str], port: int) -> socket.socket:
        last_error = None
        for address in addresses:
            try:
                remote = socket.create_connection((address, port), timeout=10)
            except OSError as exc:
                last_error = exc
                continue
            with self._lock:
                if self.stopped.is_set():
                    remote.close()
                    raise OSError("采集已停止")
                self._sockets.add(remote)
            return remote
        raise OSError("目标连接失败") from last_error

    def release(self, remote: socket.socket) -> None:
        with self._lock:
            self._sockets.discard(remote)
        with suppress(OSError):
            remote.close()

    def __enter__(self) -> Self:
        self.thread.start()
        return self

    def __exit__(self, *args) -> None:
        self.stopped.set()
        self.server.shutdown()
        self.server.server_close()
        with self._lock:
            sockets = list(self._sockets)
            self._sockets.clear()
        for remote in sockets:
            with suppress(OSError):
                remote.shutdown(socket.SHUT_RDWR)
            remote.close()
        self.thread.join(timeout=5)
