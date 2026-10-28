# Repository Guidelines

Legacy v1 of a web content change-monitoring platform with email alerts. Two independent subprojects in one repo: `backend/` (FastAPI + SQLAlchemy + APScheduler + Selenium) and `frontend/` (React CRA SPA). Python 3.12, Node 18, plain JavaScript on the frontend, no migrations, no CI. Backend/API tests are stdlib `unittest` in `tests/`.

> Note: active development happens in the sibling `WebMonitor-Agent/` project; this repo receives maintenance/legacy fixes only.

## Project Overview

- **Purpose**: monitor a region of a web page (XPath), detect content changes, notify the owner and public-task subscribers by email. Public tasks + user subscriptions, admin dashboard (users, blacklist domains, email configs, logs).
- **Language**: code comments/docstrings are zh-CN; frontend UI is bilingual (en / zh-CN). Keep user-facing strings bilingual when editing.
- **License**: CC BY-NC 4.0 (`LICENSE`) — non-commercial use only.

## Architecture & Data Flow

```
Browser --same origin (:8000)--> FastAPI
  /            -> React SPA build (index.html, static/*)
  /api/*       -> API routers
  /*           -> index.html (client-side routes)

API path inside FastAPI:
  routes → services → crud → SQLAlchemy models (sync)
APScheduler (BackgroundScheduler, per-task interval jobs)
  → MonitorService.check_single_task
    → Selenium headless Chromium (fresh browser per check)
    → XPath extract → diff vs task.last_content
    → MonitorLog + last_content update
    → EmailService (SMTP) on change → owner + subscribers
```

