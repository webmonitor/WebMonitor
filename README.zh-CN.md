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
  <a href="#安装">安装</a> ·
  <a href="#第一个监控">第一个监控</a> ·
  <a href="#邮件通知">邮件通知</a> ·
  <a href="./README.md">English</a>
</p>

<p align="center">
  <img src="./image/样例图片.png" alt="WebMonitor 仪表板，展示监控任务与最近监控活动" width="1000">
</p>

WebMonitor 是一个可自行部署的网页区域监控服务。你提供页面地址和 XPath，设置检查频率，然后在网页应用里查看结果；选中的文字变化时，WebMonitor 可以发邮件通知你。不需要 AI 服务、模型密钥或 GitHub 账号。

## 开始前需要准备什么

- 已安装 Docker Engine 和 Compose 插件，`docker compose version` 可以正常执行。
- 运行 WebMonitor 的机器上，`8000` 端口空闲。
- 要监控的页面地址，以及目标内容的 XPath。
- 需要邮件通知时：邮箱服务商提供的 SMTP 服务器、端口、发件账户、密码或应用专用密码，以及收件地址。

正常安装只下载一个 Compose 文件，自己写一个 `.env`，再用一条命令启动。

## 可以关注什么

| 关注的内容 | 选取的页面区域 |
| --- | --- |
| 商品价格与库存 | 当前价格或库存状态 |
| 网站公告 | 通知栏或新闻列表 |
| 软件版本 | 发布标题或更新日志 |
| 报名截止日期 | 可能调整的日期或说明 |

只有选中元素里的文字参与比较，导航、广告和页面其他部分不会触发变化。使用 JavaScript 填充内容的页面也支持。

## 安装

### 1. 下载 Compose 文件

```sh
mkdir webmonitor
cd webmonitor
curl -fsSLo compose.yaml https://raw.githubusercontent.com/webmonitor/WebMonitor/main/compose.yaml
```

目录里现在只有 `compose.yaml`。它会拉取公开镜像 `ghcr.io/webmonitor/webmonitor:latest`，并运行一个名为 `webmonitor` 的容器。

### 2. 自己创建 `.env`

在 `compose.yaml` 同目录创建名为 `.env` 的文件，粘贴完整模板：

```dotenv
# 公开镜像，无需登录镜像仓库。
# 想固定版本可改为：ghcr.io/webmonitor/webmonitor:1.0.1
WEBMONITOR_IMAGE=ghcr.io/webmonitor/webmonitor:latest

# 必填。至少 32 个字符的随机签名密钥。
SECRET_KEY=CHANGE_ME_AT_LEAST_32_RANDOM_CHARACTERS

# 初始管理员账户。只在数据库没有管理员时使用。
ADMIN_USERNAME=admin
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=CHANGE_ME_STRONG_PASSWORD

# 可选。
DEBUG=false
LOG_LEVEL=INFO
```

启动前替换两个 `CHANGE_ME` 值。

| 配置项 | 填写内容 |
| --- | --- |
| `WEBMONITOR_IMAGE` | 可选。Compose 文件已默认使用 `ghcr.io/webmonitor/webmonitor:latest`；需要可复现的更新时，改为 `ghcr.io/webmonitor/webmonitor:1.0.1` 这类固定标签 |
| `SECRET_KEY` | 必填。至少 32 个字符的随机字符串。可用 `python -c "import secrets; print(secrets.token_hex(32))"` 或 `openssl rand -hex 32` 生成 |
| `ADMIN_USERNAME` | 初始管理员用户名 |
| `ADMIN_EMAIL` | 管理员邮箱地址 |
| `ADMIN_PASSWORD` | 初始管理员密码：至少 6 个字符，最多 72 个 UTF-8 字节 |
| `DEBUG` | 可选。保持 `false` |
| `LOG_LEVEL` | 可选。保持 `INFO`，排查问题时再调整 |

管理员配置只在数据库没有管理员时读取。之后再改这些值不会改变已有账户的登录信息。

