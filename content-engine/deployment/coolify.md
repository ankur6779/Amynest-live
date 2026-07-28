# Coolify deployment

## Service

- Type: Docker Compose
- Compose file: `content-engine/deployment/docker-compose.yml`
- Env file: copy `content-engine/deployment/.env.production.example`

## Schedule

Configure a Coolify scheduled task / cron to run daily:

```bash
cd /app/content-engine && node --import tsx/esm ./cli/amynest.ts daily-short --trigger coolify
```

Suggested cron (Asia/Kolkata 09:00): `0 9 * * *`

## Health

Coolify should probe the container healthcheck (CLI `amynest:health`).

## Persistent storage

Map volumes:

- `/data` → workflow/analytics/learning/campaign state
- `/backups` → backup manifests
- `/renders` → rendered media output

## Restart policy

`restart: unless-stopped` is configured in compose for unattended recovery after crashes.
