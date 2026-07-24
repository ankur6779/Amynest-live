# syntax=docker/dockerfile:1
#
# AmyNest web app (kidschedule) — separate frontend build from the API image.
# pnpm install --frozen-lockfile is the pnpm equivalent of npm ci.
#
# Build: docker build -f docker/frontend/Dockerfile -t amynest-web .
# Run:   docker run --rm -p 3000:3000 -e PORT=3000 amynest-web

ARG NODE_VERSION=22
FROM node:${NODE_VERSION}-bookworm-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="${PNPM_HOME}:${PATH}"
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0

RUN corepack enable \
  && corepack prepare pnpm@9.15.0 --activate

WORKDIR /app

# ── deps: lockfiles first for maximum layer cache reuse ───────────────────────
FROM base AS deps

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./

RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm fetch --frozen-lockfile

FROM deps AS build

ENV NODE_ENV=development
ENV PNPM_CONFIG_PRODUCTION=false
ENV BASE_PATH=/
ENV PORT=3000

COPY . .

RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --offline --filter "@workspace/kidschedule..."

RUN BASE_PATH=/ PORT=3000 pnpm --filter @workspace/kidschedule build

# ── runner: static assets only ────────────────────────────────────────────────
FROM caddy:2-alpine AS runner

COPY --from=build --chown=caddy:caddy \
  /app/artifacts/kidschedule/dist/public /srv

ARG PORT=3000
ENV PORT=${PORT}
EXPOSE ${PORT}

COPY docker/frontend/Caddyfile /etc/caddy/Caddyfile

CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]
