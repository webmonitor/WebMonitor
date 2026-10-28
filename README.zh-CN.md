<h1 align="center">WebMonitor</h1>

<p align="center">
  <strong>网页内容变化，邮件及时提醒。</strong>
</p>

<p align="center">
  <a href="https://webmonitor.qfpqhyl.top/">在线体验</a> ·
  <a href="#快速开始">快速开始</a> ·
  <a href="./backend/README.md">后端文档</a> ·
  <a href="./README.md">English</a>
</p>

<p align="center">
  <img src="./image/样例图片.png" alt="WebMonitor 监控面板" width="1000">
</p>

WebMonitor 是一个可自行部署的网页内容监控工具。通过 XPath 选定页面区域，设置检查间隔，在文字内容发生变化时接收邮件通知。适合跟踪商品价格、网站公告、版本发布，以及其他值得关注的更新。

## 核心功能

- **定向监控** — 使用 Chromium 渲染网页，通过 XPath 提取指定区域的文字。
- **变化记录** — 查看变化前后的内容、检查历史与采集错误。
- **邮件通知** — 配置自己的 SMTP 账户与收件地址。
- **公开任务** — 分享监控任务，使用独立的通知配置订阅他人的任务。
- **统一面板** — 管理任务、用户与域名黑名单，支持中英文切换。

基于 **React · FastAPI · Selenium · APScheduler · SQLAlchemy** 构建，前端与 API 运行在同一个 Docker 容器中。

## 快速开始

需要安装 Docker Engine 和 Docker Compose。

```sh
git clone https://github.com/webmonitor/WebMonitor.git
cd WebMonitor
cp .env.example .env
```

编辑 `.env`，设置以下配置：

- `SECRET_KEY` — 至少 32 个字符的随机签名密钥。
- `ADMIN_PASSWORD` — 初始管理员密码，至少 6 个字符、最多 72 个 UTF-8 字节，请使用强密码。
- `ADMIN_EMAIL` — 管理员邮箱地址。

初始用户名默认为 `admin`。修改这些配置不会重置已有管理员账户。

> **数据持久化：** 默认部署将 SQLite 数据保存在容器内。首次使用前，请将数据卷挂载到 `/app/data`，以便在更换容器后保留数据。

```sh
docker compose up --build -d --wait
```

打开 **[localhost:8000](http://localhost:8000/)** 并登录。**[API 文档](http://localhost:8000/docs)** 使用同一端口。

## 创建第一个监控任务

1. 填写目标网址、XPath 和检查间隔，创建任务。
2. 使用测试功能，预览提取到的文字内容。
3. 如需邮件提醒，添加并测试 SMTP 配置，再将其关联到任务。

启用的任务会按计划执行。首次成功采集可能触发通知；测试功能仅预览内容，不发送邮件。

## 项目状态

本仓库为基于 XPath 的 WebMonitor 初代版本，目前仅进行旧版维护与问题修复。后续产品开发在 [WebMonitor-Agent](https://github.com/webmonitor/WebMonitor-Agent) 中进行。在线演示依赖维护者的运行实例，可能暂时不可用。

## 许可证

[CC BY-NC 4.0](./LICENSE) — 可在署名的前提下分享和修改，仅限非商业用途。

作者：秋风飘起黄叶落。
