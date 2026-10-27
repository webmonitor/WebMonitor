"""
服务层错误。

服务抛 `ServiceError`，`main.py` 统一翻译成 `{"detail": ...}`，路由里不再
重复拼 HTTPException。
"""


class ServiceError(Exception):
    """带 HTTP 语义的服务层错误"""

    def __init__(self, status_code: int, detail: str):
        super().__init__(detail)
        self.status_code = status_code
        self.detail = detail
