<h1 align="center">WebMonitor</h1>

<p align="center">
  <strong>Follow the page. Get the update.</strong>
</p>

<p align="center">
  Watch a price, an announcement, or a release note.<br>
  WebMonitor checks the page and emails you when the text changes.
</p>

<p align="center">
  <a href="https://webmonitor.qfpqhyl.top/">Live demo</a> ·
  <a href="#how-it-works">How it works</a> ·
  <a href="#deploy">Deploy</a> ·
  <a href="./README.zh-CN.md">简体中文</a>
</p>

<p align="center">
  <img src="./image/样例图片.png" alt="WebMonitor dashboard showing monitoring tasks and recent activity" width="1000">
</p>

WebMonitor is a self-hosted monitor for a specific region of a web page. You choose the element with an XPath expression, set an interval, and WebMonitor opens the page in headless Chromium, compares the extracted text with the previous result, and can email you when it changes. No AI service or model key is required.

## What you can follow

| Keep an eye on | Select this part of the page |
| --- | --- |
| Product prices and availability | The displayed price or stock status |
| Announcements | A notice board or news list |
| Software releases | A release heading or changelog |
| Registration deadlines | The date or instructions that may change |

Monitoring compares the text inside the selected element. XPath identifies that element; the rest of the page is not part of the comparison.

## How it works

1. **Create a monitor task.** Enter the page URL, an XPath expression, and the check interval. The interval must be at least 10 seconds and defaults to 300 seconds. Use the test action to capture the region once and confirm the selector; testing does not send email.
2. **Add email settings when you want notifications.** An email configuration holds the SMTP server, port, sender address, password or app password, and the recipient address. A task can run without one: it still collects, records history, and shows changes in the app, but sends no email.
3. **Enable the task.** The scheduler checks it at the configured interval. Each run is written to the monitor log. When the text changes, WebMonitor records the new content and, if the task has an email configuration, sends a notification containing the previous and current content.

The first successful scheduled check can send an initial notification. Notifications go to the recipient address stored in the email configuration, not to the email address used to sign in.

## What is in the app

- **Focused monitoring.** Track one region instead of the whole page, so navigation, ads, and unrelated text do not trigger changes.
- **History and errors.** Review check results, detected changes, and collection errors in the monitor log.
- **Your own mail server.** Every user configures their own SMTP account and recipient address; there is no instance-wide SMTP fallback.
- **Public tasks.** Publish a task so other users on the instance can subscribe and receive their own email notifications.
- **Subscriptions with a quota.** Each user has a subscription limit, 10 by default, which an administrator can change.
- **Administration.** Admins can manage users, subscription quotas, and the blocked-domain list. Every user manages their own email configurations.
- **English and Chinese UI.** Switch languages from the interface.

## Deploy

You need Docker Engine and Docker Compose. WebMonitor is published as one public image at `ghcr.io/webmonitor/webmonitor`, so it can be pulled anonymously; no GitHub Container Registry login is required. The image contains the API, the built frontend, and Chromium, and is published for `linux/amd64` and `linux/arm64`. The default tag is `latest`; pin `1.0.0` if you want a fixed release.

### 1. Download the Compose file

A normal installation does not need the repository:

```sh
mkdir webmonitor
cd webmonitor
curl -fsSLo compose.yaml https://raw.githubusercontent.com/webmonitor/WebMonitor/main/compose.yaml
```

The Compose file pulls the published image and runs one `webmonitor` service. Keep it together with the `.env` file described below.

### 2. Create `.env`

Create a file named `.env` next to `compose.yaml`. This is the minimal complete template:

```dotenv
WEBMONITOR_IMAGE=ghcr.io/webmonitor/webmonitor:latest
SECRET_KEY=CHANGE_ME_AT_LEAST_32_RANDOM_CHARACTERS
ADMIN_USERNAME=admin
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=CHANGE_ME_STRONG_PASSWORD
```

Replace both `CHANGE_ME` values before starting; the placeholders are not valid secrets.

