<h1 align="center">WebMonitor</h1>

<p align="center">
  <strong>关注网页，变化送达邮箱。</strong>
</p>

<p align="center">
  商品价格、网站公告、版本发布。<br>
  选好要看的内容，让 WebMonitor 按时检查并通知你。
</p>

<p align="center">
  <a href="https://webmonitor.qfpqhyl.top/">在线体验</a> ·
  <a href="#如何使用">如何使用</a> ·
  <a href="#开始使用">开始使用</a> ·
  <a href="./README.md">English</a>
</p>

<p align="center">
  <img src="./image/样例图片.png" alt="WebMonitor 工作台，展示监控任务与近期活动" width="1000">
</p>

WebMonitor 是一个可自行部署的网页监控应用，适合跟踪那些需要反复打开查看的页面。选定关心的区域，设置检查频率，就能在一个工作台中查看更新。无需接入 AI 服务或配置模型密钥。

## 可以关注什么

| 关注的内容 | 选取的页面区域 |
| --- | --- |
| 商品价格与库存 | 当前价格或库存状态 |
| 网站公告 | 通知栏或新闻列表 |
| 软件版本 | 发布标题或更新日志 |
| 报名截止日期 | 可能调整的日期或说明 |

监控比较所选区域的文字内容。创建任务时需要填写 XPath，用它指定页面中的目标元素。

## 如何使用

1. **选好内容。** 填写网址、XPath 和检查间隔，创建任务；使用测试功能，确认提取的是你关心的文字。
2. **设置通知。** 添加并测试 SMTP 邮件配置，再关联到任务。也可以不配置邮件，只在应用中查看变化。
3. **启用监控。** WebMonitor 按计划检查并记录结果。文字变化后，通知中会展示变化前后的内容。

首次成功的定时检查可能发送初始通知。测试任务只预览内容，不发送邮件。

## 在一个工作台中管理

- **关注指定区域。** 只跟踪需要的内容，避免将页面其他区域的文字一并纳入比较。
- **看清每次变化。** 查看更新前后的内容、检查历史和采集错误。
- **使用自己的邮箱。** 自行配置 SMTP 账户与接收通知的邮箱地址。
- **分享监控任务。** 将任务设为实例内公开，其他用户可使用自己的邮件配置订阅。
- **随时调整状态。** 在工作台管理、启用或停用任务，界面支持中英文切换。

## 开始使用

可以先 **[在线体验](https://webmonitor.qfpqhyl.top/)**，也可以使用 Docker Engine 和 Docker Compose 部署自己的实例。演示站点由维护者单独运行，可能暂时不可用。

```sh
git clone https://github.com/webmonitor/WebMonitor.git
cd WebMonitor
cp .env.example .env
```

已有 `.env` 时保留原文件。启动前设置：

| 配置项 | 填写内容 |
| --- | --- |
| `SECRET_KEY` | 至少 32 字符的随机签名密钥 |
| `ADMIN_EMAIL` | 管理员邮箱地址 |
| `ADMIN_PASSWORD` | 初始强密码，至少 6 字符、最多 72 个 UTF-8 字节 |

初始用户名为 `admin`，可通过 `ADMIN_USERNAME` 修改。这些配置不会重置已有管理员账户；邮件通知在登录后通过应用配置。

> **保留数据：** 默认部署将数据存放在容器内。正式使用前请为 `/app/data` 添加持久数据卷，否则更换容器会丢失账户、监控和历史记录。

```sh
docker compose up --build -d --wait
```

打开 **[localhost:8000](http://localhost:8000/)**，登录后创建第一个任务。

更多配置与集成说明见[配置示例](./.env.example)、[后端文档](./backend/README.md)和运行实例的 [API 文档](http://localhost:8000/docs)。

## 想通过对话描述监控需求？

[WebMonitor-Agent](https://github.com/webmonitor/WebMonitor-Agent) 支持通过对话创建监控，在真实采集预览后由你确认启用，还可设置目标价格、列表新增等通知条件。

本仓库是基于 XPath 的 WebMonitor 初代版本，目前提供维护与问题修复。后续产品开发在 WebMonitor-Agent 中进行。

## 许可证

[CC BY-NC 4.0](./LICENSE) — 可在署名的前提下分享和修改，仅限非商业用途。

作者：秋风飘起黄叶落。
