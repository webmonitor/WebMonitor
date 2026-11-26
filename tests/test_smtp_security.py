"""SMTP DNS 边界、固定 IP socket 与 TLS 主机名校验回归。"""
import os
import sys
import unittest
from unittest import mock

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import support  # noqa: E402

support.bootstrap_environment()

from app.core.config import settings  # noqa: E402
from app.services import email_service  # noqa: E402
from app.services.email_service import EmailService  # noqa: E402


def address_records(*addresses: str) -> list[tuple]:
    records = []
    for address in addresses:
        if ":" in address:
            records.append(
                (
                    email_service.socket.AF_INET6,
                    email_service.socket.SOCK_STREAM,
                    email_service.socket.IPPROTO_TCP,
                    "",
                    (address, 465, 0, 0),
                )
            )
        else:
            records.append(
                (
                    email_service.socket.AF_INET,
                    email_service.socket.SOCK_STREAM,
                    email_service.socket.IPPROTO_TCP,
                    "",
                    (address, 465),
                )
            )
    return records


class SmtpAddressPolicyTestCase(unittest.TestCase):
    def test_private_and_loopback_addresses_never_open_a_socket_by_default(self):
        for address in ("127.0.0.1", "10.0.0.8", "192.168.1.2", "224.0.0.1", "::1", "fd00::1"):
            with self.subTest(address=address), mock.patch.object(
                email_service.settings, "SMTP_ALLOWED_HOSTS", ""
            ), mock.patch.object(
                email_service.socket, "getaddrinfo", return_value=address_records(address)
            ), mock.patch.object(email_service.socket, "socket") as socket_factory:
                with self.assertRaises(email_service._SMTPHostRejected):
                    email_service._open_smtp_socket("smtp.example.com", 465, 5)
                socket_factory.assert_not_called()

    def test_one_private_record_rejects_the_entire_mixed_answer(self):
        with mock.patch.object(settings, "SMTP_ALLOWED_HOSTS", ""), mock.patch.object(
            email_service.socket,
            "getaddrinfo",
            return_value=address_records("8.8.8.8", "127.0.0.1"),
        ), mock.patch.object(email_service.socket, "socket") as socket_factory:
            with self.assertRaises(email_service._SMTPHostRejected):
                email_service._open_smtp_socket("smtp.example.com", 465, 5)
        socket_factory.assert_not_called()

    def test_exact_allowlist_permits_local_relay_but_not_suffix_lookalikes(self):
        relay_socket = mock.Mock()
        with mock.patch.object(settings, "SMTP_ALLOWED_HOSTS", " relay.internal , localhost "), mock.patch.object(
            email_service.socket,
            "getaddrinfo",
            return_value=address_records("127.0.0.1"),
        ), mock.patch.object(email_service.socket, "socket", return_value=relay_socket):
            connected = email_service._open_smtp_socket("LOCALHOST.", 465, 5)
        self.assertIs(connected, relay_socket)
        relay_socket.connect.assert_called_once_with(("127.0.0.1", 465))

        with mock.patch.object(settings, "SMTP_ALLOWED_HOSTS", "localhost"), mock.patch.object(
            email_service.socket,
            "getaddrinfo",
            return_value=address_records("127.0.0.1"),
        ), mock.patch.object(email_service.socket, "socket") as socket_factory:
            with self.assertRaises(email_service._SMTPHostRejected):
                email_service._open_smtp_socket("localhost.evil.example", 465, 5)
        socket_factory.assert_not_called()


class SmtpTlsSocketTestCase(unittest.TestCase):
    def test_implicit_tls_wraps_the_validated_ip_socket_with_original_sni(self):
        host = "smtp.example.com"
        context = mock.Mock()
        wrapped = mock.Mock()
        context.wrap_socket.return_value = wrapped
        raw = mock.Mock()
        server = email_service._PinnedSMTP_SSL(local_hostname="localhost", context=context)
        with mock.patch.object(
            email_service,
            "_resolve_smtp_addresses",
            return_value=[record[:3] + (record[4],) for record in address_records("8.8.8.8")],
        ), mock.patch.object(email_service.socket, "socket", return_value=raw):
            result = server._get_socket(host, 465, 7)

        self.assertIs(result, wrapped)
        raw.connect.assert_called_once_with(("8.8.8.8", 465))
        raw.settimeout.assert_called_once_with(7)
        context.wrap_socket.assert_called_once_with(raw, server_hostname=host)

    def test_starttls_uses_original_hostname_for_certificate_validation(self):
        host = "smtp.example.com"
        context = mock.Mock()
        context.wrap_socket.return_value = mock.Mock()
        server = email_service._PinnedSMTP(local_hostname="localhost")
        server._host = host
        raw = mock.Mock()
        server.sock = raw
        with mock.patch.object(server, "ehlo_or_helo_if_needed"), mock.patch.object(
            server, "has_extn", return_value=True
        ), mock.patch.object(server, "docmd", return_value=(220, b"ready")):
            server.starttls(context=context)
        context.wrap_socket.assert_called_once_with(raw, server_hostname=host)

    def test_shared_factory_uses_timeout_and_validating_context_for_both_modes(self):
        for is_ssl, class_name in ((True, "_PinnedSMTP_SSL"), (False, "_PinnedSMTP")):
            with self.subTest(is_ssl=is_ssl), mock.patch.object(
                email_service.ssl, "create_default_context"
            ) as create_context, mock.patch.object(
                email_service, class_name
            ) as smtp_class:
                server = smtp_class.return_value
                server.connect.return_value = (220, b"ready")
                email_service._connect_smtp("smtp.example.com", 587, is_ssl)
                kwargs = smtp_class.call_args.kwargs
                self.assertEqual(kwargs["timeout"], settings.SMTP_TIMEOUT_SECONDS)
                self.assertGreater(kwargs["timeout"], 0)
                if is_ssl:
                    self.assertIs(kwargs["context"], create_context.return_value)
                    server.starttls.assert_not_called()
                else:
                    self.assertNotIn("context", kwargs)
                    server.starttls.assert_called_once_with(context=create_context.return_value)

    def test_connection_errors_do_not_return_exception_secrets(self):
        secret = "smtp-password-that-must-not-leak"
        with mock.patch.object(
            email_service,
            "_connect_smtp",
            side_effect=OSError(f"failed for sender@example.com using {secret}"),
        ):
            result = EmailService()._test_connection(
                "smtp.example.com",
                587,
                "sender@example.com",
                secret,
                False,
            )
        self.assertFalse(result["success"])
        self.assertNotIn(secret, str(result))
        self.assertNotIn("sender@example.com", str(result))


if __name__ == "__main__":
    unittest.main()