| Setting | What to enter |
| --- | --- |
| `WEBMONITOR_IMAGE` | Optional. The Compose file defaults to `ghcr.io/webmonitor/webmonitor:latest`; set `ghcr.io/webmonitor/webmonitor:1.0.0` to pin an exact release |
| `SECRET_KEY` | A random JWT signing key of at least 32 characters. Generate one with `python -c "import secrets; print(secrets.token_hex(32))"` |
| `ADMIN_USERNAME` | The initial administrator username |
| `ADMIN_EMAIL` | The administrator's email address; the template default is `admin@example.com` |
| `ADMIN_PASSWORD` | The initial administrator password: at least 6 characters, at most 72 UTF-8 bytes |

These bootstrap values are used only when the database has no administrator; an existing administrator is never reset. Email delivery is configured by each user inside the app after login.

Published tags:

| Tag | Meaning |
| --- | --- |
| `1.0.0` | An exact release; set it when you want reproducible deployments |
| `1.0` | The newest patch release of that minor version |
| `latest` | The default; the newest stable release, moving only for a stable release tag, never for a development build or prerelease |
| `main` | The development branch; moves with every push to `main` |
| `sha-<short>` | A specific commit |

### 3. Start WebMonitor

```sh
docker compose up -d --wait
```

Open **[http://localhost:8000/](http://localhost:8000/)**, sign in with the administrator account, and create your first task. The API reference is at [http://localhost:8000/docs](http://localhost:8000/docs), and the health endpoint is at [http://localhost:8000/health](http://localhost:8000/health).

Only port `8000` is exposed: the backend serves both the API and the frontend from the same origin, so there is no separate frontend container and no CORS configuration.

### Upgrade and roll back

Change `WEBMONITOR_IMAGE` in `.env` when you want a different tag, then pull and recreate:

```sh
docker compose pull
docker compose up -d --wait
```

The service uses `pull_policy: always`, so `up` also pulls before creating the container. To roll back, set `WEBMONITOR_IMAGE` to the previous tag and run the same two commands. Back up the database first; see below. There is no schema migration framework, so the database file must be preserved when switching versions.

### Data and backups

The supplied Compose file defines no volume. The SQLite database lives at `/app/data/webmonitor.db` inside the container, and the database file is the only place accounts, tasks, email configurations, subscriptions, and logs are stored. When the container is recreated — after an image tag change, `docker compose down`, or `--force-recreate` — the new container starts with an empty database. Because the service always pulls before starting, an update of `latest` can recreate the container too. `docker compose restart` keeps the existing container and its data.

Back up the database before an upgrade or rollback:

```sh
docker compose stop
docker cp webmonitor:/app/data/webmonitor.db ./webmonitor-backup-$(date +%F).db
docker compose start
```

Keep the backup outside the container and restore it at `/app/data/webmonitor.db` with write access for the container user. If you need data to survive container recreation without a manual restore, mount your own named volume at `/app/data`; the supplied file intentionally does not include one.

The backend creates missing tables at startup with SQLAlchemy `create_all`. It does not alter existing tables, and the project includes no migration tooling. Preserve the database file that belongs to the version you are running. The Compose service sets `DATABASE_URL` directly in `compose.yaml` rather than reading it from `.env`, so changing that variable in `.env` only affects local runs; a container deployment needs an explicit Compose override. SQLite is the supported database.

### Build from source (development only)

Only development and changes that are not in a released image need the repository:

```sh
git clone https://github.com/webmonitor/WebMonitor.git
cd WebMonitor
```

Create `.env` as described above, then build and start with the development override:

```sh
docker compose -f compose.yaml -f compose.build.yaml up --build -d --wait
```

This builds `deploy/Dockerfile` from the repository root. It installs Chromium from Debian and takes several minutes; the resulting image is large. A normal installation uses only `compose.yaml`; `compose.build.yaml` is the source-build override. For local backend and frontend development, see [backend/README.md](./backend/README.md).

## Prefer to describe what you want to watch?

[WebMonitor-Agent](https://github.com/webmonitor/WebMonitor-Agent) creates monitors through conversation, with a real collection preview before you confirm. It supports conditions such as a target price or a newly added list item.

This repository is the original XPath-based WebMonitor and receives maintenance fixes. Active product development continues in WebMonitor-Agent.

## License

[CC BY-NC 4.0](./LICENSE) — Share and adapt for non-commercial use, with attribution.

Created by 秋风飘起黄叶落.
