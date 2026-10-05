# CLOUD TRANSFER RUNBOOK

**Date:** 24 September 2026  
No ownership or eligibility claimed without evidence. No transfers in this pass.

| Provider | Current evidence | Current owner | Account / project | Transfer mechanism | Billing | Secrets (names) | Dependencies | Backup | Recovery | Buyer acceptance |
|----------|------------------|---------------|-------------------|--------------------|---------|-----------------|--------------|--------|----------|------------------|
| Coolify | Prod API plane in env/deploy docs; sslip.io origin | **UNKNOWN** | **UNKNOWN** | Invite admin or rebuild | **UNKNOWN** | Full env dump offline | Git source **UNKNOWN** method | Images **UNKNOWN** | New instance + env | Origin `/api/healthz` 200 |
| Hetzner | SSH secret names; IPs `167.233.39.146` and `188.245.208.126` documented | **UNKNOWN** | **UNKNOWN** | Project transfer or new VPS | **UNKNOWN** | `HETZNER_HOST`, `HETZNER_SSH_PRIVATE_KEY` | Redis + worker image | Snapshot **UNKNOWN** | Rebuild worker | Job completes on buyer SSH |
| Cloudflare | Pages `amynest-web`, Worker proxy, likely DNS | **UNKNOWN** | Account id in old doc only | Account/zone invite or transfer | **UNKNOWN** | `CLOUDFLARE_API_TOKEN` | Custom domain | Zone export | Re-deploy Worker/Pages | www 200 + API via Worker |
| GCP / Firebase | Project id `amynest-836ff` in rotation doc | **UNKNOWN** | `amynest-836ff` | Project move | **UNKNOWN** | `FIREBASE_SERVICE_ACCOUNT_JSON`, `VITE_FIREBASE_*` | OAuth + FCM | Auth export policy UNKNOWN | Recreate apps last resort | Sign-in + push |
| GCS | Bucket name `amynest-audio-storage` | **UNKNOWN** IAM | Same project **INFERRED** | Moves with GCP or copy | **UNKNOWN** | `GCS_SERVICE_ACCOUNT_JSON` | TTS `TTS_USE_GCS` | Inventory **OWNER** | Copy + IAM | `healthz/audio` |
| PostgreSQL | Drizzle; host **UNKNOWN** | **UNKNOWN** | Coolify **INFERRED** | Dump/restore | **UNKNOWN** | `DATABASE_URL` | API boot | See recovery runbook | Scratch restore | R/W smoke |
| Redis | Required in prod | **UNKNOWN** | Historic Render Redis **stale** | New instance | **UNKNOWN** | `REDIS_URL` | Worker | Usually ephemeral | New empty + DLQ accept | Job consumed |
| Render | Suspended 20 Jul 2026 cert; `RENDER_API_KEY` name still in GH | **UNKNOWN** if gone | Historic `*-dykj` | Confirm unused; revoke key later | **UNKNOWN** | `RENDER_API_KEY` | None if dead | N/A | Do not resume blindly | Direct URL 503 |

**CURRENT PRODUCTION DB HOST = UNKNOWN**
