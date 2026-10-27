"""调度器行为：作业绑定、间隔变更、移除与长间隔计时不被重置。"""
import os
import sys
import unittest
from unittest import mock

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import support  # noqa: E402

support.bootstrap_environment()

from sqlalchemy import create_engine  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402

from app.db.models import Base, MonitorTask, User  # noqa: E402
from app.services.scheduler import MonitorScheduler  # noqa: E402


class SchedulerTestCase(unittest.TestCase):
    """每个用例：临时库 + 真实 APScheduler（暂停执行）+ 同一实例上的多次 sync。"""

    def setUp(self):
        self.tmpdir = support.tempfile.mkdtemp(prefix="sched-", dir=support.bootstrap_environment()["tmpdir"])
        self.engine = create_engine(
            f"sqlite:///{os.path.join(self.tmpdir, 'db.sqlite')}",
            connect_args={"check_same_thread": False},
        )
        Base.metadata.create_all(bind=self.engine)
        self.Session = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)

        self.session_patch = mock.patch("app.services.scheduler.SessionLocal", self.Session)
        self.session_patch.start()

        self.scheduler = MonitorScheduler()
        self.scheduler.scheduler.start(paused=True)

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
        self.db.commit()
        self.db.refresh(self.owner)

    def tearDown(self):
        self.scheduler.scheduler.shutdown(wait=False)
        self.session_patch.stop()
        self.db.close()
        self.engine.dispose()
        support.shutil.rmtree(self.tmpdir, ignore_errors=True)

    def _add_task(self, name: str, interval: int, is_active: bool = True) -> int:
        task = MonitorTask(
            name=name,
            url=f"http://example.test/{name}",
            xpath="//div",
            interval=interval,
            is_active=is_active,
            owner_id=self.owner.id,
        )
        self.db.add(task)
        self.db.commit()
        self.db.refresh(task)
        return task.id

    def _task_jobs(self):
        return {
            job.id: job
            for job in self.scheduler.scheduler.get_jobs()
            if job.id.startswith("monitor_task_")
        }

    def test_each_job_captures_its_own_task_id(self):
        ids = [
            self._add_task("alpha", 30),
            self._add_task("beta", 60),
            self._add_task("gamma", 90),
        ]
        self.scheduler.sync_tasks()

        collected = []
        with mock.patch.object(
            self.scheduler.monitor_service,
            "check_single_task",
            side_effect=lambda task_id: collected.append(task_id),
        ):
            for job in self._task_jobs().values():
                job.func(*job.args)

        self.assertEqual(sorted(collected), sorted(ids))
        # 三个任务必须各自触发一次，而不是三次都跑最后一个
        self.assertEqual(len(collected), 3)

    def test_repeated_sync_preserves_next_run_time(self):
        task_id = self._add_task("alpha", 600)
        self.scheduler.sync_tasks()

        job_id = f"monitor_task_{task_id}"
        first_run = self.scheduler.scheduler.get_job(job_id).next_run_time

        self.scheduler.sync_tasks()
        self.scheduler.sync_tasks()

        self.assertEqual(self.scheduler.scheduler.get_job(job_id).next_run_time, first_run)

    def test_interval_change_reschedules_only_that_task(self):
        changed_id = self._add_task("alpha", 600)
        stable_id = self._add_task("beta", 300)
        self.scheduler.sync_tasks()

        stable_before = self.scheduler.scheduler.get_job(f"monitor_task_{stable_id}").next_run_time

        task = self.db.query(MonitorTask).filter(MonitorTask.id == changed_id).first()
        task.interval = 60
        self.db.commit()

        self.scheduler.sync_tasks()

        changed_job = self.scheduler.scheduler.get_job(f"monitor_task_{changed_id}")
        self.assertEqual(changed_job.trigger.interval.total_seconds(), 60)
        self.assertEqual(
            self.scheduler.scheduler.get_job(f"monitor_task_{stable_id}").next_run_time,
            stable_before,
        )

    def test_rename_does_not_reschedule(self):
        task_id = self._add_task("alpha", 600)
        self.scheduler.sync_tasks()
        job_id = f"monitor_task_{task_id}"
        first_run = self.scheduler.scheduler.get_job(job_id).next_run_time

        task = self.db.query(MonitorTask).filter(MonitorTask.id == task_id).first()
        task.name = "alpha-renamed"
        self.db.commit()

        self.scheduler.sync_tasks()

        job = self.scheduler.scheduler.get_job(job_id)
        self.assertIn("alpha-renamed", job.name)
        self.assertEqual(job.next_run_time, first_run)

    def test_deactivated_and_deleted_tasks_lose_their_jobs(self):
        keep_id = self._add_task("keep", 60)
        pause_id = self._add_task("pause", 60)
        drop_id = self._add_task("drop", 60)
        self.scheduler.sync_tasks()
        self.assertEqual(len(self._task_jobs()), 3)

        paused = self.db.query(MonitorTask).filter(MonitorTask.id == pause_id).first()
        paused.is_active = False
        self.db.commit()

        dropped = self.db.query(MonitorTask).filter(MonitorTask.id == drop_id).first()
        self.db.delete(dropped)
        self.db.commit()

        self.scheduler.sync_tasks()

        job_ids = set(self._task_jobs())
        self.assertEqual(job_ids, {f"monitor_task_{keep_id}"})
        # 兜底扫描作业不能被误删
        self.assertIsNotNone(self.scheduler.scheduler.get_job("check_active_tasks"))

    def test_user_cascade_removes_task_jobs(self):
        task_id = self._add_task("alpha", 60)
        self.scheduler.sync_tasks()
        self.assertIn(f"monitor_task_{task_id}", self._task_jobs())

        self.db.delete(self.owner)
        self.db.commit()

        self.scheduler.sync_tasks()

        self.assertEqual(self._task_jobs(), {})

    def test_repeated_scans_never_reschedule_unchanged_intervals(self):
        """每 5 分钟一次的兜底扫描不能重排作业。

        重排（reschedule_job）会按"当前时间 + interval"重新计算下次运行时间，
        长间隔任务因此会被无限推后。这里直接断言扫描期间没有发生任何重排，
        并且 next_run_time 保持原值。
        """
        task_id = self._add_task("slow", 600)
        self.scheduler.sync_tasks()

        job_id = f"monitor_task_{task_id}"
        original_run = self.scheduler.scheduler.get_job(job_id).next_run_time

        with mock.patch.object(
            self.scheduler.scheduler, "reschedule_job", wraps=self.scheduler.scheduler.reschedule_job
        ) as reschedule:
            for _ in range(5):
                self.scheduler.sync_tasks()

        self.assertEqual(reschedule.call_count, 0)
        self.assertEqual(self.scheduler.scheduler.get_job(job_id).next_run_time, original_run)
        self.assertEqual(
            self.scheduler.scheduler.get_job(job_id).trigger.interval.total_seconds(),
            600,
        )

    def test_start_is_idempotent(self):
        self.scheduler.stop()
        self.scheduler.start()
        self.assertTrue(self.scheduler.scheduler.running)

        self.scheduler.start()
        self.assertTrue(self.scheduler.scheduler.running)

    def test_scan_job_runs_sync_tasks(self):
        scan_job = self.scheduler.scheduler.get_job("check_active_tasks")
        self.assertEqual(scan_job.func, self.scheduler.sync_tasks)
        self.assertEqual(scan_job.max_instances, 1)
        self.assertTrue(scan_job.coalesce)


class SchedulerErrorHandlingTestCase(unittest.TestCase):
    def test_task_exception_does_not_escape(self):
        scheduler = MonitorScheduler()
        with mock.patch.object(
            scheduler.monitor_service,
            "check_single_task",
            side_effect=RuntimeError("boom"),
        ):
            # 采集抛错必须在调度线程里收口
            scheduler._run_task(1)


if __name__ == "__main__":
    unittest.main()
