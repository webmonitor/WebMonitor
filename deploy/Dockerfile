# 单体镜像：FastAPI 与 React 构建产物在同一个容器里，同源发布。
#
# 浏览器只访问一个 origin（默认 http://localhost:8000）：
#   /             -> CRA 构建的 index.html（客户端路由由后端兜底返回 index.html）
#   /static/*     -> CRA 带哈希的 js/css 资源
#   /api/*        -> FastAPI 路由
#   /docs         -> OpenAPI 文档
# 因此不存在跨域请求，后端不再注册 CORS 中间件。
#
# 构建上下文是仓库根目录：
#   docker build -f deploy/Dockerfile -t webmonitor:local .

# ---------------------------------------------------------------------------
# 阶段 1：构建前端
# ---------------------------------------------------------------------------
FROM node:18-alpine AS web

WORKDIR /app
RUN npm install -g pnpm@10.34.8

COPY frontend/package.json frontend/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY frontend/ ./
RUN pnpm run build

# ---------------------------------------------------------------------------
# 阶段 2：运行时（Python + Chromium + 前端产物）
# ---------------------------------------------------------------------------
FROM python:3.12-slim

WORKDIR /app

# curl serves the healthcheck; Chromium comes from apt (Selenium finds it on PATH).
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    chromium \
    chromium-driver \
    && rm -rf /var/lib/apt/lists/*

ENV FRONTEND_DIST=/app/web

# Hashed dependency transaction, generated from pyproject.toml.
COPY requirements.txt pyproject.toml ./
RUN pip install --no-cache-dir --require-hashes -r requirements.txt

COPY backend/main.py ./
COPY backend/app ./app/

# 前端构建产物；main.py 通过 FRONTEND_DIST 找到它
COPY --from=web /app/build ./web

RUN useradd -m -u 1000 appuser \
    && mkdir -p /app/data \
    && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
