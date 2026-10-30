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
#
# 镜像体积说明（约 1.5 GB，其中绝大部分不是本项目代码）：
#   chromium 可执行文件 + resources/icu           ~330 MB
#   chromium 依赖的 GTK/X11/mesa/LLVM 等系统库     ~490 MB
#   chromedriver                                  ~22 MB
#   Python 依赖（selenium/sqlalchemy/cryptography）~155 MB
#   Python 基础镜像 + glibc 等                    ~200 MB
# 本项目自身的代码与前端产物不到 10 MB。下面只裁掉确实不会被加载的东西，
# 修改后必须用 tests/smoke_runtime.py 在容器内跑一遍真实采集再提交。

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
LABEL org.opencontainers.image.licenses="CC-BY-NC-4.0"

WORKDIR /app

# 安装与裁剪必须在同一个 RUN 里完成：Docker 的镜像大小是按层累计的，
# 在后续层"删掉"上一层的文件只会新增一个层，占用不会回收。
#
# 不装 curl（健康检查用 Python 标准库）。删掉的内容：
#   - 文档/man/info、非英文 locale pak（监控不切界面语言）
#   - Vulkan 校验层、SwiftShader 与 crashpad handler：调试/软件 GPU/崩溃上报，
#     headless + --disable-gpu 的抓取都不会加载（已用 smoke 验证 Chrome 仍可启动）
#   - mesa 的 LLVM 软件光栅化栈：libLLVM/ libgallium/ libz3 合计约 180 MB，
#     只在 --use-gl=… 软件渲染时 dlopen，Selenium 抓取（--disable-gpu）不使用
RUN set -eux; \
    apt-get update; \
    apt-get install -y --no-install-recommends chromium chromium-driver; \
    rm -rf /var/lib/apt/lists/* /usr/share/doc /usr/share/man /usr/share/info; \
    find /usr/lib/chromium/locales -type f ! -name 'en-US.pak' -delete; \
    rm -f /usr/lib/chromium/libVkLayer_khronos_validation.so* \
          /usr/lib/chromium/vk_swiftshader_icd.json \
          /usr/lib/chromium/libvk_swiftshader.so \
          /usr/lib/chromium/chrome_crashpad_handler \
          /usr/lib/chromium/chrome_200_percent.pak; \
    rm -f /usr/lib/*/libLLVM.so.* /usr/lib/*/libgallium-*.so /usr/lib/*/libz3.so.*

ENV FRONTEND_DIST=/app/web

# Hashed dependency transaction, generated from pyproject.toml.
# 同一个 RUN 里删掉运行期用不到的 pip 本身（12 MB）与 Selenium Manager 的多平台
# 二进制（只留本架构那个；驱动由 apt 的 chromium-driver 提供）。
COPY requirements.txt pyproject.toml ./
COPY LICENSE /app/LICENSE
RUN set -eux; \
    pip install --no-cache-dir --require-hashes -r requirements.txt; \
    rm -rf /usr/local/lib/python3.12/site-packages/pip \
           /usr/local/lib/python3.12/site-packages/pip-*.dist-info \
           /usr/local/bin/pip /usr/local/bin/pip3 /usr/local/bin/pip3.12; \
    cd /usr/local/lib/python3.12/site-packages/selenium/webdriver/common; \
    rm -rf macos windows selenium-manager-THIRD-PARTY-NOTICES.txt selenium-manager.cdx.json; \
    case "$(uname -m)" in \
      aarch64|arm64) rm -rf linux-x86_64 ;; \
      *) rm -rf linux-arm64 ;; \
    esac

COPY backend/main.py ./
COPY backend/app ./app/

# 前端构建产物；main.py 通过 FRONTEND_DIST 找到它
COPY --from=web /app/build ./web

RUN useradd -m -u 1000 appuser \
    && mkdir -p /app/data \
    && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

# 用标准库探活，避免为了 HEALTHCHECK 装 curl
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD python -c "import sys,urllib.request; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=5).status == 200 else 1)"

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
