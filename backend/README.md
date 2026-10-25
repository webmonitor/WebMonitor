# WebMonitor Backend

WebMonitor 后端服务，基于 FastAPI + SQLite + Selenium 构建的网页内容监控系统。

## 项目结构

```
backend/
├── main.py                 # 应用主入口文件
├── .env.example           # 环境变量模板
├── README.md              # 项目说明
├── app/                   # 应用主目录
│   ├── __init__.py
│   ├── api/               # API路由
│   │   ├── __init__.py
│   │   └── routes.py      # API路由定义
│   ├── core/              # 核心模块
│   │   ├── __init__.py
│   │   └── config.py      # 配置设置
│   ├── db/                # 数据库模块
│   │   ├── __init__.py
│   │   ├── database.py    # 数据库连接
│   │   ├── models.py      # 数据模型
│   │   └── crud.py        # 数据库操作
│   ├── schemas/           # 数据模式
│   │   ├── __init__.py
│   │   └── schemas.py     # Pydantic模型
│   ├── services/          # 服务模块
│   │   ├── __init__.py
│   │   ├── email_service.py      # 邮件服务
│   │   ├── monitor_service.py    # 监控服务
│   │   └── scheduler.py          # 调度器
│   └── utils/             # 工具模块
│       ├── __init__.py
│       └── logger.py      # 日志工具
├── static/                # 静态文件
└── logs/                  # 日志文件
```

## 快速开始

### 1. 安装依赖
依赖清单在仓库根目录（`../pyproject.toml` 为源，`../requirements.txt` 由 `uv pip compile` 生成）：
```bash
pip install -r ../requirements.txt
```

### 2. 配置环境变量
```bash
cp .env.example .env
# 编辑 .env 文件配置邮件参数
```

### 3. 启动服务
```bash
python main.py
```

## 环境变量配置

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `SMTP_SERVER` | SMTP服务器地址 | None |
| `SMTP_PORT` | SMTP端口 | 465 |
| `SMTP_USER` | 发件人邮箱 | None |
| `SMTP_PASSWORD` | 邮箱密码/授权码 | None |
| `RECEIVER_EMAIL` | 接收通知邮箱 | None |
| `DEBUG` | 调试模式 | False |
| `LOG_LEVEL` | 日志级别 | INFO |

## API文档

启动服务后访问 http://localhost:8000/docs 查看完整的API文档。

## 主要功能模块

### API模块 (app/api/)
- **routes.py**: 定义所有API路由和端点

### 核心模块 (app/core/)
- **config.py**: 应用配置管理，使用Pydantic Settings

### 数据库模块 (app/db/)
- **database.py**: 数据库连接和会话管理
- **models.py**: SQLAlchemy数据模型定义
- **crud.py**: 数据库CRUD操作

### 服务模块 (app/services/)
- **email_service.py**: 邮件通知服务
- **monitor_service.py**: 网页监控核心服务
- **scheduler.py**: 定时任务调度器

### 数据模式 (app/schemas/)
- **schemas.py**: Pydantic数据验证模型

## 开发注意事项

1. **代码组织**: 按功能模块组织代码，便于维护
2. **配置管理**: 使用Pydantic Settings统一管理配置
3. **数据库**: 使用SQLAlchemy ORM进行数据操作
4. **异步操作**: 使用async/await处理异步任务
5. **日志记录**: 配置统一的日志系统
6. **错误处理**: 完善的异常处理机制

## 依赖说明

- **FastAPI**: 现代化的Python Web框架
- **SQLAlchemy**: Python SQL工具包和ORM
- **Pydantic**: 数据验证和设置管理
- **Selenium**: Web浏览器自动化
- **APScheduler**: 高级Python调度器
- **aiofiles**: 异步文件操作