# WebMonitor

<h3 align="center">Web content change monitoring platform</h3>

<p align="center">
  <img src="./image/样例图片.png" alt="WebMonitor Dashboard" width="800">
</p>

---

English | [简体中文](./README.zh-CN.md)

## Online demo

**URL**: https://webmonitor.qfpqhyl.top/

> The backend service is currently hosted on the maintainer's MacBook M4 Air. Availability may vary depending on the local Docker runtime. For stable use, self-hosting is recommended.

---

## Overview

WebMonitor is a web content monitoring and email notification platform built with a React frontend and FastAPI backend. It can monitor specific areas of a page with XPath, detect content changes, and send email alerts automatically.

## Key features

- Monitor web page content changes with XPath-based targeting
- Send email notifications when changes are detected
- Support public tasks and user subscriptions
- Provide a visual management dashboard for tasks, logs, users, and settings
- Support Docker-based deployment
- Support Chinese and English in the frontend UI

---

## Tech stack

**Frontend**
- React
- Material UI
- React Query
- Axios
- react-i18next

**Backend**
- FastAPI
- SQLAlchemy
- APScheduler
- Selenium WebDriver

**Deployment**
- Docker
- Docker Compose
- SQLite by default, PostgreSQL supported in production

---

## Quick start

### Docker deployment

```bash
git clone https://github.com/webmonitor/WebMonitor.git
cd WebMonitor
cp .env.example .env
# 编辑 .env：SECRET_KEY 与 ADMIN_PASSWORD 都是必填项
docker-compose up -d
```

Then open:
- Web UI: http://localhost:8000/
- API docs: http://localhost:8000/docs

The frontend is served by the same FastAPI process as the API, so the browser
only talks to one origin and no CORS configuration exists.

The first start creates the admin account from `ADMIN_USERNAME` /
`ADMIN_EMAIL` / `ADMIN_PASSWORD` in `.env`:

- Username: `admin` (or whatever `ADMIN_USERNAME` says)
- Password: whatever you put in `ADMIN_PASSWORD`

There is no built-in default password: if no admin exists and `ADMIN_PASSWORD`
is empty, the container refuses to start. Once an admin exists these variables
are ignored, so an existing password is never reset.

### Local development

Backend:

```bash
# 依赖清单在仓库根目录（pyproject.toml 为源，requirements.txt 由 uv pip compile 生成）
# 工作区共用 conda 环境（Python 3.12），见 ../.github/env/environment.yml
conda activate webmonitor
pip install -r requirements.txt
cd backend && python main.py
```

Frontend:

```bash
cd frontend
pnpm install
pnpm start
```

---

## Environment configuration

Copy `.env.example` to `.env` and update the values as needed.

### Core settings

| Variable | Description | Default |
| --- | --- | --- |
| `SECRET_KEY` | JWT signing key. **Required**, at least 32 characters; example values are rejected. | - |
| `ADMIN_USERNAME` | Bootstrap admin username (used only when no admin exists) | `admin` |
| `ADMIN_PASSWORD` | Bootstrap admin password. **Required on first start**; startup fails if no admin exists and this is empty. Never resets an existing admin. | - |
| `ADMIN_EMAIL` | Bootstrap admin email | `admin@example.com` |
| `DATABASE_URL` | Database connection string | `sqlite:///./data/webmonitor.db` |
| `SMTP_SERVER` | Deployment-level SMTP fallback host (used only for users with no email config) | - |
| `SMTP_PORT` | SMTP port | `465` |
| `SMTP_USER` | SMTP username | - |
| `SMTP_PASSWORD` | SMTP password or app password | - |
| `RECEIVER_EMAIL` | Fallback notification recipient | - |
| `LOG_LEVEL` | Log level written to stdout | `INFO` |
| `FRONTEND_DIST` | Directory containing the built SPA | `web` |

Generate a signing key with:

```sh
python -c "import secrets; print(secrets.token_hex(32))"
```

See `.env.example` for the current full configuration template.

---

## Common use cases

- Track product price changes
- Watch website announcements or policy updates
- Monitor competitor pages
- Follow any page region that matters to your workflow

---

## Project structure

```text
backend/   FastAPI API, database models, services, scheduler
frontend/  React application, pages, components, i18n resources
image/     Screenshots and assets used in documentation
```

---

## Architecture summary

1. FastAPI serves the built React frontend and the API from one origin; the React app calls `/api/...` through Axios with relative URLs.
2. Authentication is handled with JWT.
3. Monitoring tasks are stored in the database through SQLAlchemy.
4. APScheduler triggers monitoring jobs in the background.
5. Selenium loads and checks target pages.
6. Email notifications are sent when content changes are detected.

---

## Documentation

- Chinese documentation: [README.zh-CN.md](./README.zh-CN.md)
- Backend API docs: `http://localhost:8000/docs`

---

## License

[CC BY-NC 4.0](LICENSE) - Personal and non-commercial use only.

---

<p align="center">
  Made by 秋风飘起黄叶落
</p>
