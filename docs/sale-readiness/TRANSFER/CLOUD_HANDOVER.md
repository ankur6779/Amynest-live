# CLOUD / INFRASTRUCTURE HANDOVER

**Date:** 24 September 2026  
Separate **account transfer**, **credential rotation**, and **service migration**. They are not equivalent.

| Provider | Purpose | Current owner | Evidence | Evidence type | Transfer mechanism | Billing owner | Secrets / hooks | Backup / recovery | Status |
|----------|---------|---------------|----------|---------------|--------------------|---------------|-----------------|-------------------|--------|
| Coolify | Production API origin; intended scheduler/DB plane | **UNKNOWN** | `.env.production.example`; `deploy-production.yml` comments; sslip.io origin `188.245.208.126` in CI smoke | Usage **VERIFIED**; account **UNKNOWN** | Grant Coolify admin **or** rebuild stack from compose + env dump | **UNKNOWN** | Git auto-deploy mechanism **UNKNOWN** (repo hooks `[]`) | Image history **UNKNOWN** | **UNKNOWN — OWNER ACTION REQUIRED** |
| Hetzner | Dedicated AI worker + (docs) possible same IP as Coolify host | **UNKNOWN** | Actions `HETZNER_HOST` / `HETZNER_SSH_PRIVATE_KEY`; `docs/hetzner-ai-worker.md` cites `167.233.39.146`; example Redis `188.245.208.126` | Two IPs **documented**; **which is live worker UNKNOWN** | Hetzner Cloud project transfer / add buyer SSH / rebuild CX | **UNKNOWN** | Root SSH in GitHub secrets — **rotate after** | Snapshot **UNKNOWN** | **UNKNOWN — OWNER ACTION REQUIRED** |
| Cloudflare | Pages `amynest-web` + Worker `amynest-api-proxy` + likely DNS | Account ID seen in old migration doc `362bb082e16cf42fbcd036e164f0fbc4` | `infra/cloudflare/`; `CLOUDFLARE_API_TOKEN` | Usage **VERIFIED**; legal account title **UNKNOWN** | Cloudflare account / zone transfer or invite Super Admin | **UNKNOWN** | Token on GH — **rotate** | Pages history **UNKNOWN** | **UNKNOWN — OWNER ACTION REQUIRED** |
| Firebase / GCP project `amynest-836ff` | Auth, FCM, Analytics, SA | **UNKNOWN** (runbook assumes founder Owner) | `docs/gcp-credential-rotation.md`; historical audit JSON | Project id **VERIFIED** in docs; IAM title **UNKNOWN** | GCP project move to buyer org **or** recreate apps | **UNKNOWN** | `FIREBASE_SERVICE_ACCOUNT_JSON`, Vite Firebase secrets | Auth user export policy **UNKNOWN** | **UNKNOWN — OWNER ACTION REQUIRED** |
| GCS bucket `amynest-audio-storage` | TTS / static audio / catalogs | Same GCP **INFERRED** | Code default bucket name; `GCS_SERVICE_ACCOUNT_JSON` | Bucket name **VERIFIED** in code; IAM **UNKNOWN** | Moves with GCP project **or** object copy | **UNKNOWN** | SA `amynest-storage@amynest-836ff.iam.gserviceaccount.com` | Versioning **UNKNOWN** | **UNKNOWN — OWNER ACTION REQUIRED** |
| PostgreSQL | App + analytics data | Coolify plane **INFERRED** | `DATABASE_HANDOVER.md` | Host **UNKNOWN** 24 Sep | Dump + new instance | **UNKNOWN** | `DATABASE_URL` | Restore **FAIL** | **UNKNOWN — OWNER ACTION REQUIRED** |
| Redis | BullMQ | **UNKNOWN** (Render Redis docs stale) | `REDIS_URL` required; `REDIS_URL_EXTERNAL` GH secret name | Requirement **VERIFIED**; host **UNKNOWN** | New Redis + cut worker/API | **UNKNOWN** | Rotate URL | Ephemeral expected | **UNKNOWN — OWNER ACTION REQUIRED** |
| Render | Historic API/static/DB/Redis | Documented suspended 20 Jul 2026 | `render-retirement-final-certification.md`; GH secret `RENDER_API_KEY` still exists | July **VERIFIED** in that cert; **24 Sep live UNKNOWN** | Confirm unused; delete key; do not resume blindly | **UNKNOWN** | `RENDER_API_KEY` | N/A if dead | **UNKNOWN if still exists** |
| Sentry | Optional APM | **UNKNOWN** if DSN set in prod | Code + empty `SENTRY_DSN=` in example | Integration **VERIFIED**; live use **UNKNOWN** | Invite / new DSN | **UNKNOWN** | Rotate DSN | N/A | **UNKNOWN** |
| Logging | API `LOG_LEVEL`; host logs | Host **UNKNOWN** | Env example | **INFERRED** Coolify/Hetzner logs | Access to host dashboards | — | — | Retention **UNKNOWN** | **UNKNOWN** |
| GitHub Actions | CI + deploy | `ankur6779` | `GITHUB_HANDOVER.md` | **VERIFIED** | Repo transfer + secret recreate | GitHub on founder card **UNKNOWN** | See secret name list | N/A | **FOUNDER-DEPENDENT** |

## Three layers (example: GCP)

1. **Account transfer:** move project `amynest-836ff` to buyer billing org.  
2. **Credential rotation:** new SA keys; revoke `firebase-adminsdk-fbsvc@…` and `amynest-storage@…` keys held by founder/Coolify.  
3. **Service migration:** only if project cannot move — recreate Firebase apps, copy GCS, retarget clients (breaks `com.amynest.app` OAuth unless package stays and fingerprints are updated).

Do not treat “share the password” as any of the three.
