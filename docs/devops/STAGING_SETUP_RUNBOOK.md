# Staging setup runbook

**Status:** `READY FOR HUMAN SETUP`  
Do not run this against production. Do not apply migration `0052` until a later, separate approval after staging exists.

## Order

1. Confirm the Coolify VPS has about 2 GB RAM and 10 GB disk free. Stop if it does not.
2. Create Coolify Postgres `amynest-staging-db` with database name `amynest_staging`, its own user, and its own volume.
3. Create Coolify Redis `amynest-staging-redis` on its own volume.
4. Create Coolify application `amynest-api-staging` from `docker/backend/Dockerfile`. Do not clone the production application's env group.
5. Set the variables in `STAGING_ENVIRONMENT_VARIABLES.md`. `AMYNEST_ENV=staging` is mandatory.
6. Add DNS and certificates from `STAGING_DEPLOYMENT_CHECKLIST.md`. Do not edit `www` or the apex records.
7. Create Cloudflare Pages project `amynest-web-staging`. Build the web app with `VITE_AMYNEST_ENV=staging` and `VITE_APP_API_ORIGIN=https://api-staging.amynest.in`.
8. Create a new Firebase project. Add authorized domain `staging.amynest.in`. Do not add this app to Firebase project `amynest-836ff`.
9. Create RevenueCat Test Store apps and a new webhook secret. Point the webhook at the staging API only.
10. Run GitHub Actions workflow **Staging isolation check** with the staging secrets. It must print `STAGING ISOLATION: ok` and must not deploy.
11. Start the staging API. `GET /health` must return `ok: true`. Boot must refuse to start if the database host or name is wrong.
12. Apply schema with the SQL files in `lib/db/migrations/`, in filename order, using the staging URL only. Skip `0052` until the analytics approval that follows a clean precheck.
13. Load synthetic parents and children only. Do not restore a production dump.

## Database

| Item | Staging value |
|---|---|
| Database name | `amynest_staging` |
| User | `amynest_staging` |
| Volume | New Coolify volume, not the production volume |
| Pool | `PG_POOL_MAX=5` |
| Statement timeout | `PG_STATEMENT_TIMEOUT_MS=30000` |
| Backup | Daily `pg_dump` of `amynest_staging` only, keep 7 days, store outside the production volume |
| Credentials | Generate in Coolify. Store as `STAGING_DATABASE_URL`. Never reuse the production URL. |
| Health | API `GET /health` and `pg_isready` inside the staging database container |

Migration command, after the URL has passed the isolation check:

```bash
psql "$STAGING_DATABASE_URL" -v ON_ERROR_STOP=1 -f lib/db/migrations/0001_static_audio_registry.sql
```

Repeat in filename order. Do not use `pnpm db:push`. Do not include `0052_analytics_event_id_uidx.sql` in the first schema load.

## Rollback

Stop and delete only `amynest-api-staging`, `amynest-staging-db`, and `amynest-staging-redis`. Remove the two new DNS records and the Pages project `amynest-web-staging`. Production containers, volumes, env, DNS, and workflows stay as they are. Dropping `amynest_staging` deletes staging data only.

## What this runbook does not do

It does not create the Coolify services, change DNS, deploy Pages, or apply migrations. Those remain manual.
