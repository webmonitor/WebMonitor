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
  <a href="#install">Install</a> ·
  <a href="#create-your-first-monitor">First monitor</a> ·
  <a href="#email-notifications">Email</a> ·
  <a href="./README.zh-CN.md">简体中文</a>
</p>

<p align="center">
  <img src="./image/样例图片.png" alt="WebMonitor dashboard showing monitoring tasks and recent activity" width="1000">
</p>

WebMonitor is a self-hosted service that watches one region of a web page. You give it a page address and an XPath, choose how often to check, and read the result in the web app. When the selected text changes, WebMonitor can email you. You do not need an AI service, a model key, or a GitHub account.

## What you need

- Docker Engine with the Compose plugin, so `docker compose version` works.
- Port `8000` free on the machine that runs WebMonitor.
- The page address and the XPath of the part you want to watch.
- For notifications: the SMTP server, port, sender account, password or app password, and the recipient address from your mail provider.

A normal installation downloads one Compose file, uses one `.env` you write, and starts with one command.

## What you can follow

| Keep an eye on | Select this part of the page |
| --- | --- |
| Product prices and availability | The displayed price or stock status |
| Announcements | A notice board or news list |
| Software releases | A release heading or changelog |
| Registration deadlines | The date or instructions that may change |

Only the text inside the selected element is compared. Navigation, ads, and the rest of the page are ignored. Pages that fill in content with JavaScript are supported.

## Install

### 1. Download the Compose file

```sh
mkdir webmonitor
cd webmonitor
curl -fsSLo compose.yaml https://raw.githubusercontent.com/webmonitor/WebMonitor/main/compose.yaml
```

You now have a directory that contains `compose.yaml`. The file pulls the public image `ghcr.io/webmonitor/webmonitor:latest` and runs one container named `webmonitor`.

### 2. Create `.env`

Create a file named `.env` next to `compose.yaml` and paste this complete template:

```dotenv
# Public image; no registry login is needed.
# Pin a fixed release instead of latest if you prefer: ghcr.io/webmonitor/webmonitor:1.0.1
WEBMONITOR_IMAGE=ghcr.io/webmonitor/webmonitor:latest

# Required. A random signing key of at least 32 characters.
SECRET_KEY=CHANGE_ME_AT_LEAST_32_RANDOM_CHARACTERS

# The first administrator account. Used only when the database has no administrator.
ADMIN_USERNAME=admin
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=CHANGE_ME_STRONG_PASSWORD

# Optional.
DEBUG=false
LOG_LEVEL=INFO
```

Replace both `CHANGE_ME` values before starting.

| Setting | What to enter |
| --- | --- |
| `WEBMONITOR_IMAGE` | Optional. The Compose file already defaults to `ghcr.io/webmonitor/webmonitor:latest`; set a fixed tag such as `ghcr.io/webmonitor/webmonitor:1.0.1` when you want reproducible updates |
| `SECRET_KEY` | Required. Any random string of at least 32 characters. Generate one with `python -c "import secrets; print(secrets.token_hex(32))"` or `openssl rand -hex 32` |
| `ADMIN_USERNAME` | The initial administrator username |
| `ADMIN_EMAIL` | The administrator's email address |
| `ADMIN_PASSWORD` | The initial administrator password: at least 6 characters, at most 72 UTF-8 bytes |
| `DEBUG` | Optional. Leave `false` |
| `LOG_LEVEL` | Optional. Leave `INFO` unless you are diagnosing a problem |

The administrator values are read only when the database has no administrator. Changing them later does not change an existing login.

