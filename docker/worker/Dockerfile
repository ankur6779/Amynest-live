# syntax=docker/dockerfile:1
#
# AmyNest AI worker — shares the same dependency cache pattern as the API image.
#
# Build: docker build -f docker/worker/Dockerfile -t amynest-worker .
# Run:   docker run --rm -e REDIS_URL=... -e DATABASE_URL=... amynest-worker

ARG NODE_VERSION=20
FROM node:${NODE_VERSION}-bookworm-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="${PNPM_HOME}:${PATH}"
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0

RUN corepack enable \
  && corepack prepare pnpm@9.15.0 --activate

WORKDIR /app

FROM base AS deps

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./

RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm fetch --frozen-lockfile

FROM deps AS build

ENV NODE_ENV=development
ENV PNPM_CONFIG_PRODUCTION=false

COPY . .

RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --offline --filter "@workspace/api-server..."

RUN pnpm --filter @workspace/api-server build

RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm --filter @workspace/api-server deploy --prod /deploy

FROM node:${NODE_VERSION}-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV AMYNEST_ENV=production
ENV AMYNEST_AI_WORKER_MODE=standalone

RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nodejs

COPY --from=build --chown=nodejs:nodejs /deploy/dist ./dist
COPY --from=build --chown=nodejs:nodejs /deploy/node_modules ./node_modules
COPY --from=build --chown=nodejs:nodejs /deploy/package.json ./package.json

USER nodejs

CMD ["node", "--enable-source-maps", "dist/worker/index.mjs"]
