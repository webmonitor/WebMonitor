"""
WebMonitor 后端主启动文件
"""
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.db.database import engine, SessionLocal
from app.db.models import Base, User
from app.api.routes import router as api_router
from app.api.auth import router as auth_router
from app.services.scheduler import monitor_scheduler
from app.services.auth_service import get_password_hash

# 创建数据库表
Base.metadata.create_all(bind=engine)

# 自动创建管理员用户
def create_default_admin():
    """如果不存在管理员用户，则创建默认管理员"""
    db = SessionLocal()
    try:
        # 检查是否已存在管理员用户
        admin_user = db.query(User).filter(User.is_admin == True).first()
        if admin_user:
            print(f"✅ 管理员用户已存在: {admin_user.username}")
            return

        # 创建默认管理员用户
        default_password = "admin123"  # 默认密码，用户首次登录后应修改

        # 调试信息
        print(f"🔧 正在创建管理员用户，密码长度: {len(default_password)}")

        # bcrypt限制密码最长72字节，手动截断以防万一
        if len(default_password) > 72:
            default_password = default_password[:72]
            print(f"⚠️ 密码已截断为: {len(default_password)} 字节")

        try:
            hashed_password = get_password_hash(default_password)
            print(f"✅ 密码哈希生成成功")
        except Exception as e:
            print(f"❌ 密码哈希生成失败: {e}")
            print(f"错误类型: {type(e)}")
            raise

        admin_user = User(
            username="admin",
            email="admin@webmonitor.com",
            hashed_password=hashed_password,
            full_name="系统管理员",
            is_active=True,
            is_admin=True
        )

        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)

        print("🔧 已创建默认管理员用户:")
        print(f"   用户名: admin")
        print(f"   邮箱: admin@webmonitor.com")
        print(f"   密码: admin123")
        print("⚠️  请首次登录后立即修改密码！")

    except Exception as e:
        print(f"❌ 创建管理员用户失败: {e}")
        db.rollback()
    finally:
        db.close()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    # 创建默认管理员用户
    create_default_admin()

    # 启动监控调度器
    monitor_scheduler.start()
    print(f"🚀 {settings.APP_NAME} v{settings.APP_VERSION} 启动成功")
    print("📊 监控调度器已启动")
    yield
    # 停止监控调度器
    monitor_scheduler.stop()
    print("🛑 WebMonitor API已关闭，监控调度器已停止")

# 创建FastAPI应用
app = FastAPI(
    title=settings.APP_NAME,
    description="网页内容监控通知系统 API",
    version=settings.APP_VERSION,
    lifespan=lifespan,
    debug=settings.DEBUG
)

# 前端构建产物目录。默认 web/（镜像里把 CRA 的 build/ 拷到这里），
# 前后端同源发布，浏览器只访问这一个 origin。
FRONTEND_DIST = os.environ.get("FRONTEND_DIST", "web")

# 注册API路由（先注册，保证 /api/* 不会被 SPA 兜底路由接管）
app.include_router(api_router, prefix="/api")
app.include_router(auth_router, prefix="/api")

# CRA 产物：static/ 下是带内容哈希的 js/css，可长期缓存
if os.path.isdir(os.path.join(FRONTEND_DIST, "static")):
    app.mount(
        "/static",
        StaticFiles(directory=os.path.join(FRONTEND_DIST, "static")),
        name="frontend-static",
    )


@app.get("/", include_in_schema=False)
async def frontend_index():
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
async def health_check():
    """健康检查"""
    return {
        "status": "healthy",
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION
    }


@app.get("/{full_path:path}", include_in_schema=False)
async def spa_fallback(full_path: str):
    """前端路由兜底：刷新 /dashboard 等客户端路由时返回 index.html。

    必须最后注册；/api、/docs、/openapi.json 与 /static 都已先行匹配。
    """
    # 未知的 API 路径必须是 404 JSON，不能回落成 index.html
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
        log_level=settings.LOG_LEVEL.lower()
    )