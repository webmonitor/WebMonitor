# Frontend image: CRA production build served as static files by `serve`.
#
# There is no reverse proxy: the browser talks to the API directly, so the API
# origin is baked into the bundle at build time (REACT_APP_API_URL) and the
# backend must allow that page origin via BACKEND_CORS_ORIGINS.
#
# Build context is the repository root:
#   docker build -f deploy/web.Dockerfile \
#     --build-arg REACT_APP_API_URL=http://localhost:8000 -t webmonitor-frontend:local .

FROM node:18-alpine AS build
WORKDIR /app
RUN npm install -g pnpm@10.34.8

COPY frontend/package.json frontend/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY frontend/ ./

# CRA inlines REACT_APP_* at build time; this is the only way to point the
# bundle at the API. Leave it empty to keep same-origin relative requests.
ARG REACT_APP_API_URL=
ENV REACT_APP_API_URL=$REACT_APP_API_URL
RUN pnpm run build


FROM node:18-alpine
WORKDIR /app

# Pinned static server; `-s` rewrites unknown paths to index.html so client-side
# routes survive a hard refresh.
RUN npm install -g serve@14.2.4 && npm cache clean --force

COPY --from=build /app/build ./build

ENV NODE_ENV=production
USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://127.0.0.1:3000/ || exit 1

CMD ["serve", "-s", "build", "-l", "tcp://0.0.0.0:3000"]
