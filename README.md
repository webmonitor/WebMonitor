<h1 align="center">WebMonitor</h1>

<p align="center">
  <strong>Page changes, delivered to your inbox.</strong>
</p>

<p align="center">
  <a href="https://webmonitor.qfpqhyl.top/">Live demo</a> ·
  <a href="#quick-start">Quick start</a> ·
  <a href="./backend/README.md">Backend docs</a> ·
  <a href="./README.zh-CN.md">简体中文</a>
</p>

<p align="center">
  <img src="./image/样例图片.png" alt="WebMonitor dashboard" width="1000">
</p>

WebMonitor is a self-hosted application for tracking web content changes. Select a page region with XPath, set a check interval, and receive email alerts when its text changes. Use it to follow prices, announcements, release notes, and other updates that matter to you.

## Features

- **Focused monitoring** — Collect rendered page text with Chromium and XPath.
- **Change history** — Review previous content, new content, and collection errors.
- **Email notifications** — Connect your own SMTP account and recipient address.
- **Public tasks** — Share monitors and subscribe with your own notification settings.
- **Unified dashboard** — Manage tasks, accounts, and blocked domains in English or Chinese.

Built with **React · FastAPI · Selenium · APScheduler · SQLAlchemy**. The frontend and API run in one Docker container.

## Quick start

Requires Docker Engine and Docker Compose.

```sh
git clone https://github.com/webmonitor/WebMonitor.git
cd WebMonitor
cp .env.example .env
```

Edit `.env` and set:

- `SECRET_KEY` — A random signing key of at least 32 characters.
- `ADMIN_PASSWORD` — A strong initial administrator password, at least 6 characters and at most 72 UTF-8 bytes.
- `ADMIN_EMAIL` — Your administrator email address.

The initial username defaults to `admin`. Existing administrator accounts are never reset by these settings.

> **Data persistence:** The default deployment stores SQLite inside the container. Mount a volume at `/app/data` before first use to retain data across container replacements.

```sh
docker compose up --build -d --wait
```

Open **[localhost:8000](http://localhost:8000/)** and sign in. The **[API reference](http://localhost:8000/docs)** is available on the same port.

## Your first monitor

1. Create a task with a URL, XPath, and check interval.
2. Use the test action to preview the extracted text.
3. For email alerts, add and test an SMTP configuration, then attach it to the task.

Enabled tasks run on schedule. The first successful check can trigger an alert; the test action only previews content and does not send email.

## Project status

This is the original XPath-based WebMonitor, maintained for legacy fixes. Active development continues in [WebMonitor-Agent](https://github.com/webmonitor/WebMonitor-Agent). The hosted demo depends on the maintainer's instance and may be offline.

## License

[CC BY-NC 4.0](./LICENSE) — Share and adapt for non-commercial use, with attribution.

Created by 秋风飘起黄叶落.
