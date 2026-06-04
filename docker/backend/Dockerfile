# syntax=docker/dockerfile:1
#
# AmyNest API server — cache-friendly multi-stage build.
# pnpm install --frozen-lockfile is the pnpm equivalent of npm ci.
#
# Build:  docker build -f docker/backend/Dockerfile -t amynest-api .
# Run:    docker run --rm -p 5000:5000 -e PORT=5000 -e DATABASE_URL=... amynest-api

ARG NODE_VERSION=20
FROM node:${NODE_VERSION}-bookworm-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="${PNPM_HOME}:${PATH}"
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0

RUN corepack enable \
  && corepack prepare pnpm@9.15.0 --activate

WORKDIR /app

# ── deps: only lockfiles — stays cached until dependencies change ─────────────
FROM base AS deps

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./

RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm fetch --frozen-lockfile

# ── build: source changes invalidate from here, not the fetch layer ───────────
FROM deps AS build

ENV NODE_ENV=development
ENV PNPM_CONFIG_PRODUCTION=false

COPY . .

RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --offline --filter "@workspace/api-server..."

RUN pnpm --filter @workspace/api-server build

# Schema sync when DATABASE_URL is available (Render injects it at image build time).
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    sh -c 'if [ -n "${DATABASE_URL:-}" ]; then pnpm --filter @workspace/db push; else echo "[docker/backend] skip db push — DATABASE_URL unset"; fi'

RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm --filter @workspace/api-server deploy --prod /deploy

# ── runner: minimal production image ──────────────────────────────────────────
FROM node:${NODE_VERSION}-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV AMYNEST_ENV=production

RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nodejs

COPY --from=build --chown=nodejs:nodejs /deploy/dist ./dist
COPY --from=build --chown=nodejs:nodejs /deploy/node_modules ./node_modules
COPY --from=build --chown=nodejs:nodejs /deploy/package.json ./package.json
COPY --from=build --chown=nodejs:nodejs /deploy/ota ./ota
COPY --from=build --chown=nodejs:nodejs /deploy/data ./data

USER nodejs

ARG PORT=5000
ENV PORT=${PORT}
EXPOSE ${PORT}

CMD ["node", "--enable-source-maps", "dist/index.mjs"]
