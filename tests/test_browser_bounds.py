"""手工与定时 Selenium 入口的共享并发及取消语义回归。"""
import os
import sys
import threading
import time
import unittest
from unittest import mock

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import support  # noqa: E402

support.bootstrap_environment()

from app.services import monitor_service  # noqa: E402
from app.services.monitor_service import MonitorService  # noqa: E402


class BrowserConcurrencyTestCase(unittest.TestCase):
    def test_manual_and_scheduled_paths_share_two_browser_slots(self):
        slots = threading.BoundedSemaphore(2)
        active = 0
        maximum = 0
        entered = 0
        two_entered = threading.Event()
        release = threading.Event()
        lock = threading.Lock()
        results = []
        errors = []

        class Element:
            text = "content"

        class Driver:
            title = "title"

            def set_page_load_timeout(self, _timeout):
                pass

            def get(self, _url):
                nonlocal active, maximum, entered
                with lock:
                    active += 1
                    entered += 1
                    maximum = max(maximum, active)
                    if entered == 2:
                        two_entered.set()
                try:
                    if not release.wait(5):
                        raise RuntimeError("test did not release browsers")
                finally:
                    with lock:
                        active -= 1

            def quit(self):
                pass

        class Proxy:
            exceptions = ()
            url = "http://proxy.invalid"
            blocked = False

            def __enter__(self):
                return self

            def __exit__(self, _exc_type, _exc, _tb):
                return False

        wait = mock.Mock()
        wait.until.return_value = Element()
        service = MonitorService()

        def collect(task_id):
            try:
                results.append((task_id, service.get_content_with_selenium("https://example.com", "//div")))
            except BaseException as exc:  # 测试线程必须记录取消，避免静默丢失。
                errors.append(exc)

        with mock.patch.object(monitor_service, "_browser_slots", slots), mock.patch.object(
            monitor_service, "CollectorProxy", return_value=Proxy()
        ), mock.patch.object(monitor_service, "resolve_target"), mock.patch.object(
            monitor_service.webdriver, "Chrome", side_effect=lambda **_kwargs: Driver()
        ), mock.patch.object(monitor_service, "WebDriverWait", return_value=wait):
            threads = [threading.Thread(target=collect, args=(index,)) for index in range(4)]
            for thread in threads:
                thread.start()
            self.assertTrue(two_entered.wait(2))
            # 给额外线程进入的机会；共享 BoundedSemaphore 必须仍将其挡在门外。
            time.sleep(0.1)
            release.set()
            for thread in threads:
                thread.join(5)
                self.assertFalse(thread.is_alive())

        self.assertEqual(errors, [])
        self.assertEqual(len(results), 4)
        self.assertEqual(maximum, 2)
        self.assertTrue(all(result[1][0] == "content" for result in results))

    def test_cancellation_propagates_and_releases_browser_slot(self):
        class Cancelled(BaseException):
            pass

        slots = threading.BoundedSemaphore(1)

        class Proxy:
            exceptions = ()
            url = "http://proxy.invalid"
            blocked = False

            def __enter__(self):
                return self

            def __exit__(self, _exc_type, _exc, _tb):
                return False

        service = MonitorService()
        with mock.patch.object(monitor_service, "_browser_slots", slots), mock.patch.object(
            monitor_service, "CollectorProxy", return_value=Proxy()
        ), mock.patch.object(monitor_service, "resolve_target", side_effect=Cancelled):
            with self.assertRaises(Cancelled):
                service.get_content_with_selenium("https://example.com", "//div")

        self.assertTrue(slots.acquire(blocking=False))
        slots.release()

    def test_test_task_uses_authorized_snapshot_without_opening_db(self):
        service = MonitorService()
        with mock.patch.object(
            monitor_service,
            "SessionLocal",
            side_effect=AssertionError("test_task must not query the database"),
        ), mock.patch.object(
            service,
            "get_content_with_selenium",
            return_value=("content", None, "title"),
        ) as collect:
            result = service.test_task(42, "https://example.com/from-snapshot", "//main")

        collect.assert_called_once_with("https://example.com/from-snapshot", "//main")
        self.assertEqual(
            result,
            {
                "success": True,
                "content": "content",
                "title": "title",
                "url": "https://example.com/from-snapshot",
                "message": "测试成功",
            },
        )


if __name__ == "__main__":
    unittest.main()
