# WebMonitor

<h3 align="center">网页内容变化监控平台</h3>

<p align="center">
  <img src="./image/样例图片.png" alt="WebMonitor Dashboard" width="800">
</p>

---

[English](./README.md) | 简体中文

## 在线体验

**访问地址**: https://webmonitor.qfpqhyl.top/

> 当前后端服务部署在维护者的 MacBook M4 Air 上，可用性会受到本地 Docker 运行状态影响。如需稳定使用，建议自行部署。

---

## 项目简介

WebMonitor 是一个基于 React 前端和 FastAPI 后端构建的网页内容监控与邮件通知平台。它可以通过 XPath 定位网页中的指定区域，检测内容变化，并在发生变化时自动发送邮件提醒。

## 主要功能

- 基于 XPath 精确监控网页内容变化
- 检测到变化后自动发送邮件通知
- 支持公开任务与用户订阅机制
- 提供任务、日志、用户和系统设置的可视化管理界面
- 支持 Docker 部署
- 前端支持中文和英文双语切换

---

## 技术栈

**前端**
- React
- Material UI
- React Query
- Axios
- react-i18next

**后端**
- FastAPI
- SQLAlchemy
- APScheduler
- Selenium WebDriver

**部署**
- Docker
- Docker Compose
- 默认使用 SQLite，生产环境支持 PostgreSQL

---

## 快速开始

### Docker 部署

```bash
git clone https://github.com/webmonitor/WebMonitor.git
cd WebMonitor
docker-compose up -d
```

启动后访问：
- 页面: http://localhost:8000/
- API 文档: http://localhost:8000/docs

前端由同一个 FastAPI 进程提供，浏览器只访问一个来源，因此没有跨域配置。

默认管理员账号：
- 用户名: `admin`
- 密码: `admin123`

### 本地开发

后端：

```bash
# 依赖清单在仓库根目录
pip install -r requirements.txt
cd backend && python main.py
```

前端：

```bash
cd frontend
pnpm install
pnpm start
```

---

## 环境变量配置

复制 `.env.example` 为 `.env`，再按需修改配置。

### 核心配置项

| 变量 | 说明 | 默认值 |
| --- | --- | --- |
| `SECRET_KEY` | JWT 签名密钥。**必填**，至少 32 个字符，示例值会被拒绝 | - |
| `ADMIN_USERNAME` | 引导管理员用户名（仅在没有管理员时使用） | `admin` |
| `ADMIN_PASSWORD` | 引导管理员密码。**首次启动必填**；没有管理员且留空时启动失败。已有管理员时绝不重置密码 | - |
| `ADMIN_EMAIL` | 引导管理员邮箱 | `admin@example.com` |
| `DATABASE_URL` | 数据库连接字符串 | `sqlite:///./data/webmonitor.db` |
| `SMTP_SERVER` | 部署级 SMTP 回退服务器（仅对没有任何邮件配置的用户生效） | - |
| `SMTP_PORT` | SMTP 端口 | `465` |
| `SMTP_USER` | SMTP 用户名 | - |
| `SMTP_PASSWORD` | SMTP 密码或应用专用密码 | - |
| `RECEIVER_EMAIL` | 回退通知收件人 | - |
| `LOG_LEVEL` | 输出到 stdout 的日志级别 | `INFO` |
| `FRONTEND_DIST` | 前端构建产物目录 | `web` |

生成签名密钥：

```sh
python -c "import secrets; print(secrets.token_hex(32))"
```

完整配置模板请查看 `.env.example`。

---

## 使用场景

- 跟踪商品价格变化
- 监控网站公告或政策更新
- 关注竞品页面动态
- 监控任何对业务或个人工作流重要的网页区域

---

## 项目结构

```text
backend/   FastAPI API、数据库模型、业务服务、调度器
frontend/  React 应用、页面组件、国际化资源
image/     文档使用的截图与素材
```

---

## 架构概览

1. React 前端通过 Axios 调用 FastAPI 后端。
2. 系统使用 JWT 进行身份认证。
3. 监控任务通过 SQLAlchemy 持久化到数据库。
4. APScheduler 在后台调度监控任务。
5. Selenium 负责加载并检查目标网页内容。
6. 检测到变化后，系统发送邮件通知。

---

## 文档

- English documentation: [README.md](./README.md)
- 后端 API 文档: `http://localhost:8000/docs`

---

## 许可证

[CC BY-NC 4.0](LICENSE) - 仅供个人和非商业用途使用。

---

<p align="center">
  Made by 秋风飘起黄叶落
</p>
