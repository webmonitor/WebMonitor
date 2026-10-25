# Repository Guidelines

Legacy v1 of a web content change-monitoring platform with email alerts. Two independent subprojects in one repo: `backend/` (FastAPI + SQLAlchemy + APScheduler + Selenium) and `frontend/` (React CRA SPA). Python 3.12, Node 18, plain JavaScript on the frontend, no migrations, no automated tests, no CI.

> Note: active development happens in the sibling `WebMonitor-Agent/` project; this repo receives maintenance/legacy fixes only.

## Project Overview

- **Purpose**: monitor a region of a web page (XPath), detect content changes, notify the owner and public-task subscribers by email. Public tasks + user subscriptions, admin dashboard (users, blacklist domains, email configs, logs).
- **Language**: code comments/docstrings are zh-CN; frontend UI is bilingual (en / zh-CN). Keep user-facing strings bilingual when editing.
- **License**: CC BY-NC 4.0 (`LICENSE`) — non-commercial use only.

## Architecture & Data Flow

```
React SPA (:3000) --axios /api/*--> FastAPI (:8000)
  routes → services → crud → SQLAlchemy models (sync)
APScheduler (BackgroundScheduler, per-task interval jobs)
  → MonitorService.check_single_task
    → Selenium headless Chromium (fresh browser per check)
    → XPath extract → diff vs task.last_content
    → MonitorLog + last_content update
    → EmailService (SMTP) on change → owner + subscribers
```

- **Backend layering** (`backend/app/`): `api/routes.py` + `api/auth.py` (HTTP, ownership/admin checks inline in handlers) → `services/` (`monitor_service.py`, `scheduler.py`, `email_service.py`, `auth_service.py`) → `db/crud.py` (flat `verb_noun` functions) → `db/models.py` (User, MonitorTask, MonitorLog, EmailConfig, BlacklistDomain, TaskSubscription). Pydantic v2 request/response models in `schemas/schemas.py`. Config in `core/config.py`; logger in `utils/logger.py`.
- **Scheduler**: module-level singleton `monitor_scheduler` (`services/scheduler.py`); a 5-minute meta-job syncs one APScheduler job per active task (`monitor_task_{id}`, `IntervalTrigger(seconds=task.interval)`); each job wraps the async `MonitorService.check_single_task` in `asyncio.run(...)` inside a sync `BackgroundScheduler`.
- **Selenium**: one new headless Chrome per scrape (`monitor_service.get_content_with_selenium`): flags `--headless --disable-gpu --no-sandbox --disable-dev-shm-usage`, 30s page load, `WebDriverWait(…, 20)` for `By.XPATH`, extracts `element.text` + `driver.title`, `quit()` in `finally`. Driver resolved by Selenium Manager (apt `chromium-driver` in image).
- **Auth**: JWT bearer (`OAuth2PasswordBearer`, `tokenUrl="auth/login"`), payload `{sub: user.id, username, is_admin}`; bcrypt hashing; tokens in the login response, client stores them — no server-side session or token blacklist (logout is client-side). Admin gate via `get_current_admin_user` dependency or in-handler `is_admin` checks.
- **Email**: per-user `EmailConfig` rows in DB; priority explicit config id → user's active config → first config → env `SMTP_*` fallback (`services/email_service.py`). SMTP_SSL :465 or starttls; failures are logged and skipped, never raised.
- **DB**: sync SQLAlchemy 2.0, `SessionLocal` + `get_db()` dependency (`db/database.py`); SQLite default, PostgreSQL by changing `DATABASE_URL` only. Schema via `create_all` at import time in `backend/main.py` — **no Alembic**; model changes have no migration path.
- **Beware**: `backend/app/api/main.py` is a legacy duplicate FastAPI app (own CORS, duplicate routes) that the real entrypoint (`backend/main.py`) does NOT use — don't add routes there.
- **Known gaps** (present, not to replicate): some endpoints lack auth (`/monitor-tasks/{id}/logs`, `/monitor-logs/latest`, `/monitor-tasks/{id}/test`, `/test-email`); admin bootstrap ignores `ADMIN_*` env vars (hardcoded `admin`/`admin123` in `main.py`); `SELENIUM_HEADLESS`/`SELENIUM_TIMEOUT`/`MIN/MAX_CHECK_INTERVAL` settings exist but are dead (values hardcoded in `monitor_service.py`).

## Key Directories

```
backend/
  main.py                # real entrypoint: create_all, admin seed, CORS, lifespan starts scheduler
  app/
    api/routes.py        # monitor-tasks, logs, email-configs, blacklist, public-tasks, subscriptions
    api/auth.py          # /auth register/login/me/users/logout
    services/            # MonitorService, MonitorScheduler, EmailService, AuthService
    db/                  # models.py, crud.py, database.py
    schemas/schemas.py   # all Pydantic v2 schemas (single module)
    core/config.py       # pydantic-settings Settings (single source of env config)
    utils/logger.py
frontend/
  src/App.js             # BrowserRouter + flat routes, MUI theme
  src/pages/             # 12 page components, one per route (Dashboard, MonitorTasks, ...)
  src/components/        # Layout, ProtectedRoute, StatCard, LanguageSwitcher, ...
  src/contexts/AuthContext.js  # useAuth(); token+user in localStorage; axios defaults
  src/locales/           # en.js, zh-CN.js (+ docs/{en,zh-CN}.js content modules for /docs page)
  src/utils/             # i18n.js helpers, date.js
  nginx.conf             # serves CRA build on :3000, proxies /api/ → webmonitor-backend:8000
image/                   # README screenshot asset
```

