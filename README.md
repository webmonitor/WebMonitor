<h1 align="center">WebMonitor</h1>

<p align="center">
  <strong>Follow the page. Get the update.</strong>
</p>

<p align="center">
  Watch a price, an announcement, or a release note.<br>
  WebMonitor checks the page and emails you when the text changes.
</p>

<p align="center">
  <a href="https://webmonitor.qfpqhyl.top/">Try the demo</a> ·
  <a href="#how-it-works">How it works</a> ·
  <a href="#get-started">Get started</a> ·
  <a href="./README.zh-CN.md">简体中文</a>
</p>

<p align="center">
  <img src="./image/样例图片.png" alt="WebMonitor dashboard showing monitoring tasks and recent activity" width="1000">
</p>

WebMonitor is a self-hosted web monitoring app for pages you would otherwise keep checking by hand. Choose the part of a page you care about, set a schedule, and review its updates from one dashboard. No AI service or model key is required.

## What you can follow

| Keep an eye on | Select this part of the page |
| --- | --- |
| Product prices and availability | The displayed price or stock status |
| Announcements | A notice board or news list |
| Software releases | A release heading or changelog |
| Registration deadlines | The date or instructions that may change |

Monitoring compares the text in your selected region. You choose that region with an XPath expression, which identifies an element on the page.

## How it works

1. **Choose what to watch.** Create a task with the page URL, XPath, and check interval. Use the test action to check that it captures the right text.
2. **Choose where updates go.** Add and test your SMTP email settings, then attach them to the task. You can also monitor without email and review changes in the app.
3. **Enable the task.** WebMonitor checks on schedule and records the results. When the text changes, the notification includes the previous and current content.

The first successful scheduled check can send an initial notification. Testing a task only previews its content and does not send email.

## Your monitors, in one place

- **Focus on a page region.** Track the content that matters without including unrelated text elsewhere on the page.
- **See what changed.** Review previous and current content, check history, and collection errors.
- **Use your own email.** Choose your SMTP account and recipient address for notifications.
- **Share a monitor.** Make a task public within your instance so others can subscribe with their own email settings.
- **Stay in control.** Manage and enable or disable tasks from a dashboard available in English and Chinese.

## Get started

**Explore the [live demo](https://webmonitor.qfpqhyl.top/)** or run your own instance with Docker Engine and Docker Compose. The demo is maintained separately and may be offline. Images are published for `linux/amd64` and `linux/arm64`.

```sh
git clone https://github.com/webmonitor/WebMonitor.git
cd WebMonitor
cp .env.example .env
```

The checkout supplies `docker-compose.yml`; the application itself comes from GitHub Container Registry. Set these values in `.env` before starting:

| Setting | What to enter |
| --- | --- |
| `WEBMONITOR_IMAGE` | The release you want, e.g. `ghcr.io/webmonitor/webmonitor:1.0.0`; leave it empty to build from source instead |
| `SECRET_KEY` | A random signing key of at least 32 characters |
| `ADMIN_EMAIL` | Your administrator email address |
| `ADMIN_PASSWORD` | A strong initial password: at least 6 characters, at most 72 UTF-8 bytes |

The initial username is `admin` unless you change `ADMIN_USERNAME`. Existing administrator accounts are not reset by these settings. Email delivery is configured in the app after login.

> **Keep your data:** The default deployment stores data inside the container. Add a persistent volume at `/app/data` before relying on the instance; replacing the container otherwise loses accounts, monitors, and history.

```sh
docker compose -f docker-compose.yml -f docker-compose.ghcr.yml up -d --wait
```

`docker compose pull` picks up a newer image; `docker compose up` alone keeps building from source.

Open **[localhost:8000](http://localhost:8000/)**, sign in, and create your first task.

For configuration and integration details, see the [configuration example](./.env.example), [backend documentation](./backend/README.md), and the running instance's [API reference](http://localhost:8000/docs).

<details>
<summary>Build from source instead</summary>

```sh
docker compose up --build -d --wait
```

This builds `deploy/Dockerfile` locally, which installs Chromium from Debian and takes several minutes. Development against a checkout still uses this path; `docker-compose.ghcr.yml` is only the released-image overlay.

</details>

## Prefer to describe what you want to watch?

[WebMonitor-Agent](https://github.com/webmonitor/WebMonitor-Agent) creates monitors through conversation, with a real collection preview before you confirm. It supports conditions such as a target price or a newly added list item.

This repository is the original XPath-based WebMonitor and receives maintenance fixes. Active product development continues in WebMonitor-Agent.

## License

[CC BY-NC 4.0](./LICENSE) — Share and adapt for non-commercial use, with attribution.

Created by 秋风飘起黄叶落.
