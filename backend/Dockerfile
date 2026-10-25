# 使用官方镜像
FROM python:3.12-slim

# 设置工作目录
WORKDIR /app

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    gpg \
    unzip \
    curl \
    && rm -rf /var/lib/apt/lists/*

# 安装Chromium和驱动 (更适合Docker环境)
RUN apt-get update && apt-get install -y \
    chromium \
    chromium-driver \
    && rm -rf /var/lib/apt/lists/*

# 设置Chrome二进制路径
ENV CHROME_BIN=/usr/bin/chromium
ENV CHROME_DRIVER=/usr/bin/chromedriver

# 依赖清单在仓库根目录（构建上下文为 WebMonitor/）
COPY requirements.txt pyproject.toml ./

# 安装Python依赖（哈希校验，与 pyproject.toml 的精确 pin 一致）
RUN pip install --no-cache-dir --require-hashes -r requirements.txt

# 复制后端代码
COPY backend/main.py ./
COPY backend/app ./app/

# 创建非root用户并设置权限
RUN useradd -m -u 1000 appuser \
    && mkdir -p /app/data \
    && chown -R appuser:appuser /app
USER appuser

# 暴露端口
EXPOSE 8000

# 健康检查
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# 启动命令
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
