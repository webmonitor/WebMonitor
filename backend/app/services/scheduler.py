"""
调度器：把数据库里的活跃任务同步成 APScheduler 作业。

设计要点：
- `sync_tasks()` 是唯一的同步入口，启动、5 分钟兜底扫描、任务增删改、用户删除
  之后都调用它；
- 作业只捕获整数 `task_id`，绝不捕获 ORM 对象（会话关闭后对象会失效，而且
  闭包捕获循环变量会让所有作业都跑最后一个任务）；
- 只有 interval 变化才 reschedule，避免每 5 分钟把长间隔任务的下次运行时间
  一直往后推；
- 整个"读 DB → 改作业表"过程在同一个 RLock 内完成，防止定时扫描和请求触发
  的扫描用过期快照互相覆盖。
"""
import logging
import threading

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger

from ..db.crud import get_active_monitor_tasks
from ..db.database import SessionLocal
from .monitor_service import MonitorService

logger = logging.getLogger(__name__)

SCAN_JOB_ID = "check_active_tasks"
TASK_JOB_PREFIX = "monitor_task_"
SCAN_INTERVAL_MINUTES = 5


class MonitorScheduler:
    """监控任务调度器"""

    def __init__(self):
        self.scheduler = BackgroundScheduler()
        self.monitor_service = MonitorService()
        self._lock = threading.RLock()
        self._setup_jobs()

    @staticmethod
    def _job_id(task_id: int) -> str:
        return f"{TASK_JOB_PREFIX}{task_id}"

    def _setup_jobs(self):
        """设置每 5 分钟一次的兜底扫描作业。"""
        self.scheduler.add_job(
            func=self.sync_tasks,
            trigger=IntervalTrigger(minutes=SCAN_INTERVAL_MINUTES),
            id=SCAN_JOB_ID,
            name="检查活跃监控任务",
            replace_existing=True,
            max_instances=1,
            coalesce=True,
        )

    def _run_task(self, task_id: int) -> None:
        """执行单个任务的采集；异常在这里收口，不能打断调度线程。"""
        try:
            self.monitor_service.check_single_task(task_id)
        except Exception as exc:
            logger.error("执行任务 %s 时发生错误: %s", task_id, exc)

    def sync_tasks(self) -> None:
        """把数据库里的活跃任务同步成作业表。"""
        with self._lock:
            db = SessionLocal()
            try:
                active_tasks = get_active_monitor_tasks(db)
                active_ids = set()
                snapshots = [
                    {"id": task.id, "name": task.name, "interval": task.interval}
                    for task in active_tasks
                ]
            finally:
                db.close()

            logger.info("检查到 %s 个活跃任务", len(snapshots))

            for snapshot in snapshots:
                task_id = snapshot["id"]
                job_id = self._job_id(task_id)
                active_ids.add(job_id)
                name = f"监控任务: {snapshot['name']}"

                try:
                    job = self.scheduler.get_job(job_id)
                    if job is None:
                        self.scheduler.add_job(
                            func=self._run_task,
                            trigger=IntervalTrigger(seconds=snapshot["interval"]),
                            args=[task_id],
                            id=job_id,
                            name=name,
                            replace_existing=True,
                            max_instances=1,
                            coalesce=True,
                        )
                        logger.info(
                            "为任务 %s (ID: %s) 设置监控作业，间隔: %s秒",
                            snapshot["name"],
                            task_id,
                            snapshot["interval"],
                        )
                        continue

                    current_interval = job.trigger.interval.total_seconds()
                    if current_interval != snapshot["interval"]:
                        self.scheduler.reschedule_job(
                            job_id,
                            trigger=IntervalTrigger(seconds=snapshot["interval"]),
                        )
                        logger.info(
                            "任务 %s (ID: %s) 间隔变更为 %s秒",
                            snapshot["name"],
                            task_id,
                            snapshot["interval"],
                        )

                    if job.name != name:
                        self.scheduler.modify_job(job_id, name=name)

                except Exception as exc:
                    logger.error("为任务 %s 设置监控作业失败: %s", task_id, exc)

            for job in self.scheduler.get_jobs():
                if job.id.startswith(TASK_JOB_PREFIX) and job.id not in active_ids:
                    try:
                        self.scheduler.remove_job(job.id)
                        logger.info("移除任务作业: %s", job.id)
                    except Exception as exc:
                        logger.error("移除任务作业 %s 失败: %s", job.id, exc)

    def start(self) -> None:
        """启动调度器；失败必须抛给调用方，不能打印后继续服务。"""
        if self.scheduler.running:
            logger.info("监控调度器已在运行")
            return

        self.scheduler.start()
        self.sync_tasks()
        logger.info("监控调度器启动成功")

    def stop(self) -> None:
        """停止调度器。"""
        if not self.scheduler.running:
            return

        self.scheduler.shutdown()
        logger.info("监控调度器已停止")


# 创建全局调度器实例
monitor_scheduler = MonitorScheduler()