邮件不在 `.env` 中配置。登录后，每个用户自己在应用里添加 SMTP 账户，见[邮件通知](#邮件通知)。

### 3. 启动 WebMonitor

```sh
docker compose up -d --wait
```

命令会匿名拉取镜像、启动容器，并在健康检查通过后返回。首次启动需要等待镜像下载完成。

打开 **[http://localhost:8000/](http://localhost:8000/)**，用 `.env` 中的 `ADMIN_USERNAME` 和 `ADMIN_PASSWORD` 登录，进入“仪表板”。

如果命令失败：

- 先看输出的最后几行。缺少 `SECRET_KEY` 时，Compose 会在创建容器前报错。改好 `.env` 后重新执行同一条命令。
- 新数据库的 `ADMIN_PASSWORD` 为空时，应用会在启动阶段拒绝运行。容器已创建但一直不健康时，执行 `docker compose logs webmonitor`，查看最后几行。
- 如果 `8000` 端口已被占用，停掉占用端口的程序，或修改 `compose.yaml` 中 `"8000:8000"` 左边的主机端口，再打开新端口。

## 第一个监控

### 1. 打开任务弹窗

在左侧菜单打开“监控任务”，点击“创建新任务”。

### 2. 填写表单

| 字段 | 含义 |
| --- | --- |
| **任务名称** | 列表中一眼能认出的名字 |
| **监控 URL** | 完整网页地址，以 `http://` 或 `https://` 开头 |
| **XPath 选择器** | 要关注的元素 |
| **检查间隔（秒）** | 多久加载一次页面。默认 `300`，最小 `10` |
| **邮件配置** | 已保存的邮件配置，或“不发送通知” |
| **任务描述** | 可选；任务公开后其他用户可以看到 |
| **公开任务** | 可选；让其他用户订阅此任务 |
| **启用监控** | 启动定时检查。想先测试选择器时，可以先关闭 |

### 3. 保存并测试 XPath

点击“创建任务”。页面提示“监控任务已创建”，任务出现在列表中，状态为“运行中”或“已暂停”。

点击任务行的“测试监控”。页面会提示“测试成功！内容：…”并显示抓取文字的开头；失败时提示“测试失败”。

- 测试只加载页面一次：不发邮件、不写日志，也不改动已保存的结果。
- 如果测试失败或内容预览为空，可能是页面没有打开，或 XPath 没有匹配到内容。在浏览器里重新复制 XPath，缩短为稳定的属性，再用“编辑任务”修正。完整的排查步骤见[失败时怎么办](#失败时怎么办)。
- 如果之前关闭了“启用监控”，测试正常后打开“编辑任务”，开启它，再点击“更新任务”。

### 4. 查看首次结果

首次定时检查会在任务保存或启用约一个间隔后执行。此前没有保存过内容，因此这次记录为“内容变化”；如果绑定了“邮件配置”，会发送一封初始邮件。之后除非文字变化或检查失败，记录会显示“无变化”。

打开“监控日志”，在“选择监控任务”中选中该任务，查看“检查时间”“状态”“新内容”和“错误信息”。“仪表板”显示总任务数、最近变化和成功率。

## 邮件通知

### 1. 添加 SMTP 账户

打开“邮件配置”，点击“添加邮件配置”，填写：

| 字段 | 填写内容 |
| --- | --- |
| **配置名称** | 会显示在任务和订阅的下拉框中 |
| **SMTP 服务器** | 邮箱服务商提供的主机名，例如 `smtp.gmail.com` |
| **SMTP 端口** | 通常为 `465`（开启“使用 SSL 加密”）或 `587`（关闭时使用 STARTTLS） |
| **发件人邮箱** | 实际发送邮件的账户 |
| **SMTP 密码** | 该账户的密码或应用专用密码 |
| **接收者邮箱** | 通知邮件的收件地址 |
| **使用 SSL 加密** | 端口 `465` 开启；端口 `587` 关闭，改用 STARTTLS 升级连接 |

常见邮箱：

| 服务商 | 服务器 | 端口 |
| --- | --- | --- |
| Gmail | `smtp.gmail.com` | `465`（SSL）或 `587`（关闭 SSL）；使用应用专用密码 |
| QQ 邮箱 | `smtp.qq.com` | `465`（SSL）；启用 SMTP 并使用授权码 |
| 163 邮箱 | `smtp.163.com` | `465`（SSL）；启用 SMTP 并使用客户端授权密码 |
| Outlook / Hotmail | `smtp.office365.com` | `587`（关闭 SSL） |

多数服务商会拒绝邮箱登录密码，要求应用专用密码或授权码。

### 2. 测试配置

保存配置后，点击该行的“测试连接”。WebMonitor 会连接服务器，并向该行的“接收者邮箱”发送一封测试邮件。

- **测试邮件发送成功**：发件服务器已接受邮件。若收件箱中没有，请检查垃圾邮件和收件地址。
- **测试邮件发送失败**：服务器、端口、“使用 SSL 加密”、账户或密码被拒绝。

### 3. 绑定到任务

打开“编辑任务”，在“邮件配置”中选择该配置，点击“更新任务”。默认的“不发送通知”仍会检查并记录结果，只是不发邮件。

邮件配置属于创建它的账户。公开任务的订阅者订阅时选择自己的配置，通知不会经过任务所有者的邮箱。

## 公开任务与订阅

在创建或编辑弹窗中开启“公开任务”，这个实例里的其他人就能找到它。任务公开且运行中时，会出现在“公开任务”页面。

要订阅别人的公开任务：

1. 打开“公开任务”。
2. 在任务上点击“订阅”。
3. 在“选择邮箱配置”中选择一个自己的配置。
4. 点击“确认订阅”。

订阅前至少需要一个邮件配置；没有配置时弹窗会提示。变化会发送到所选配置的“接收者邮箱”。

“我的订阅”列出所有订阅。你可以开启或关闭通知、更换邮箱配置，或取消订阅。关闭通知后订阅记录保留，但不再发邮件；任务所有者暂停任务或改为私有后，你仍然可以取消订阅。

默认每个账户最多有 10 个启用中的订阅；“公开任务”页面显示“剩余额度”。关闭通知的订阅不占额度。管理员可以在“用户管理”的“最大订阅数量”中调整你的上限。

## 暂停、编辑与删除任务

- 暂停：打开“编辑任务”，关闭“启用监控”，点击“更新任务”。状态变为“已暂停”，定时检查停止，已保存的结果和日志保留；重新开启即可恢复。
- 修改网址、XPath、间隔、邮件配置、描述或公开状态：使用“编辑任务”，然后点击“更新任务”。
- 修改后要确认选择器，点击“测试监控”，提示中会显示抓取到的内容。
- 删除：点击“删除任务”并确认，任务及其监控日志会一并删除。

## 失败时怎么办

| 现象 | 含义 | 处理 |
| --- | --- | --- |
| **测试失败** | 页面没有打开，或 XPath 没有匹配到内容 | 在浏览器中检查元素并复制更短的 XPath；先用 `//body` 确认页面能打开 |
| **内容**预览为空 | 元素存在，但当时没有文字 | 等待异步内容，或选择真正包含文字的元素 |
| 创建后没有日志 | 首次检查还没执行 | 等待一个间隔；“已暂停”的任务不会检查 |
| 状态为**错误** | 定时检查失败 | 在“监控日志”查看“错误信息”；超时通常是页面或网络问题，选择器错误指向 XPath |
| **测试邮件发送失败** | SMTP 连接、登录或 SSL/端口组合被拒绝 | 检查服务器、端口、“使用 SSL 加密”、发件账户和应用专用密码 |
| 日志显示**内容变化**，但没收到邮件 | 任务用了“不发送通知”、订阅关闭了通知，或收件地址不同 | 给任务绑定配置、开启订阅通知，并检查“接收者邮箱”和垃圾邮件箱 |
| 点**订阅**被拒绝 | 账户没有剩余订阅额度 | 在“我的订阅”关闭或取消订阅，或请管理员提高“最大订阅数量” |
| 点**创建任务**被拒绝 | 域名在黑名单、URL 缺少协议，或字段无效 | 使用完整的 `http://` 或 `https://` 地址和允许的域名，或向管理员确认“黑名单管理” |

## 数据、备份与更新

提供的 `compose.yaml` 没有定义数据卷。数据库位于容器内的 `/app/data/webmonitor.db`，账户、任务、邮件配置、订阅和日志只保存在这里。

容器重建后会从空数据库开始：修改镜像标签、执行 `docker compose down`、使用 `--force-recreate`，或更新 `latest` 后启动，都会重建容器，因为服务每次启动前都会拉取镜像。`docker compose restart` 保留现有容器和数据。

### 备份

```sh
docker compose stop
docker cp webmonitor:/app/data/webmonitor.db ./webmonitor-backup.db
docker compose start
```

备份文件保存在容器之外。恢复：

```sh
docker compose stop
docker cp ./webmonitor-backup.db webmonitor:/app/data/webmonitor.db
docker compose start
```

复制进容器的文件属于 root，而应用以 `appuser` 运行。如果恢复后应用无法写入数据库，修正所有者并重启：

```sh
docker compose exec -u root webmonitor chown appuser:appuser /app/data/webmonitor.db
docker compose restart
```

### 升级与回退

先备份，然后把 `.env` 中的 `WEBMONITOR_IMAGE` 改为新标签，执行同一条启动命令：

```sh
docker compose up -d --wait
```

回退时把 `WEBMONITOR_IMAGE` 改成之前的标签，再执行同一条命令。不同版本之间不会自动升级数据库，请使用与所运行版本对应的数据库文件。

### 让数据在容器重建后保留

如果希望更新后自动保留数据，可在 `/app/data` 挂载命名卷。在 `compose.yaml` 同目录添加 `docker-compose.override.yml`：

```yaml
services:
  webmonitor:
    volumes:
      - webmonitor-data:/app/data
volumes:
  webmonitor-data:
```

`docker compose up -d --wait` 会自动读取这个覆盖文件。给已有数据的实例添加卷前请先备份：改为使用数据卷会重建容器。

## 想通过对话描述监控需求？

[WebMonitor-Agent](https://github.com/webmonitor/WebMonitor-Agent) 支持通过对话创建监控，在真实采集预览后由你确认启用，还可设置目标价格、列表新增等通知条件。

本仓库是基于 XPath 的 WebMonitor 初代版本，目前提供维护与问题修复。后续产品开发在 WebMonitor-Agent 中进行。

<details>
<summary>从源码构建（仅开发）</summary>

正常安装不需要仓库。要运行发布镜像中尚未包含的代码：

```sh
git clone https://github.com/webmonitor/WebMonitor.git
cd WebMonitor
```

按上面的说明创建 `.env`，然后使用开发覆盖文件构建并启动：

```sh
docker compose -f compose.yaml -f compose.build.yaml up --build -d --wait
```

该命令从仓库根目录构建 `deploy/Dockerfile`，通过 Debian 安装 Chromium，耗时数分钟，生成的镜像也较大。本地后端与前端开发见 [backend/README.md](./backend/README.md)。

</details>

## 许可证

[CC BY-NC 4.0](./LICENSE) — 可在署名的前提下分享和修改，仅限非商业用途。

作者：秋风飘起黄叶落。
