"""采集协议、DNS 地址边界和逐请求代理规则。"""
import http.client
import os
import sys
import threading
import unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from unittest import mock

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import support
support.bootstrap_environment()
from app.services.target_access import CollectorProxy, TargetForbidden, allowed_origins, parse_target, resolve_target
from app.services.monitor_service import MonitorService


class TargetAccessTestCase(unittest.TestCase):
    def test_non_http_and_credentials_are_rejected_before_browser_start(self):
        for url in ("file:///app/main.py", "data:text/html,secret", "ftp://example.com/",
                    "https://user:password@example.com/", "http://example.com\\@127.0.0.1/",
                    "http://example.com/\r\nHost: localhost"):
            with self.subTest(url=url):
                with self.assertRaises(TargetForbidden):
                    parse_target(url)
        with mock.patch("app.services.monitor_service.webdriver.Chrome") as browser:
            content, error, title = MonitorService().get_content_with_selenium("file:///etc/hosts", "//body")
        browser.assert_not_called()
        self.assertIsNone(content)
        self.assertIsNotNone(error)
        self.assertIsNone(title)

    def test_private_and_ambiguous_ip_spellings_are_blocked(self):
        for host in ("127.0.0.1", "127.1", "2130706433", "0x7f000001", "10.0.0.1", "169.254.169.254",
                     "[::1]", "[::ffff:127.0.0.1]"):
            with self.subTest(host=host):
                with self.assertRaises(TargetForbidden):
                    resolve_target(f"http://{host}/", frozenset())

    def test_reserved_global_ipv6_addresses_are_blocked(self):
        with self.assertRaises(TargetForbidden):
            resolve_target("http://[4000::1]/", frozenset())

    def test_mixed_or_rebound_dns_does_not_authorize_private_address(self):
        public = (2, 1, 6, "", ("8.8.8.8", 80))
        private = (2, 1, 6, "", ("127.0.0.1", 80))
        with mock.patch("socket.getaddrinfo", return_value=[public, private]):
            with self.assertRaises(TargetForbidden):
                resolve_target("http://mixed.example/", frozenset())
        with mock.patch("socket.getaddrinfo", side_effect=[[public], [private]]):
            resolve_target("http://rebound.example/", frozenset())
            with self.assertRaises(TargetForbidden):
                resolve_target("http://rebound.example/resource", frozenset())

    def test_origin_exceptions_are_exact_and_never_include_subdomains_or_ports(self):
        origins = allowed_origins("http://127.0.0.1:9000")
        resolve_target("http://127.0.0.1:9000/notice", origins)
        for url in ("http://127.0.0.1:9001/", "https://127.0.0.1:9000/"):
            with self.assertRaises(TargetForbidden):
                resolve_target(url, origins)
        for value in ("http://127.0.0.1:9000/path", "*.example.com", "file:///tmp"):
            with self.assertRaises(TargetForbidden):
                allowed_origins(value)

    def test_proxy_blocks_redirect_destination_subresource_and_connect_target(self):
        visits = []
        class Page(BaseHTTPRequestHandler):
            def do_GET(self):
                visits.append(self.path)
                body = b"<html><h1>Allowed page</h1></html>"
                self.send_response(200)
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)
            def log_message(self, *args):
                pass
        target = ThreadingHTTPServer(("127.0.0.1", 0), Page)
        thread = threading.Thread(target=target.serve_forever, daemon=True)
        thread.start()
        origin = f"http://127.0.0.1:{target.server_port}"
        try:
            with CollectorProxy(origin) as proxy:
                def request(method, url):
                    connection = http.client.HTTPConnection("127.0.0.1", proxy.server.server_port, timeout=5)
                    try:
                        connection.request(method, url)
                        response = connection.getresponse()
                        return response.status, response.read()
                    finally:
                        connection.close()
                status, body = request("GET", origin + "/notice")
                self.assertEqual(status, 200)
                self.assertIn(b"Allowed page", body)
                self.assertEqual(request("GET", "http://127.0.0.1:1/redirect-target")[0], 403)
                self.assertEqual(request("GET", "http://127.0.0.1:1/private-script.js")[0], 403)
                self.assertEqual(request("CONNECT", "127.0.0.1:443")[0], 403)
                self.assertEqual(visits, ["/notice"])
                self.assertTrue(proxy.blocked)
        finally:
            target.shutdown()
            target.server_close()
            thread.join(timeout=5)
