# WebMonitor Backend

WebMonitor 后端服务，基于 FastAPI + SQLite + Selenium 构建的网页内容监控系统。

同源发布：同一个进程既提供 `/api`，也提供前端构建产物（`FRONTEND_DIST`）。

## 项目结构

```
backend/
├── main.py                # 唯一入口：日志、lifespan（建表 → 引导管理员 → 调度器）、SPA 兜底
├── app/
│   ├── api/
│   │   ├── auth.py        # /auth 注册/登录/me/用户管理
│   │   └── routes.py      # 任务、日志、邮件配置、黑名单、公开任务、订阅
│   ├── core/
│   │   ├── config.py      # Settings（唯一的环境变量来源）
│   │   └── passwords.py   # 密码策略（最少 6 字符、UTF-8 ≤72 字节）
│   ├── db/
│   │   ├── database.py    # engine / SessionLocal / get_db
│   │   ├── models.py      # User, MonitorTask, MonitorLog, EmailConfig, BlacklistDomain, TaskSubscription
│   │   └── crud.py        # 持久化函数（不含权限判定）
│   ├── schemas/
│   │   └── schemas.py     # 全部 Pydantic 模型
│   └── services/
│       ├── task_service.py          # 任务归属、黑名单、提交后调度同步
│       ├── subscription_service.py  # 订阅的唯一写入实现
│       ├── user_service.py          # 用户唯一性冲突与删除
│       ├── monitor_service.py       # Selenium 采集 + 变化判定 + 通知
│       ├── scheduler.py             # APScheduler 作业同步
│       ├── email_service.py         # 按用户解析 SMTP 配置并发送
│       ├── auth_service.py          # 密码哈希、JWT、依赖注入
│       ├── bootstrap.py             # 建表 + 首次管理员
│       └── errors.py                # ServiceError → {"detail": ...}
└── tests → ../tests       # 测试在仓库根的 tests/
```

## 快速开始

依赖清单在仓库根目录（`../pyproject.toml` 为源，`../requirements.txt` 由 `uv pip compile` 生成）：

```bash
pip install -r ../requirements.txt
```

环境变量放在**仓库根目录**的 `.env`（`backend/.env` 是指向它的符号链接）：

```bash
cd .. && cp .env.example .env
python -c "import secrets; print(secrets.token_hex(32))"   # 填进 SECRET_KEY
```

```bash
python main.py      # 或 uvicorn main:app --host 0.0.0.0 --port 8000
```

## 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `SECRET_KEY` | JWT 签名密钥，**必填**，至少 32 字符，示例值会被拒绝 | — |
| `ADMIN_USERNAME` | 引导管理员用户名（仅在没有管理员时使用） | `admin` |
| `ADMIN_EMAIL` | 引导管理员邮箱 | `admin@example.com` |
| `ADMIN_PASSWORD` | 引导管理员密码，**首次启动必填**；已有管理员时不会重置 | — |
| `DATABASE_URL` | 数据库连接串 | `sqlite:///./data/webmonitor.db` |
| `DEBUG` | 调试模式 | `False` |
| `LOG_LEVEL` | 输出到 stdout 的日志级别 | `INFO` |
| `ALGORITHM` | JWT 算法 | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | 令牌有效期（分钟） | `30` |
| `FRONTEND_DIST` | 前端构建产物目录 | `web` |

**没有部署级 SMTP 配置。** 邮件服务器与收件人只存在数据库里，按用户各自配置
（“邮件配置”页面），因此通知只会发到用户自己填写的地址。监控任务可以不绑定
邮件配置：那样照常采集、记录日志、查看历史，只是不发邮件。

## API 文档

启动服务后访问 http://localhost:8000/docs 。
