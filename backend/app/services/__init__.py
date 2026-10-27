"""
服务模块。

业务规则都在这里；按需 `from app.services import task_service` 这样导入子模块。
包 `__init__` 不重导出任何东西——重导出会让 `import app.services` 顺带构造出
调度器这类有副作用的单例。
"""
