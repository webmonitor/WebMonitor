# WebMonitor Backend

WebMonitor 的后端：FastAPI + 同步 SQLAlchemy + APScheduler + Selenium，提供网页区域监控、变化记录和邮件通知。同一个进程同时提供 `/api` 和前端构建产物（`FRONTEND_DIST`），浏览器只访问一个 origin，因此没有 CORS 配置。

Python 3.12，依赖清单在仓库根目录：`pyproject.toml` 为源，`requirements.txt` 由 `uv pip compile --generate-hashes --python-version 3.12 --universal` 生成。

## 进程与入口

唯一入口是 `backend/main.py` 中的 `app`，用 Uvicorn 启动：

```bash
uvicorn main:app --host 0.0.0.0 --port 8000
```

容器镜像的 `CMD` 也是这条命令。启动流程：

1. `configure_logging()`：日志输出到 stdout，级别由 `LOG_LEVEL` 决定；这是整个后端唯一一次 `basicConfig`。
2. `lifespan` 调用 `bootstrap()`：先用 `Base.metadata.create_all` 建表，再在没有管理员时按环境变量创建引导管理员。
3. 启动模块级 `monitor_scheduler`（APScheduler `BackgroundScheduler`）。
4. 关闭时在 `finally` 中停止调度器。

路由注册顺序是 `/api` → `/static` → `/` → `/{full_path:path}`。最后的兜底路由返回 `index.html`，让前端客户端路由在刷新后仍能打开；未知的 `/api/*` 会先返回 404 JSON，不会落到 SPA。

**只运行一个 Uvicorn 进程。** 调度器和订阅写入都依赖进程内的锁，也没有独立的 worker、scheduler 或 mailer 容器。用多个 worker 启动会让每个进程各自调度任务。

## 目录结构

```text
backend/
├── main.py                # 真实入口：日志、lifespan、路由、SPA 兜底
├── app/
│   ├── api/
│   │   ├── auth.py        # /auth 注册、登录、me、用户管理
│   │   └── routes.py      # 任务、日志、邮件配置、黑名单、公开任务、订阅
│   ├── core/
│   │   ├── config.py      # Settings：唯一的环境变量来源
│   │   └── passwords.py   # 密码策略：至少 6 字符、UTF-8 不超过 72 字节
│   ├── db/
│   │   ├── database.py    # engine / SessionLocal / get_db
│   │   ├── models.py      # User, MonitorTask, MonitorLog, EmailConfig, BlacklistDomain, TaskSubscription
│   │   └── crud.py        # 持久化函数，不含权限判定
│   ├── schemas/
│   │   └── schemas.py     # 全部 Pydantic v2 模型
│   └── services/
│       ├── task_service.py          # 任务归属、黑名单、提交后触发调度同步
│       ├── subscription_service.py  # 订阅的唯一写入实现
│       ├── user_service.py          # 用户唯一性冲突与删除
│       ├── monitor_service.py       # Selenium 采集 + 变化判定 + 通知
│       ├── scheduler.py             # APScheduler 作业同步
│       ├── email_service.py         # 按用户解析 SMTP 配置并发送
│       ├── auth_service.py          # 密码哈希、JWT、依赖注入
│       ├── bootstrap.py             # 建表 + 首次管理员
│       └── errors.py                # ServiceError → {"detail": ...}
└── README.md
```

测试位于仓库根的 `tests/`，不属于后端运行依赖。

## 本地运行

在仓库根目录安装依赖，并按根目录 README 的最小模板创建 `.env`（本地运行会忽略 `WEBMONITOR_IMAGE`）：

```bash
pip install -r requirements.txt
python -c "import secrets; print(secrets.token_hex(32))"   # 填入 SECRET_KEY
```

`backend/.env` 是指向根目录 `.env` 的符号链接，因此在 `backend/` 下启动也能读到同一份配置。SQLite 不会自动创建父目录；默认连接串是 `sqlite:///./data/webmonitor.db`，相对当前工作目录解析，所以从 `backend/` 启动时先建好目录：

```bash
cd backend
mkdir -p data
python main.py
```

也可以直接执行 `uvicorn main:app --host 0.0.0.0 --port 8000`。启动后页面与 API 都在 <http://localhost:8000/>，OpenAPI 文档在 <http://localhost:8000/docs>，健康检查是 `GET /health`。

前端开发服务器单独运行时监听 `:3000`，通过 `frontend/package.json` 中的 `proxy` 把 `/api` 转发到 `127.0.0.1:8000`；生产镜像中由后端直接提供构建产物。

## 环境变量

所有环境变量只通过 `app/core/config.py` 的 `Settings`（pydantic-settings）读取，业务代码不直接调用 `os.getenv`。

