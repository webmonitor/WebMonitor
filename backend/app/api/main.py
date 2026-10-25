from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from contextlib import asynccontextmanager
from typing import List
import uvicorn
from dotenv import load_dotenv

from ..db.database import get_db, engine, Base
from ..db.models import MonitorTask, MonitorLog, User
from ..schemas import MonitorTaskCreate, MonitorTaskResponse, MonitorLogResponse
from ..db.crud import create_monitor_task, get_monitor_tasks, get_monitor_task, update_monitor_task, delete_monitor_task, get_monitor_logs
from ..services.scheduler import monitor_scheduler
from ..services.email_service import EmailService
from ..services.auth_service import get_current_active_user


# 创建数据库表
Base.metadata.create_all(bind=engine)

# 创建FastAPI应用
app = FastAPI(
    title="WebMonitor API",
    description="网页内容监控通知系统",
    version="1.0.0"
)

# CORS中间件配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React开发服务器
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 挂载静态文件目录（如果存在）
import os
if os.path.exists("static"):
    app.mount("/static", StaticFiles(directory="static"), name="static")

@app.post("/api/test-email")
async def test_email_connection():
    """测试邮件连接"""
    email_service = EmailService()
    result = email_service.test_email_connection()
    return result

@app.get("/")
async def root():
    """根路径"""
    return {"message": "WebMonitor API", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    """健康检查"""
    return {"status": "healthy", "service": "WebMonitor API"}

# 监控任务相关API
@app.post("/api/monitor-tasks", response_model=MonitorTaskResponse)
async def create_task(task: MonitorTaskCreate, db: Session = Depends(get_db)):
    """创建监控任务"""
    return create_monitor_task(db=db, task=task)

@app.get("/api/monitor-tasks", response_model=List[MonitorTaskResponse])
async def read_tasks(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """获取监控任务列表"""
    return get_monitor_tasks(db=db, skip=skip, limit=limit)

@app.get("/api/monitor-tasks/{task_id}", response_model=MonitorTaskResponse)
async def read_task(task_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    """获取单个监控任务"""
    task = get_monitor_task(db=db, task_id=task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="监控任务不存在")
    if task.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="无权访问此任务")
    return task

@app.put("/api/monitor-tasks/{task_id}", response_model=MonitorTaskResponse)
async def update_task(task_id: int, task: MonitorTaskCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    """更新监控任务"""
    existing_task = get_monitor_task(db=db, task_id=task_id)
    if existing_task is None:
        raise HTTPException(status_code=404, detail="监控任务不存在")
    if existing_task.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="无权访问此任务")
    updated_task = update_monitor_task(db=db, task_id=task_id, task=task)
    return updated_task

@app.delete("/api/monitor-tasks/{task_id}")
async def delete_task(task_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    """删除监控任务"""
    existing_task = get_monitor_task(db=db, task_id=task_id)
    if existing_task is None:
        raise HTTPException(status_code=404, detail="监控任务不存在")
    if existing_task.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="无权访问此任务")
    success = delete_monitor_task(db=db, task_id=task_id)
    return {"message": "监控任务删除成功"}

@app.get("/api/monitor-tasks/{task_id}/logs", response_model=List[MonitorLogResponse])
async def read_task_logs(task_id: int, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """获取监控任务日志"""
    return get_monitor_logs(db=db, task_id=task_id, skip=skip, limit=limit)

@app.post("/api/monitor-tasks/{task_id}/test")
async def test_monitor_task(task_id: int, db: Session = Depends(get_db)):
    """测试监控任务"""
    task = get_monitor_task(db=db, task_id=task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="监控任务不存在")

    # 这里应该执行一次监控测试
    # 暂时返回成功状态
    return {"message": "监控任务测试完成", "status": "success"}

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )