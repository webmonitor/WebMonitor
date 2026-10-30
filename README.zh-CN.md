<h1 align="center">WebMonitor</h1>

<p align="center">
  <strong>关注网页，变化送达邮箱。</strong>
</p>

<p align="center">
  商品价格、网站公告、版本发布。<br>
  选好要看的内容，让 WebMonitor 按时检查并在文字变化时通知你。
</p>

<p align="center">
  <a href="https://webmonitor.qfpqhyl.top/">在线体验</a> ·
  <a href="#如何使用">如何使用</a> ·
  <a href="#部署">部署</a> ·
  <a href="./README.md">English</a>
</p>

<p align="center">
  <img src="./image/样例图片.png" alt="WebMonitor 工作台，展示监控任务与近期活动" width="1000">
</p>

WebMonitor 是一个可自行部署的网页区域监控应用。你用 XPath 指定要关注的元素并设置检查间隔，WebMonitor 会用无头 Chromium 打开页面，将提取到的文字与上次结果比较，并在内容变化时发送邮件。无需接入 AI 服务或配置模型密钥。

## 可以关注什么

| 关注的内容 | 选取的页面区域 |
| --- | --- |
| 商品价格与库存 | 当前价格或库存状态 |
| 网站公告 | 通知栏或新闻列表 |
| 软件版本 | 发布标题或更新日志 |
| 报名截止日期 | 可能调整的日期或说明 |

监控比较所选元素中的文字。XPath 用来定位这个元素，页面其余内容不参与比较。

## 如何使用

1. **创建监控任务。** 填写页面网址、XPath 和检查间隔。间隔最小为 10 秒，默认 300 秒。可先使用测试功能抓取一次内容，确认选择器是否正确；测试不会发送邮件。
2. **需要邮件通知时添加邮件配置。** 邮件配置包含 SMTP 服务器、端口、发件地址、密码或应用专用密码，以及收件地址。任务可以不绑定邮件配置：它仍会采集、记录历史并在应用内展示变化，只是不发送邮件。
3. **启用任务。** 调度器按配置的间隔检查页面，每次执行都会写入监控日志。文字变化后，WebMonitor 记录新内容；如果任务绑定了邮件配置，还会发送包含变化前后内容的通知。

首次成功的定时检查可能发送一次初始通知。通知会发送到邮件配置中填写的收件地址，而不是登录账号的邮箱地址。

## 应用包含什么

- **聚焦监控。** 只跟踪一个页面区域，导航、广告和无关文字不会触发变化。
- **历史与错误。** 在监控日志中查看每次检查结果、检测到的变化和采集错误。
- **使用自己的邮箱。** 每个用户配置自己的 SMTP 账户和收件地址；实例没有统一的 SMTP 兜底配置。
- **公开任务。** 将任务设为公开后，实例内的其他用户可以订阅，并接收各自邮箱的通知。
- **带配额的订阅。** 每个用户有订阅上限，默认 10 个，管理员可以调整。
- **管理功能。** 管理员可以管理用户、订阅配额和域名黑名单；邮件配置由每个用户自行管理。
- **中英文界面。** 可在界面中切换语言。

## 部署

需要 Docker Engine 和 Docker Compose。WebMonitor 以单个公开镜像发布在 `ghcr.io/webmonitor/webmonitor`，可匿名拉取，无需登录 GitHub Container Registry。镜像包含 API、已构建的前端和 Chromium，提供 `linux/amd64` 与 `linux/arm64` 两种架构。默认标签是 `latest`；需要固定版本时使用 `1.0.0`。

### 1. 下载 Compose 文件

正常安装不需要克隆仓库：

```sh
mkdir webmonitor
cd webmonitor
curl -fsSLo compose.yaml https://raw.githubusercontent.com/webmonitor/WebMonitor/main/compose.yaml
```

Compose 文件会拉取发布镜像并运行一个 `webmonitor` 服务。请将它和下面创建的 `.env` 放在同一目录。

### 2. 创建 `.env`

在 `compose.yaml` 同目录创建 `.env`。最小完整模板如下：

```dotenv
WEBMONITOR_IMAGE=ghcr.io/webmonitor/webmonitor:latest
SECRET_KEY=CHANGE_ME_AT_LEAST_32_RANDOM_CHARACTERS
ADMIN_USERNAME=admin
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=CHANGE_ME_STRONG_PASSWORD
```

启动前请替换两个 `CHANGE_ME` 值；占位符不是可用的密钥：

| 配置项 | 填写内容 |
| --- | --- |
| `WEBMONITOR_IMAGE` | 可选。Compose 文件默认为 `ghcr.io/webmonitor/webmonitor:latest`；改为 `ghcr.io/webmonitor/webmonitor:1.0.0` 可固定版本 |
| `SECRET_KEY` | 至少 32 字符的随机 JWT 签名密钥。可用 `python -c "import secrets; print(secrets.token_hex(32))"` 生成 |
| `ADMIN_USERNAME` | 初始管理员用户名 |
| `ADMIN_EMAIL` | 管理员邮箱地址；模板默认值为 `admin@example.com` |
| `ADMIN_PASSWORD` | 初始管理员密码：至少 6 字符，最多 72 个 UTF-8 字节 |

这些引导配置只在数据库中没有管理员时使用，已有管理员账户不会被重置。邮件发送由每个用户在登录后的应用中自行配置。

发布的标签：

| 标签 | 含义 |
| --- | --- |
| `1.0.0` | 固定版本；需要可复现部署时使用 |
| `1.0` | 该次版本系列的最新补丁版本 |
| `latest` | 默认标签；最新稳定版本，只在稳定版本标签发布时移动，不会指向开发构建或预发布版本 |
| `main` | 开发分支；随每次推送到 `main` 移动 |
| `sha-<short>` | 指定提交 |

### 3. 启动 WebMonitor

```sh
docker compose up -d --wait
```

打开 **[http://localhost:8000/](http://localhost:8000/)**，使用管理员账户登录并创建第一个任务。API 文档位于 [http://localhost:8000/docs](http://localhost:8000/docs)，健康检查位于 [http://localhost:8000/health](http://localhost:8000/health)。

只暴露 `8000` 一个端口：后端同时提供 API 和前端页面，二者同源，因此没有独立的前端容器，也不需要 CORS 配置。

### 升级与回退

需要切换版本时，修改 `.env` 中的 `WEBMONITOR_IMAGE`，然后拉取并重建：

```sh
docker compose pull
docker compose up -d --wait
```

服务使用 `pull_policy: always`，`up` 也会在创建容器前拉取镜像。回退时，将 `WEBMONITOR_IMAGE` 改为之前的标签，再执行同样的两条命令。操作前请先备份数据库；项目没有数据库结构迁移框架，切换版本时必须保留数据库文件。

### 数据与备份

提供的 Compose 文件没有定义数据卷。SQLite 数据库位于容器内的 `/app/data/webmonitor.db`，账户、任务、邮件配置、订阅和日志都只保存在这个文件中。容器被重建时——例如修改镜像标签、执行 `docker compose down` 或使用 `--force-recreate`——新容器会从空数据库开始。由于服务每次启动前都会拉取镜像，`latest` 更新后执行 `up` 也可能重建容器。`docker compose restart` 保留原容器，数据不会丢失。

升级或回退前备份数据库：

```sh
docker compose stop
docker cp webmonitor:/app/data/webmonitor.db ./webmonitor-backup-$(date +%F).db
docker compose start
```

请将备份保存在容器之外，并在恢复时把文件放回 `/app/data/webmonitor.db`，确保容器用户有写入权限。如果希望数据在容器重建后自动保留，可自行在 `/app/data` 挂载命名卷；提供的文件有意不包含数据卷。

后端在启动时通过 SQLAlchemy `create_all` 创建缺失的表，不会修改已有表，项目也不包含迁移工具。请保留与当前运行版本对应的数据库文件。Compose 服务把 `DATABASE_URL` 直接写在 `compose.yaml` 中，不会读取 `.env` 的同名变量；修改 `.env` 只影响本地运行，容器部署需要显式增加 Compose override。当前支持的数据库是 SQLite。

### 从源码构建（仅开发）

只有开发，或需要运行发布镜像中尚未包含的改动时，才需要克隆仓库：

```sh
git clone https://github.com/webmonitor/WebMonitor.git
cd WebMonitor
```

按上面的说明创建 `.env`，然后使用开发覆盖文件构建并启动：

```sh
docker compose -f compose.yaml -f compose.build.yaml up --build -d --wait
```

该命令从仓库根目录构建 `deploy/Dockerfile`，会通过 Debian 安装 Chromium，耗时数分钟，生成的镜像也较大。正常安装只使用 `compose.yaml`；`compose.build.yaml` 是源码构建覆盖文件。本地后端与前端开发见 [backend/README.md](./backend/README.md)。

## 想通过对话描述监控需求？

[WebMonitor-Agent](https://github.com/webmonitor/WebMonitor-Agent) 支持通过对话创建监控，在真实采集预览后由你确认启用，还可设置目标价格、列表新增等通知条件。

本仓库是基于 XPath 的 WebMonitor 初代版本，目前提供维护与问题修复。后续产品开发在 WebMonitor-Agent 中进行。

## 许可证

[CC BY-NC 4.0](./LICENSE) — 可在署名的前提下分享和修改，仅限非商业用途。

作者：秋风飘起黄叶落。
