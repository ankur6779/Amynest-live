# DEPLOYMENT

**Current production plane (from `.env.production.example` and repo infra, 24 Sep 2026):**

| Layer | System | Evidence |
|-------|--------|----------|
| Web | Cloudflare Pages + Worker proxy `infra/cloudflare/amynest-api-proxy/` | Env comments |
| API | Coolify, public URL pattern `API_PUBLIC_URL` | Env example |
| Scheduler | `SCHEDULER_ACTIVE_PLANE=coolify` | Env example |
| AI worker | Hetzner, `WORKER_ENABLED=true`, Redis required | Env + `docs/hetzner-ai-worker.md` |
| Historical | Render blueprint / `docs/dev-environment.md` PROD table | **STALE — do not treat as live** |

## Web release

1. Build kidschedule (`pnpm --filter @workspace/kidschedule` production build).
2. Publish static assets to Cloudflare Pages (procedure in existing Cloudflare docs; **credentials not in repo**).
3. Worker must keep `/api/*` same-origin to `www.amynest.in`.

## API release

Coolify watches the repo / image per seller’s project (UNVERIFIED exact service IDs). Required env: see `ENVIRONMENT_VARIABLES.md`. `assertCriticalEnvAtBoot()` exits if `DATABASE_URL` is missing.

## iOS

Xcode project under `artifacts/amynest-capacitor/ios/`. Store upload is founder-operated today. See `IOS_RELEASE.md`.

## Android

Ship **`android/`** WebView wrapper, not Capacitor Android. See `GOOGLE_PLAY_RELEASE.md`.

## Rollback

- Web: Cloudflare previous deployment (UNVERIFIED if Pages history is retained).
- API: Coolify previous image (UNVERIFIED).
- Feature flags: `VITE_FF_*` and API kill switches (e.g. Birth Sky) require rebuild or env change.

**Buyer cannot deploy from this repo alone.** Founder Coolify / Cloudflare / Apple / Play logins are required. Status: **HIGH founder dependency**.