| 变量名 | 说明 | 默认值 |
| --- | --- | --- |
| `SECRET_KEY` | JWT 签名密钥，**必填**，至少 32 字符；旧示例值会被拒绝 | — |
| `ADMIN_USERNAME` | 引导管理员用户名，仅在数据库没有管理员时使用 | `admin` |
| `ADMIN_EMAIL` | 引导管理员邮箱 | `admin@example.com` |
| `ADMIN_PASSWORD` | 引导管理员密码，**首次启动必填**；已有管理员时不会重置 | — |
| `DATABASE_URL` | SQLAlchemy 连接串；当前支持 SQLite。Compose 部署时该值直接写在 `compose.yaml` 中，不会读取 `.env` 的同名变量 | `sqlite:///./data/webmonitor.db` |
| `DEBUG` | 调试模式；同时开启 SQL echo | `False` |
| `LOG_LEVEL` | 输出到 stdout 的日志级别 | `INFO` |
| `ALGORITHM` | JWT 算法 | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | 访问令牌有效期（分钟） | `30` |
| `FRONTEND_DIST` | 前端构建产物目录 | `web` |

管理员引导规则：数据库里已有管理员时，引导过程直接跳过，不会修改现有密码；没有管理员且 `ADMIN_PASSWORD` 缺失、过短或超过 72 个 UTF-8 字节时，启动失败；配置的用户名或邮箱已被其他账户占用时，启动同样失败。日志只记录原因，不记录密码。

`database.py` 为 SQLite 传入 `check_same_thread=False`，依赖中也没有 PostgreSQL 驱动。设置 `DATABASE_URL` 只对本地启动生效；提供的 Compose 文件把该值固定在 `compose.yaml` 里，不插值 `.env`，容器部署若要改数据库必须显式增加 Compose override。切换到其他数据库还需要同时增加驱动并调整引擎参数，不能只改连接串。

## 调度与采集

调度器是 `app/services/scheduler.py` 中的模块级单例 `monitor_scheduler`：

- `sync_tasks()` 是唯一的同步入口。启动时、每 5 分钟的兜底扫描 `check_active_tasks`、任务创建/更新/删除以及删除用户之后都会调用它。
- 同步时先读取所有启用任务，再为每个任务维护 `monitor_task_{id}` 作业。作业参数只传整数 `task_id`，不捕获 ORM 对象或循环变量。
- 只有间隔变化时才 `reschedule_job`；改名使用 `modify_job`；已不在启用集合中的 `monitor_task_*` 作业会被移除，兜底扫描作业本身不会被移除。
- 整个“读数据库 → 修改作业表”的过程在同一把 `threading.RLock` 内完成。任务作业以 `max_instances=1, coalesce=True` 运行。

每个任务到点后调用 `MonitorService.check_single_task`：用一次新的无头 Chromium 打开页面，等待 XPath 元素，提取文字和页面标题，与任务保存的上次内容比较；结果写入 `MonitorLog`，变化时更新 `last_content` 并调用邮件服务。浏览器在 `finally` 中退出。

## 邮件通知

邮件配置只存在于数据库的 `EmailConfig` 表中，并且严格按用户隔离。发送时按以下顺序解析：

1. 任务或订阅显式指定的 `email_config_id`：必须存在且属于该用户，否则本次发送失败并记录告警，绝不回退到其他用户的配置。
2. 未指定配置：使用该用户 id 最小的配置。
3. 该用户没有任何配置：不发送，只记录一条告警。

没有部署级 SMTP 回退。环境变量不是收件人的来源，通知只会发送到用户自己在“邮件配置”页面填写的收件地址。任务的 `email_config_id` 是可选的；没有绑定配置的任务照常采集和记录日志，只是不发送邮件。支持 SMTP_SSL 或 starttls，发送失败只记录不含凭据和异常 repr 的原因。

## 数据与升级

数据层是同步 SQLAlchemy 2.0，`SessionLocal` + `get_db()` 依赖。表结构在启动时由 `create_all` 创建，缺失的表会补上，**已有表不会修改**，项目没有 Alembic 或其他迁移工具。

默认数据库是 SQLite：

- 本地从 `backend/` 启动时，数据库文件在 `backend/data/webmonitor.db`（相对当前工作目录）。
- 容器内工作目录是 `/app`，数据库文件在 `/app/data/webmonitor.db`。
- 提供的 Compose 文件没有数据卷；容器被重建后数据库为空。更新前备份需要保留的数据，并核对目标版本的数据结构，详见根目录 README 的“数据与备份”。
- 发布镜像默认使用 `latest`；需要固定版本时在 `.env` 设置 `WEBMONITOR_IMAGE=ghcr.io/webmonitor/webmonitor:1.0.3`。`compose.yaml` 使用 `pull_policy: always`，更新 `latest` 后启动也可能重建容器。

## API 文档

启动服务后访问 <http://localhost:8000/docs>。所有业务路由挂在 `/api` 下，错误统一为 `{"detail": ...}`。