## Development Commands

```sh
# Docker (full stack)
docker-compose up -d                     # frontend :3000, backend :8000, API docs /docs
curl -f http://localhost:8000/health     # compose healthcheck target

# Backend local (dependency manifest lives at the repo root)
pip install -r requirements.txt
cp .env.example backend/.env             # then edit
cd backend && python main.py             # uvicorn main:app --host 0.0.0.0 --port 8000

# Frontend local
cd frontend && pnpm install && pnpm start  # CRA dev server :3000; REACT_APP_API_URL from .env.development
pnpm run build                            # production build → build/, served by nginx in Docker
```

- No lint/format commands exist (backend has no linter config; frontend eslint is CRA defaults via `package.json` eslintConfig).
- No test commands that do anything: see Testing & QA.

## Code Conventions & Common Patterns

**Backend**
- snake_case modules; service classes `XxxService` (+ `MonitorScheduler`); CRUD as module-level `verb_noun` functions; models singular PascalCase with plural `__tablename__`; routes kebab-case (`/monitor-tasks`), `/auth/*` and `/subscribe/{task_id}` exceptions.
- Errors: raise `HTTPException(status_code, detail)` with **Chinese detail strings** from routes; services return tuples/dicts/bools (e.g. `(content, error, title)`, `{"success": bool}`) rather than raising; broad `except Exception` + `logger.error`; email failures never propagate.
- All env config flows through the `Settings` singleton (`from app.core.config import settings`); never `os.getenv` directly. `BACKEND_CORS_ORIGINS` accepts comma-separated string or list.
- Async services called from sync scheduler jobs via `asyncio.run(...)`; routes may be sync (`def`) since DB/session calls are sync SQLAlchemy.

**Frontend**
- Plain JS (no TypeScript, no PropTypes). PascalCase files for components/pages matching the component; default exports everywhere except `useAuth` hook.
- Styling exclusively via MUI `sx` prop + shared `createTheme` in `App.js`; no CSS modules.
- Data: react-query v3 (`useQuery`/`useMutation`) in newer pages; older pages use `useEffect` + axios + local state — follow react-query for new pages.
- API calls: axios imported directly in pages against relative `/api/...` paths; base URL from `axios.defaults.baseURL` (`REACT_APP_API_URL`, set in `AuthContext.js`). Error extraction pattern: `err.response?.data?.detail || err.response?.data?.message`.
- Auth: `useAuth()` from `contexts/AuthContext.js`; token + user JSON in `localStorage`; wrap routes in `ProtectedRoute` (`adminOnly` prop for admin pages).
- i18n: `t()` via react-i18next with resources in `src/locales/{en,zh-CN}.js` (`fallbackLng: 'en'`); docs-page copy lives separately in `src/locales/docs/*.js` imported directly by `Documentation.js`; some pages still use inline `isChinese ? {...} : {...}` objects — prefer `t()` for new strings.

## Important Files

| File | Role |
|---|---|
| `backend/main.py` | Entrypoint: `create_all`, default-admin seed, CORS, scheduler lifespan |
| `backend/app/core/config.py` | All env vars (pydantic-settings); ground truth for configuration |
| `backend/app/api/routes.py` | All monitor/task CRUD + test endpoints |
| `backend/app/services/scheduler.py` | APScheduler job sync (`monitor_task_{id}`) |
| `backend/app/services/monitor_service.py` | Selenium scrape + change detection + notification |
| `backend/app/services/auth_service.py` | JWT/bcrypt, `get_current_user`, `get_current_admin_user` |
| `backend/app/api/main.py` | **Legacy duplicate app — do not extend** |
| `frontend/src/App.js` | Routes + MUI theme |
| `frontend/src/contexts/AuthContext.js` | Auth state, token storage, axios base config |
| `docker-compose.yml` | Two services, env defaults, healthchecks |
| `.env.example` | Env template (note: `ADMIN_*`/`FRONTEND_URL` not actually consumed) |

## Runtime/Tooling Preferences

- Python 3.12 (`python:3.12-slim` image). Dependency pins live in the repo-root `pyproject.toml`; `requirements.txt` next to it is generated by `uv pip compile --generate-hashes --python-version 3.12 --universal`. No lock file.
- Node 18 (`node:18-alpine`); pnpm 10 with committed `pnpm-lock.yaml` (`packageManager` pinned; images run `pnpm install --frozen-lockfile`); react-scripts 5.0.1 (CRA, pinned).
- Chromium comes from apt (`chromium-driver`) inside the backend image; `CHROME_BIN`/`CHROME_DRIVER` env are set there; Selenium Manager resolves the driver at runtime.
- Docker: backend container runs as non-root `appuser`; SQLite DB lives at `/app/data/webmonitor.db` with **no volume** — data does not survive container rebuilds.
- Env vars are read only via pydantic-settings `.env` (backend) and `REACT_APP_*` (frontend). `.env` is gitignored; copy from `.env.example`.

## Testing & QA

- **No automated tests and no CI** (no pytest, no `*.test.js`, no `.github/workflows`). `pnpm test` finds no tests; backend has no test runner installed.
- Verification is manual/runtime: `GET /health`, Docker healthchecks, and the built-in test endpoints — `POST /api/monitor-tasks/{id}/test`, `POST /api/test-email`, `POST /api/email-configs/{id}/test`, `POST /api/blacklist-domains/test`.
- When changing behavior, exercise the real path: run the stack, hit the affected endpoint (or `pnpm start` + browser for UI), and report observed results. If adding tests, keep them self-contained (no test infra exists to extend).
