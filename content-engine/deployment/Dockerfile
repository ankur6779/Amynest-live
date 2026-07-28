# AmyNest Content Engine — production image (Phase 10)
FROM node:22-bookworm-slim AS base
WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates curl ffmpeg \
  && rm -rf /var/lib/apt/lists/*

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY content-engine/package.json ./content-engine/package.json
RUN corepack enable && pnpm install --filter @workspace/content-engine... --frozen-lockfile

FROM base AS runtime
ENV NODE_ENV=production \
    AMYNEST_ENV=production \
    AMYNEST_DATA_DIR=/data \
    AMYNEST_BACKUP_DIR=/backups \
    AMYNEST_OUTPUT_DIR=/renders \
    AMYNEST_SECRET_VALIDATION_MODE=strict

COPY --from=deps /app/node_modules ./node_modules
COPY content-engine ./content-engine
COPY package.json pnpm-workspace.yaml tsconfig.base.json ./

RUN mkdir -p /data /backups /renders \
  && chown -R node:node /data /backups /renders /app

USER node
WORKDIR /app/content-engine

VOLUME ["/data", "/backups", "/renders"]
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node --import tsx/esm ./cli/amynest.ts health --data-dir /data --backup-dir /backups || exit 1

CMD ["node", "--import", "tsx/esm", "./cli/amynest.ts", "daily-short", "--production", "--trigger", "docker"]