Email is not configured in `.env`. After signing in, every user adds their own SMTP account in the app; see [Email notifications](#email-notifications).

### 3. Start WebMonitor

```sh
docker compose up -d --wait
```

The command pulls the image anonymously, starts the container, and returns when its health check passes. The first start takes a moment while the image is downloaded.

Open **[http://localhost:8000/](http://localhost:8000/)** and sign in with the `ADMIN_USERNAME` and `ADMIN_PASSWORD` from `.env`. You land on the Dashboard.

If the command fails:

- Read its last lines first. A missing `SECRET_KEY` stops Compose before any container is created. Fix `.env` and run the same command again.
- On a fresh database, an empty `ADMIN_PASSWORD` is rejected during startup. If a container was created but never becomes healthy, run `docker compose logs webmonitor` and read the last lines.
- If port `8000` is already in use, stop the other program, or change the left side of `"8000:8000"` in `compose.yaml` and open the new port instead.

## Create your first monitor

### 1. Open the task dialog

In the left menu, open **Monitor tasks** and click **Create task**.

### 2. Fill in the form

| Field | What it means |
| --- | --- |
| **Task name** | A label you will recognize in the list |
| **Monitor URL** | The full page address, starting with `http://` or `https://` |
| **XPath selector** | The element whose text you want to follow |
| **Check interval (seconds)** | How often the page is loaded. Default `300`; minimum `10` |
| **Email config** | A saved email configuration, or **No notifications** |
| **Task description** | Optional; visible to other users when the task is public |
| **Public task** | Optional; lets other users subscribe |
| **Enable monitoring** | Starts the schedule. Turn it off if you want to test the selector first |

### 3. Save and test the XPath

Click **Create task**. You see **Monitor task created**, and the task appears in the list with a **Running** or **Paused** status.

Click **Test monitor** on the task row. A message shows **Test succeeded! Content:** followed by the beginning of the captured text, or **Test failed**.

- A test loads the page once. It sends no email, writes no log entry, and does not change the saved result.
- If the test fails or the content preview is empty, the page may not have loaded, or the XPath found nothing. Copy the XPath again in your browser, shorten it to a stable attribute, then use **Edit task** to correct it. Section [When something fails](#when-something-fails) has the full checklist.
- If you turned off **Enable monitoring**, open **Edit task**, turn it on, and click **Update task** once the test looks right.

### 4. See the first result

The first scheduled check runs about one interval after the task is saved or enabled. Because nothing was stored before it, that entry is recorded as **Changed** and, when an **Email config** is attached, one initial email is sent. After that, entries are **Unchanged** unless the text changes or a check fails.

Open **Monitor logs**, choose the task in **Select monitor task**, and read **Checked at**, **Status**, **New content**, and **Error message**. **Dashboard** shows the totals, the recent changes, and the success rate.

## Email notifications

### 1. Add an SMTP account

Open **Email configuration** and click **Add email config**. Fill in:

| Field | What to enter |
| --- | --- |
| **Config name** | A label that will appear in the task and subscription dropdowns |
| **SMTP server** | The host name from your mail provider, for example `smtp.gmail.com` |
| **SMTP port** | Usually `465` with **Use SSL encryption** on, or `587` with it off |
| **Sender email** | The account that sends the mail |
| **SMTP password** | The password or app password of that account |
| **Receiver email** | Where notifications arrive |
| **Use SSL encryption** | On for port `465`; off for port `587`, which upgrades the connection with STARTTLS |

Common providers:

| Provider | Server | Port |
| --- | --- | --- |
| Gmail | `smtp.gmail.com` | `465` with SSL, or `587` with SSL off; use an app password |
| QQ Mail | `smtp.qq.com` | `465` with SSL; enable SMTP and use an authorization code |
| 163 Mail | `smtp.163.com` | `465` with SSL; enable SMTP and use a client authorization password |
| Outlook / Hotmail | `smtp.office365.com` | `587` with SSL off |

Most providers reject your normal mailbox password and require an app password or authorization code.

### 2. Test it

Save the configuration, then click **Test connection** on its row. WebMonitor connects to the server and sends exactly one test email to that row's **Receiver email**.

- **Test email sent successfully** means the outgoing mail server accepted the message. If it is missing from your inbox, check spam and the recipient address.
- **Test email failed** means the server, port, **Use SSL encryption** setting, account, or password was rejected.

### 3. Attach it to a task

Open **Edit task**, choose the configuration in **Email config**, and click **Update task**. The default **No notifications** keeps checking and logging without sending mail.

Configurations belong to the account that created them. A public task's subscribers choose their own configuration when they subscribe, so notifications never go through the task owner's mailbox.

## Public tasks and subscriptions

Turn on **Public task** in a task's create or edit dialog to let other users on the instance find it. It appears on the **Public tasks** page while it is public and running.

To follow someone else's public task:

1. Open **Public tasks**.
2. Click **Subscribe** on the task.
3. In **Choose email configuration**, pick one of your own configurations.
4. Click **Confirm subscription**.

You need at least one email configuration before subscribing; the dialog tells you when none exists. Changes are mailed to the **Receiver email** of the configuration you choose.

**My subscriptions** lists every subscription. You can turn notifications on or off, switch the email configuration, or cancel the subscription. A disabled subscription keeps its record but stops email, and you can still cancel it after the owner pauses the task or makes it private.

Each account may hold 10 enabled subscriptions by default; **Public tasks** shows your **Remaining slots**. Disabled subscriptions do not use a slot. An administrator can raise your limit in **User management** under **Max subscriptions**.

## Pause, edit, and delete a task

- To pause, open **Edit task**, turn off **Enable monitoring**, and click **Update task**. The status becomes **Paused**; scheduled checks stop, while the stored result and logs stay. Turn it back on to resume.
- To change the URL, XPath, interval, email configuration, description, or public setting, use **Edit task** and then **Update task**.
- To verify the selector after an edit, click **Test monitor**; the message previews the captured content.
- **Delete task** asks for confirmation, then removes the task with its monitor logs.

## When something fails

| What you see | What it means | What to do |
| --- | --- | --- |
| **Test failed** | The page did not load, or the XPath matched nothing | Open the page in your browser, inspect the element, and copy a shorter XPath; test `//body` to prove the page loads |
| **Content** preview is empty | The element exists but has no text at that moment | Wait for asynchronous content, or select the element that actually contains the text |
| No log entry after creating a task | The first check has not run yet | Wait one interval; a task that is **Paused** never checks |
| Status **Error** | A scheduled check failed | Read **Error message** in **Monitor logs**; a timeout points to the page or network, a selector error points to the XPath |
| **Test email failed** | SMTP connection, login, or the SSL/port pair was rejected | Check server, port, **Use SSL encryption**, sender account, and app password |
| Log shows **Changed**, but no email | The task uses **No notifications**, a subscription has notifications disabled, or the receiver is different | Attach a configuration to the task, enable subscription notifications, and check the **Receiver email** and spam folder |
| **Subscribe** is refused | Your account has no free subscription slot | Disable or cancel subscriptions in **My subscriptions**, or ask an administrator to raise **Max subscriptions** |
| **Create task** is refused | The domain is on the blacklist, the URL lacks a scheme, or a field is invalid | Use the full `http://` or `https://` URL and pick an allowed domain, or ask an administrator about **Blacklist management** |

## Data, backup, and updates

The supplied `compose.yaml` defines no volume. The database lives at `/app/data/webmonitor.db` inside the container, and it is the only place accounts, tasks, email configurations, subscriptions, and logs are stored.

Recreating the container starts with an empty database. That happens after an image tag change, `docker compose down`, `--force-recreate`, or an update of `latest`, because the service always pulls before starting. `docker compose restart` keeps the existing container and its data.

### Back up

```sh
docker compose stop
docker cp webmonitor:/app/data/webmonitor.db ./webmonitor-backup.db
docker compose start
```

Keep the backup outside the container. To restore it:

```sh
docker compose stop
docker cp ./webmonitor-backup.db webmonitor:/app/data/webmonitor.db
docker compose start
```

A file copied into the container is owned by root, while the app runs as `appuser`. If the app cannot write the restored database, fix the owner and restart:

```sh
docker compose exec -u root webmonitor chown appuser:appuser /app/data/webmonitor.db
docker compose restart
```

### Update or roll back

Back up first, then set `WEBMONITOR_IMAGE` in `.env` to the new tag and run the same start command:

```sh
docker compose up -d --wait
```

To roll back, set `WEBMONITOR_IMAGE` to the previous tag and run the same command. Different versions do not upgrade the database automatically, so use the database file created by the version you run.

### Keep data across container recreation

If you want updates to keep data automatically, mount a named volume at `/app/data`. Add this next to `compose.yaml` as `docker-compose.override.yml`:

```yaml
services:
  webmonitor:
    volumes:
      - webmonitor-data:/app/data
volumes:
  webmonitor-data:
```

`docker compose up -d --wait` reads that override automatically. Back up before adding it to an instance that already has data: switching to a volume recreates the container.

## Prefer to describe what you want to watch?

[WebMonitor-Agent](https://github.com/webmonitor/WebMonitor-Agent) creates monitors through conversation, with a real collection preview before you confirm. It supports conditions such as a target price or a newly added list item.

This repository is the original XPath-based WebMonitor and receives maintenance fixes. Active product development continues in WebMonitor-Agent.

<details>
<summary>Build from source (development only)</summary>

A normal installation does not need the repository. To run code that is not in a released image:

```sh
git clone https://github.com/webmonitor/WebMonitor.git
cd WebMonitor
```

Create `.env` as described above, then build and start with the development override:

```sh
docker compose -f compose.yaml -f compose.build.yaml up --build -d --wait
```

This builds `deploy/Dockerfile` from the repository root. It installs Chromium from Debian, takes several minutes, and produces a large image. For local backend and frontend development, see [backend/README.md](./backend/README.md).

</details>

## License

[CC BY-NC 4.0](./LICENSE) — Share and adapt for non-commercial use, with attribution.

Created by 秋风飘起黄叶落.
