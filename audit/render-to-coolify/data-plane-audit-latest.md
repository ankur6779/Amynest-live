# Data Plane Consistency Audit

**Generated:** 2026-07-13T11:00:24.931Z

## Verdict: **SAFE**

Active stateful plane unified on Coolify; replica certified; Coolify public routing OK. Canary may proceed.

**Canary approved:** YES

### Gates

| Gate | Status |
|------|--------|
| Stateful plane unified | PASS |
| Data replica synced | PASS |
| Coolify public routing | PASS |

### Matrix

| Component | Service | Target | Plane | Group | OK | Evidence |
|-----------|---------|--------|-------|-------|----|----------|
| API traffic (primary) | Cloudflare Worker | https://amynest-backend-dykj.onrender.com | RENDER | routing | ✓ | wrangler.toml BACKEND_ORIGIN |
| API traffic (canary) | Cloudflare Worker | https://ik6ml2uhw6op765lo14wn5m3.188.245.208.126.sslip.io | COOLIFY | routing | ✓ | wrangler.toml CANARY_BACKEND_ORIGIN; CANARY_PERCENT=10 |
| DATABASE_URL | Render API (Amynest-backend-dykj) | Coolify Postgres via 188.245.208.126:5432 proxy | COOLIFY | database | ✓ | stateful-plane-audit.md STATEFUL PLANE CERTIFIED |
| DATABASE_URL | Coolify API | tcl9udyxcuq2zu598ebj0pfu | COOLIFY | database | ✓ | SSH docker exec printenv |
| DATABASE_URL | Hetzner AI Worker | Coolify Postgres via 188.245.208.126:5432 proxy | COOLIFY | database | ✓ | SSH /opt/amynest/worker.env |
| DATABASE_URL | Render AI Worker (standby) | amynest-db-dykj (legacy) | RENDER | standby | ✓ | render.yaml amynest-ai-worker-dykj — WORKER_ENABLED=false |
| REDIS_URL | Render API | Coolify Redis via 188.245.208.126:6379 proxy | COOLIFY | redis | ✓ | stateful-plane-audit.md STATEFUL PLANE CERTIFIED |
| REDIS_URL | Coolify API | g7jotufnm43n4au4e8n6x946 | COOLIFY | redis | ✓ | SSH docker exec |
| REDIS_URL | Hetzner AI Worker | Coolify Redis via 188.245.208.126:6379 proxy | COOLIFY | redis | ✓ | SSH worker.env |
| BullMQ ai-jobs | Coolify Redis + Hetzner Worker | wait=0, active=0, completed=18, failed=0 | COOLIFY | bullmq | ✓ | SSH ioredis on amynest-worker (unified queue) |
| BullMQ ai-jobs | Render API + Coolify API (producers) | keys=23 | COOLIFY | bullmq | ✓ | Both APIs enqueue to same Coolify Redis |
| RevenueCat webhook | RevenueCat Dashboard | https://www.amynest.in/api/subscription/webhook | RENDER | routing | ✓ | Cloudflare → BACKEND_ORIGIN (Render primary) |
| Razorpay webhook | Razorpay Dashboard | https://www.amynest.in/api/subscription/razorpay/webhook | RENDER | routing | ✓ | Cloudflare → BACKEND_ORIGIN |
| Firebase project | Render API + Coolify API + Worker | amynest-836ff | SHARED | third_party | ✓ | Same Firebase project on all APIs |
| Firebase Admin | Render API + Coolify API + Worker | amynest-836ff | SHARED | third_party | ✓ | Coolify SSH: SHARED |
| GCS bucket | Render API + Coolify API + Worker | amynest-audio-storage | SHARED | third_party | ✓ | Worker + APIs + CF Worker |
| GCS credentials | Render API + Coolify API + Worker | amynest-storage@amynest-836ff | SHARED | third_party | ✓ | Shared object store |
| OpenAI | Render API + Coolify API + Worker | (configured) | SHARED | third_party | ✓ | Same provider key on APIs + worker |
| Resend email | Render API + Coolify API + Worker | (configured) | SHARED | third_party | ✓ | Coolify SSH: set |
| Razorpay API | Render API + Coolify API + Worker | (configured) | SHARED | third_party | ✓ | Billing API keys |
| RevenueCat API | Render API + Coolify API + Worker | (configured) | SHARED | third_party | ✓ | Subscription sync keys |
| Notification scheduler | Render API process | node-cron in Amynest-backend | RENDER | scheduler | ✓ | notificationCron.ts — schedulerOwner=true |
| Notification scheduler | Coolify API process | node-cron in Coolify backend | COOLIFY | scheduler | ✓ | schedulerOwner=false on Coolify |
| Cron jobs (billing, phonics, TTS, recap) | Render API process | 15+ node-cron tasks | RENDER | scheduler | ✓ | artifacts/api-server/src/index.ts background phases |
| Cron jobs | Coolify API process | Same cron modules (disabled) | COOLIFY | scheduler | ✓ | BACKGROUND_TASKS_ENABLED=false on Coolify |
| HTTP /healthz | Render API | https://amynest-backend-dykj.onrender.com | RENDER | health | ✓ | live probe status=200 |
| HTTP /healthz | Coolify API (public URL) | https://ik6ml2uhw6op765lo14wn5m3.188.245.208.126.sslip.io | COOLIFY | health | ✓ | live probe status=200 |
| Postgres row count | Coolify Postgres (active stateful plane) | 588151 | COOLIFY | database | ✓ | SSH pg_stat_user_tables |

### Required before canary

1. Run `01-initial-copy.sh --replace` and `02-verify-replica.sh` (row counts must match)
2. Point **all** stateful components at the same plane (or keep 100% Render until cutover)
3. Align Hetzner worker `DATABASE_URL` + `REDIS_URL` with the API data plane
4. Re-run: `bash scripts/render-to-coolify/09-data-plane-audit.sh`

