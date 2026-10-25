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
docker-compose up -d
```

Then open:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API docs: http://localhost:8000/docs

Default admin account:
- Username: `admin`
- Password: `admin123`

### Local development

Backend:

```bash
cd backend
pip install -r requirements.txt
python main.py
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
| `SECRET_KEY` | JWT signing key. Change this in production. | - |
| `ADMIN_USERNAME` | Default admin username | `admin` |
| `ADMIN_PASSWORD` | Default admin password | `admin123` |
| `ADMIN_EMAIL` | Default admin email | `admin@example.com` |
| `FRONTEND_URL` | Frontend origin | `http://localhost:3000` |
| `DATABASE_URL` | Database connection string | `sqlite:///./data/webmonitor.db` |
| `SMTP_SERVER` | SMTP host for notifications | - |
| `SMTP_PORT` | SMTP port | `465` |
| `SMTP_USER` | SMTP username | - |
| `SMTP_PASSWORD` | SMTP password or app password | - |
| `DEFAULT_CHECK_INTERVAL` | Default monitoring interval in seconds | `300` |

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

1. The React frontend calls the FastAPI backend through Axios.
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
