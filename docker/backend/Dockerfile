# syntax=docker/dockerfile:1
#
# AmyNest API server — cache-friendly multi-stage build.
# pnpm install --frozen-lockfile is the pnpm equivalent of npm ci.
#
# Build:  docker build -f docker/backend/Dockerfile -t amynest-api .
# Run:    docker run --rm -p 5000:5000 -e PORT=5000 -e DATABASE_URL=... amynest-api

ARG NODE_VERSION=22
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

# Coolify injects build-time NODE_ENV=production (ARG after each FROM), which
# makes pnpm skip devDependencies. CI=true also prevents interactive prompts
# that otherwise abort install in non-TTY Coolify builds.
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    CI=true NODE_ENV=development PNPM_CONFIG_PRODUCTION=false \
    pnpm fetch --frozen-lockfile

# ── build: source changes invalidate from here, not the fetch layer ───────────
FROM deps AS build

ENV CI=true
ENV NODE_ENV=development
ENV PNPM_CONFIG_PRODUCTION=false

COPY . .

RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    CI=true NODE_ENV=development PNPM_CONFIG_PRODUCTION=false \
    pnpm install --frozen-lockfile --offline --prod=false --filter "@workspace/api-server..."

# esbuild is required by artifacts/api-server/build.mjs — fail fast with a clear
# message if Coolify/production filtering still dropped it.
RUN CI=true NODE_ENV=development node -e "const {createRequire}=require('node:module'); const {join}=require('node:path'); createRequire(join('/app/artifacts/api-server','package.json'))('esbuild'); console.log('[docker/backend] esbuild OK')"

RUN CI=true NODE_ENV=development pnpm --filter @workspace/api-server build

# Optional schema sync at image build time (Render only). Coolify injects
# DATABASE_URL as a build ARG, which would incorrectly trigger a push against a
# host unreachable from the build container — require an explicit opt-in.
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    sh -c 'if [ "${RUN_DB_PUSH_AT_BUILD:-}" = "1" ] && [ -n "${DATABASE_URL:-}" ]; then pnpm --filter @workspace/db push; else echo "[docker/backend] skip db push (set RUN_DB_PUSH_AT_BUILD=1 to enable)"; fi'

RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm --filter @workspace/api-server deploy --prod /deploy

# Birth Sky ephemeris daemon: Python deps + local JPL DE440 (no runtime download).
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 python3-venv python3-pip curl ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && python3 -m venv /app/artifacts/ephemeris-daemon/.venv \
  && /app/artifacts/ephemeris-daemon/.venv/bin/pip install --no-cache-dir -r /app/artifacts/ephemeris-daemon/requirements.txt \
  && bash /app/artifacts/ephemeris-daemon/scripts/fetch-jpl-ephemeris.sh

# ── runner: minimal production image ──────────────────────────────────────────
FROM node:${NODE_VERSION}-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV AMYNEST_ENV=production
ENV BIRTH_SKY_EPHEMERIS_URL=http://127.0.0.1:5099
ENV BIRTH_SKY_EPHEMERIS_HOST=127.0.0.1
ENV BIRTH_SKY_EPHEMERIS_PORT=5099
ENV BIRTH_SKY_EPHEMERIS_DATA_DIR=/app/ephemeris-daemon/data

RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nodejs \
  && apt-get update \
  && apt-get install -y --no-install-recommends python3 curl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY --from=build --chown=nodejs:nodejs /deploy/dist ./dist
COPY --from=build --chown=nodejs:nodejs /deploy/node_modules ./node_modules
COPY --from=build --chown=nodejs:nodejs /deploy/package.json ./package.json
COPY --from=build --chown=nodejs:nodejs /deploy/ota ./ota
# Runtime JSON manifests (spelling/static/phonics maps) live under src/data in the package.
COPY --from=build --chown=nodejs:nodejs /deploy/src/data ./src/data
# Legacy loaders resolve ../data from dist/index.mjs — keep tts-cache + manifest JSONs together.
COPY --from=build --chown=nodejs:nodejs /deploy/data ./data
COPY --from=build --chown=nodejs:nodejs /deploy/src/data/*.json ./data/
# Premium phonics workbook PDF (served by GET /api/phonics/workbook/download).
COPY --from=build --chown=nodejs:nodejs \
  /app/artifacts/api-server/assets/phonics-mastery-15-sets.pdf \
  ./assets/phonics-mastery-15-sets.pdf
# Skyfield + JPL BSP daemon (local only)
COPY --from=build --chown=nodejs:nodejs /app/artifacts/ephemeris-daemon /app/ephemeris-daemon
COPY --from=build --chown=nodejs:nodejs /app/scripts/start-api-with-ephemeris.sh /app/scripts/start-api-with-ephemeris.sh

RUN chmod +x /app/scripts/start-api-with-ephemeris.sh \
  /app/ephemeris-daemon/scripts/start.sh \
  /app/ephemeris-daemon/scripts/fetch-jpl-ephemeris.sh

USER nodejs

ARG PORT=5000
ENV PORT=${PORT}
EXPOSE ${PORT}

# Supervises ephemeris daemon (auto-restart) + Node API
CMD ["bash", "/app/scripts/start-api-with-ephemeris.sh"]
