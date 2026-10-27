"""
WebMonitor 后端主启动文件。

唯一进程入口：`uvicorn main:app`。日志配置只在这里做一次（stdout + LOG_LEVEL），
各服务模块只 `logging.getLogger(__name__)`。
"""
import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from app.api.auth import router as auth_router
from app.api.routes import router as api_router
from app.core.config import settings
from app.services.bootstrap import bootstrap
from app.services.errors import ServiceError
from app.services.scheduler import monitor_scheduler

logger = logging.getLogger(__name__)


def configure_logging() -> None:
    """配置根日志：stdout + 环境变量指定的级别。"""
    level = getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO)
    logging.basicConfig(
        level=level,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理：建表 → 引导管理员 → 启动调度器。"""
    configure_logging()

    bootstrap()

    monitor_scheduler.start()
    logger.info("%s v%s 启动成功", settings.APP_NAME, settings.APP_VERSION)

    try:
        yield
    finally:
        monitor_scheduler.stop()
        logger.info("%s 已关闭，监控调度器已停止", settings.APP_NAME)


app = FastAPI(
    title=settings.APP_NAME,
    description="网页内容监控通知系统 API",
    version=settings.APP_VERSION,
    lifespan=lifespan,
    debug=settings.DEBUG,
)


@app.exception_handler(ServiceError)
async def service_error_handler(request: Request, exc: ServiceError) -> JSONResponse:
    """服务层错误 → 与 HTTPException 相同的 {"detail": ...} 结构。"""
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})


# 注册API路由（先注册，保证 /api/* 不会被 SPA 兜底路由接管）
app.include_router(api_router, prefix="/api")
app.include_router(auth_router, prefix="/api")

FRONTEND_DIST = settings.FRONTEND_DIST

# CRA 产物：static/ 下是带内容哈希的 js/css，可长期缓存
if os.path.isdir(os.path.join(FRONTEND_DIST, "static")):
    app.mount(
        "/static",
        StaticFiles(directory=os.path.join(FRONTEND_DIST, "static")),
        name="frontend-static",
    )


@app.api_route(
    "/api/{rest:path}",
    methods=["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"],
    include_in_schema=False,
)
def unknown_api_path(rest: str):
    """未知的 /api/* 一律 404 JSON，绝不回落成 index.html。"""
    raise HTTPException(status_code=404, detail="Not Found")


@app.get("/", include_in_schema=False)
def frontend_index():
    """根路径返回前端首页"""
    index = os.path.join(FRONTEND_DIST, "index.html")
    if not os.path.isfile(index):
        return {
            "message": f"欢迎使用 {settings.APP_NAME}",
            "version": settings.APP_VERSION,
            "docs": "/docs",
            "status": "running",
        }
    return FileResponse(index, headers={"Cache-Control": "no-cache"})


@app.get("/health")
def health_check():
    """健康检查"""
    return {
        "status": "healthy",
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
    }


@app.get("/{full_path:path}", include_in_schema=False)
def spa_fallback(full_path: str):
    """前端路由兜底：刷新 /dashboard 等客户端路由时返回 index.html。

    必须最后注册；/api、/docs、/openapi.json 与 /static 都已先行匹配。
    """
    if full_path.startswith(("api/", "docs", "redoc", "openapi.json")):
        raise HTTPException(status_code=404, detail="Not Found")

    index = os.path.join(FRONTEND_DIST, "index.html")
    if not os.path.isfile(index):
        raise HTTPException(status_code=404, detail="Not Found")

    # 前端产物里的真实文件（favicon.svg 等）直接返回；拒绝越出产物目录的路径
    root = os.path.realpath(FRONTEND_DIST)
    candidate = os.path.realpath(os.path.join(root, full_path))
    if candidate.startswith(root + os.sep) and os.path.isfile(candidate):
        return FileResponse(candidate)
    return FileResponse(index, headers={"Cache-Control": "no-cache"})


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
        log_level=settings.LOG_LEVEL.lower(),
    )
