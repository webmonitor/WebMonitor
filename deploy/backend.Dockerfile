# Backend image: FastAPI + Selenium/Chromium, SQLite at /app/data.
#
# Build context is the repository root (the dependency manifest lives there):
#   docker build -f deploy/backend.Dockerfile -t webmonitor-backend:local .

FROM python:3.12-slim

WORKDIR /app

# curl/wget serve the healthcheck; Chromium comes from apt (drives Selenium Manager).
RUN apt-get update && apt-get install -y --no-install-recommends \
    wget \
    gnupg \
    gpg \
    unzip \
    curl \
    chromium \
    chromium-driver \
    && rm -rf /var/lib/apt/lists/*

ENV CHROME_BIN=/usr/bin/chromium \
    CHROME_DRIVER=/usr/bin/chromedriver

# Hashed dependency transaction, generated from pyproject.toml.
COPY requirements.txt pyproject.toml ./
RUN pip install --no-cache-dir --require-hashes -r requirements.txt

COPY backend/main.py ./
COPY backend/app ./app/

RUN useradd -m -u 1000 appuser \
    && mkdir -p /app/data \
    && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