- **Backend layering** (`backend/app/`): `api/routes.py` + `api/auth.py` (thin: bind dependencies, call a service, serialize) → `services/` (`task_service.py`, `subscription_service.py`, `user_service.py`, `monitor_service.py`, `scheduler.py`, `email_service.py`, `auth_service.py`, `bootstrap.py`) → `db/crud.py` (flat `verb_noun` functions, no permission logic) → `db/models.py` (User, MonitorTask, MonitorLog, EmailConfig, BlacklistDomain, TaskSubscription). Pydantic v2 models in `schemas/schemas.py`. Config in `core/config.py`; password policy in `core/passwords.py`. Services raise `ServiceError(status_code, detail)` (`services/errors.py`); `main.py` translates it into `{"detail": ...}`. Package `__init__.py` files are docstrings only — no re-exports.
- **Sync end to end**: every handler that touches the DB, bcrypt, Selenium or SMTP is a plain `def` (FastAPI runs it in the thread pool). `MonitorService.check_single_task` / `test_task` / `_notify_subscribers` are synchronous; nothing calls `asyncio.run`.
- **Scheduler**: module-level singleton `monitor_scheduler` (`services/scheduler.py`). `sync_tasks()` is the only sync entry point (startup, the 5-minute `check_active_tasks` scan, task create/update/delete, user delete). Jobs are bound as `func=self._run_task, args=[task_id]` — an integer, never an ORM object or a closure over the loop variable. An existing job is only `reschedule_job`-ed when `job.trigger.interval.total_seconds() != task.interval`; renames use `modify_job`; jobs whose id starts with `monitor_task_` and are absent from the active set get removed (the scan job itself is never removed). A `threading.RLock` wraps the whole read-DB-then-mutate-jobs sequence. Task jobs run with `max_instances=1, coalesce=True`.
- **Selenium**: one new headless Chrome per scrape (`monitor_service.get_content_with_selenium`): flags `--headless --disable-gpu --no-sandbox --disable-dev-shm-usage`, 30s page load, `WebDriverWait(…, 20)` for `By.XPATH`, extracts `element.text` + `driver.title`, `quit()` in `finally`. Driver resolved by Selenium Manager (apt `chromium-driver` in image).
- **Auth**: JWT bearer (`OAuth2PasswordBearer`, `tokenUrl="/api/auth/login"`), payload `{sub: str(user.id), username}` — **the token's `is_admin` is never trusted**; authorization always re-reads the DB row. `sub` must be a positive-integer string, otherwise 401 with `WWW-Authenticate: Bearer`. Inactive accounts get 403 on an existing token and the same 401 as a bad password at login. bcrypt hashing refuses >72-byte passwords instead of truncating (`core/passwords.py`). No server-side session or token blacklist; logout is client-side only (`POST /api/auth/logout` was removed). Admin gate via `get_current_admin_user`. Public registration accepts `UserRegister` (no role/quota fields); admin creation is `POST /api/auth/users` with `UserCreate`.
- **Email**: per-user `EmailConfig` rows in DB, and nothing else. Resolution is strictly owner-scoped: an explicit `email_config_id` must exist **and belong to that user** (otherwise the send fails with a warning — never a silent fallback to someone else's config) → that user's lowest-id config → **no send at all**. There is no "first config in the table" path and no deployment-level SMTP fallback: `SMTP_*`/`RECEIVER_EMAIL` were removed from `Settings`, compose and the env templates, so a notification can only reach an address the user configured. A task's `email_config_id` is optional (`MonitorTaskCreate`), and a task without one still collects/logs — `MonitorService` skips the owner notification entirely. SMTP_SSL or starttls; failures are logged without credentials and skipped, never raised. `EmailConfigResponse` never contains the password; `PUT` without `smtp_password` keeps the stored one, and an explicit `""`/`null` is a 422. Deleting a config referenced by any task or subscription (including inactive subscriptions) is a 409.
- **DB**: sync SQLAlchemy 2.0, `SessionLocal` + `get_db()` dependency (`db/database.py`); SQLite default, PostgreSQL by changing `DATABASE_URL` only. Schema via `create_all` inside the `main.py` lifespan — **no Alembic**; model changes have no migration path.
- **Startup**: `lifespan` → `configure_logging()` (stdout + `LOG_LEVEL`, the only `basicConfig` in the tree) → `bootstrap()` (create tables, then seed an admin only if none exists) → `monitor_scheduler.start()`; shutdown stops the scheduler in a `finally`. If no admin exists and `ADMIN_PASSWORD` is missing/short, or the configured username/email collides with an existing user, startup **fails** with a value-free log line. An existing admin is never reset.
- **Scoping rules**: every private endpoint resolves the task through `task_service.require_owned_task` (404/403, admins included — these endpoints are owner-only); `/monitor-logs/latest` joins on `owner_id`; task logs return `{logs, total}` with `page`/`limit` query params; public task list/detail only return `is_public=True, is_active=True` (anything else is 404) and count only active subscriptions in the `outerjoin` ON clause.
- **Subscriptions**: `subscription_service` owns every create/reactivate/toggle/update path. The DB unique constraint on `(user_id, task_id)` means re-subscribing must reuse the existing row. Activation (new or reactivated) checks publicity and the quota; deactivation and cancellation do not require the task to still be public. A module-level `RLock` serializes the read→check→commit window (single Uvicorn process).

## Key Directories

```
backend/
  main.py                # real entrypoint: create_all, admin seed, SPA+API on one origin, lifespan starts scheduler
  app/
    api/routes.py        # monitor-tasks, logs, email-configs, blacklist, public-tasks, subscriptions
    api/auth.py          # /auth register/login/me/users (no logout route)
    services/            # task_, subscription_, user_, monitor_, email_, auth_ services, scheduler, bootstrap
    db/                  # models.py, crud.py, database.py
    schemas/schemas.py   # all Pydantic v2 schemas (single module)
    core/config.py       # pydantic-settings Settings (single source of env config)
    core/passwords.py    # min length + 72-byte bcrypt limit, shared by schemas and bootstrap
frontend/
  src/App.js             # BrowserRouter + flat routes, MUI theme
  src/pages/             # 12 page components, one per route (Dashboard, MonitorTasks, ...)
  src/components/        # Layout, ProtectedRoute, StatCard, LanguageSwitcher, ...
  src/api/               # client.js (single axios instance, token, 401 handler, error text) + queryKeys.js
  src/contexts/AuthContext.js  # useAuth(); token in memory + localStorage; refreshUser(); 401 clears the session
  src/locales/           # en.js, zh-CN.js (+ docs/{en,zh-CN}.js content modules for /documentation page)
  src/utils/             # i18n.js helpers, date.js
deploy/
  Dockerfile             # multi-stage: CRA build → FastAPI+Chromium runtime that serves both (context: repo root)
image/                   # README screenshot asset
```

## Development Commands

```sh
# Docker (full stack)
docker-compose up -d                     # single container: UI + API on :8000, docs at /docs
curl -f http://localhost:8000/health     # compose healthcheck target

# Backend local (dependency manifest lives at the repo root)
pip install -r requirements.txt
cp .env.example .env                     # repo root; SECRET_KEY + ADMIN_PASSWORD are required
cd backend && python main.py             # uvicorn main:app --host 0.0.0.0 --port 8000

# Frontend local
cd frontend && pnpm install && pnpm start  # CRA dev server :3000, proxies /api to :8000 (package.json "proxy")
pnpm run build                            # production build → build/, copied into the single Docker image
```

- No lint/format commands exist (backend has no linter config; frontend eslint is CRA defaults via `package.json` eslintConfig).
- No test commands that do anything: see Testing & QA.

## Code Conventions & Common Patterns

**Backend**
- snake_case modules; service classes `XxxService` (+ `MonitorScheduler`); CRUD as module-level `verb_noun` functions; models singular PascalCase with plural `__tablename__`; routes kebab-case (`/monitor-tasks`), `/auth/*` and `/subscribe/{task_id}` exceptions.
- Errors: services raise `ServiceError(status_code, detail)` with **Chinese detail strings**; routes raise `HTTPException` only for request-shape problems. `monitor_service.get_content_with_selenium` returns `(content, error, title)` and email failures never propagate. Log reasons only — never passwords, tokens, or request bodies.
- All env config flows through the `Settings` singleton (`from app.core.config import settings`); never `os.getenv` directly. There is no CORS setting: the SPA and the API are served from the same origin.
- The whole stack is synchronous: routes are `def`, the scheduler calls `check_single_task` directly, and there is no `asyncio.run` anywhere. Only the `lifespan` is `async`.

**Frontend**
- Plain JS (no TypeScript, no PropTypes). PascalCase files for components/pages matching the component; default exports everywhere except `useAuth` hook.
- Styling exclusively via MUI `sx` prop + shared `createTheme` in `App.js`; no CSS modules. MUI is **v9**: use `Grid size={{ xs, sm, md }}` (no `item`/`xs` props), `slotProps` (`input`/`htmlInput`/`select`/`paper`) instead of `InputProps`/`inputProps`/`SelectProps`/`PaperProps`/`primaryTypographyProps`, and demo/page design tokens such as `color="text.secondary"` belong in `sx` (the shorthand prop is `textSecondary`).
- Data: TanStack Query v5 everywhere (`useQuery({ queryKey, queryFn, ... })`, `useMutation({ mutationFn, onSuccess })`, `invalidateQueries({ queryKey })`, `isPending`). Query keys come from `src/api/queryKeys.js` and are user-scoped (`keys.tasks(uid)`, `keys.emailConfigs(uid, 'full'|'simple')`, ...). Query `queryFn` must forward the abort `signal`; user-scoped queries set `enabled: !!user`.
- API calls: **only** `src/api/client.js` imports axios. Pages use the default `api` instance against relative `/api/...` paths and `getApiErrorMessage(error, fallback)` for user-facing text. Never add a second axios import or read `err.response.data.detail` by hand.
- Auth: `useAuth()` from `contexts/AuthContext.js` exposes `{user, loading, login, logout, refreshUser, isAuthenticated, isAdmin}`. `login()`/`logout()` are async — await them before navigating. The token lives in module memory (set via `setAccessToken`) and is mirrored to `localStorage`; the cached `user` JSON is never used for authorization, the app re-validates with `GET /auth/me`. `ProtectedRoute` takes only `adminOnly` and renders children through `<Outlet />`; `Layout` also uses `<Outlet />`, so the shell mounts once and only the page swaps.
- i18n: a single `translation` namespace in `src/locales/{en,zh-CN}.js`, keys are dot paths grouped per page (`tasks.title`, `logs.paginationSummary`, ...). Both files must stay in sync — every `t('...')` key must exist in both. Long-form docs copy stays in `src/locales/docs/*.js`. Inline `isChinese ? {...} : {...}` objects are gone; do not reintroduce them. Arrays use `{ returnObjects: true }`; JSX/icons/colors never live in the locale.

## Important Files

| File | Role |
|---|---|
| `backend/main.py` | Entrypoint: `create_all`, default-admin seed, SPA static serving + catch-all, scheduler lifespan |
| `backend/app/core/config.py` | All env vars (pydantic-settings); ground truth for configuration |
| `backend/app/api/routes.py` | All monitor/task CRUD + test endpoints |
| `backend/app/services/scheduler.py` | APScheduler job sync (`monitor_task_{id}`) |
| `backend/app/services/monitor_service.py` | Selenium scrape + change detection + notification |
| `backend/app/services/auth_service.py` | JWT/bcrypt, `get_current_user`, `get_current_admin_user` |
| `frontend/src/App.js` | Routes + MUI theme |
| `frontend/src/contexts/AuthContext.js` | Auth state, token storage, axios base config |
| `docker-compose.yml` | One `webmonitor` service on :8000, env defaults, healthcheck |
| `deploy/Dockerfile` | Single multi-stage build definition (context: repo root); backend serves the SPA, no reverse proxy, no CORS |
| `backend/app/services/bootstrap.py` | Table creation + first-admin seeding rules |
| `backend/app/services/subscription_service.py` | Only implementation of subscribe/reactivate/toggle/update |
| `.env.example` | Env template; `SECRET_KEY` and `ADMIN_PASSWORD` are intentionally blank (no usable weak default) |

## Runtime/Tooling Preferences

- Python 3.12 (`python:3.12-slim` image). Dependency pins live in the repo-root `pyproject.toml`; `requirements.txt` next to it is generated by `uv pip compile --generate-hashes --python-version 3.12 --universal`. No lock file.
- Node 18 (`node:18-alpine`); pnpm 10 with committed `pnpm-lock.yaml` (`packageManager` pinned; images run `pnpm install --frozen-lockfile`); react-scripts 5.0.1 (CRA, pinned).
- Frontend stack after the dependency upgrade: React 19.3, MUI 9.5 (`@mui/material` + `@mui/icons-material`), TanStack Query 5, react-router-dom 6.30 (v7 needs Node ≥20, so it stays on 6), i18next 26 + react-i18next 17, framer-motion 14, axios 1.20. `devDependencies` are limited to what CRA's bundled eslint/fork-ts-checker actually need (`eslint-plugin-jest` 25.7, `typescript` 4.9.5); raising either breaks `react-scripts` peer resolution. `@mui/x-data-grid`, `@mui/x-date-pickers` and `web-vitals` were unused and removed.
- Chromium comes from apt (`chromium` + `chromium-driver`) inside the backend image; Selenium Manager resolves the driver from `PATH` (no `CHROME_BIN`/`CHROME_DRIVER` env).
- Docker: backend container runs as non-root `appuser`; SQLite DB lives at `/app/data/webmonitor.db` with **no volume** — data does not survive container rebuilds.
- Env vars are read only via pydantic-settings `.env` (backend) and `REACT_APP_*` (frontend). The real `.env` lives at the repo root and is gitignored; `backend/.env` is a symlink to it so `cd backend && python main.py` finds the same values. Both are excluded from the Docker build context by `.dockerignore` (`**/.env*`, with `.env.example` re-included).
- **Single image, single origin.** `deploy/Dockerfile` is multi-stage: it builds the CRA bundle and copies it next to the backend, and `backend/main.py` serves it (`FRONTEND_DIST`, default `web/`) on the same port as `/api`. Consequences:
  - Only one container and one port (`8000`); `docker compose up -d` starts `webmonitor` alone.
  - No CORS middleware and no `BACKEND_CORS_ORIGINS`; none is needed because browser and API share an origin.
  - Axios uses relative `/api/...` URLs (`axios.defaults.baseURL = ''`). Local `pnpm start` relies on CRA's `"proxy": "http://127.0.0.1:8000"`; there is no `REACT_APP_API_URL` any more.
  - `backend/main.py` registers `/api` routers first, then mounts `/static` for hashed assets, then a `/{full_path:path}` catch-all that returns `index.html` so client-side routes survive a hard refresh. Any new non-API route must be registered before that catch-all.

## Testing & QA

- **No automated tests and no CI** (no pytest, no `*.test.js`, no `.github/workflows`). `pnpm test` finds no tests; backend has no test runner installed.
- **`tests/` (stdlib `unittest`, no extra dependencies)** — `support.py` builds an isolated temp SQLite + real uvicorn thread (empty `ProxyHandler`); run everything with `python -m unittest discover -s tests -p 'test_*.py'`. Coverage: scheduler job binding/reschedule/removal (`test_scheduler.py`), auth + ownership + log pagination + public tasks + email config protocol (`test_api.py`), subscription state machine (`test_subscriptions.py`), settings/password/bootstrap (`test_bootstrap.py`).
- **`tests/smoke_runtime.py`** is the behavioral acceptance run: local HTTP fixture + loopback SMTP sink + real Selenium + real scheduler. `--serve` keeps the stack up for browser checks. It prints pass/fail lines and exits non-zero on failure.
- Ad-hoc runtime checks: `GET /health`, and the authorized test endpoints — `POST /api/monitor-tasks/{id}/test`, `POST /api/email-configs/{id}/test`, `POST /api/blacklist-domains/test` (`/api/test-email` was removed).
- When changing behavior, exercise the real path: run the stack, hit the affected endpoint (or `pnpm start` + browser for UI), and report observed results. If adding tests, keep them self-contained (no test infra exists to extend).
