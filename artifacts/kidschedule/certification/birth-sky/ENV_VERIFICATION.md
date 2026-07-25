# Birth Sky ENV_VERIFICATION

**Build:** birth_sky_ops_verify/1.0.0  
**Generated:** 2026-07-25T19:44:48.649Z  
**Policy:** Report presence only. Never print secret values.

## Production topology (authoritative)

| Plane | Platform |
| --- | --- |
| Backend API | Coolify (Hetzner VPS 188.245.208.126, app ik6ml2uhw6op765lo14wn5m3) |
| Database | Coolify Postgres (tcl9udyxcuq2zu598ebj0pfu) on Hetzner VPS |
| Redis | Coolify Redis (g7jotufnm43n4au4e8n6x946) on Hetzner VPS |
| Static frontend | Cloudflare (www.amynest.in) |
| API edge | Cloudflare Worker amynest-api-proxy → Coolify |
| AI Worker | Dedicated Hetzner AI Worker (167.233.39.146, container amynest-worker) |

**Render is not part of production and must not be used for certification probes.**

## Environment configuration (Coolify)

| ID | Item | Presence | Evidence |
| --- | --- | --- | --- |
| E-DB | DATABASE_URL | SET | Coolify app container printenv; host=tcl9udyxcuq2zu598ebj0pfu; db=postgres; Postgres select 1 PASS |
| E-KEY | BIRTH_SKY_FIELD_ENCRYPTION_KEY | SET | Coolify API printenv SET; resolveOk=true; source_class=base64; len_class=GE32 (value not recorded). App reads process.env.BIRTH_SKY_FIELD_ENCRYPTION_KEY in birth-field-crypto.ts. |
| E-SESSION | SESSION_SECRET | SET | Coolify app container printenv SET; length class GE32; healthz/env phonicsSessionReady=true |
| E-FIREBASE | Firebase configuration | SET | API FIREBASE_SERVICE_ACCOUNT_JSON=SET. Web VITE_FIREBASE_* not required for Birth Sky (firebase-web-defaults.ts). Cloudflare VITE probe=NOT SET (informational only). |
| E-FIREBASE-API | Firebase (Coolify API) | SET | FIREBASE_SERVICE_ACCOUNT_JSON on Coolify backend container |
| E-FIREBASE-WEB | Firebase (Cloudflare web VITE_*) | NOT SET | NOT a canary blocker — client falls back to firebaseWebDefaults (public web config). VITE_* override optional. |
| E-RC | RevenueCat configuration | SET | Coolify: REVENUECAT_V2_SECRET_KEY + REVENUECAT_WEBHOOK_SECRET + REVENUECAT_PROJECT_ID all SET |
| E-OPENAI | OpenAI configuration | SET | Coolify OPENAI_API_KEY SET; healthz/env openai.configured=true |

## Infrastructure health

| ID | Item | Status | Evidence |
| --- | --- | --- | --- |
| H-COOLIFY-APP | Coolify application health | PASS | Container running; direct /health + /api/healthz HTTP 200 |
| H-BACKEND | Backend health (Cloudflare edge → Coolify) | PASS | www.amynest.in/api/healthz HTTP 200; x-amynest-backend=coolify |
| H-AUDIO | Backend audio health | PASS | www.amynest.in/api/healthz/audio HTTP 200 |
| H-WORKER | AI Worker connectivity | PASS | ubuntu-8gb-nbg1-1 amynest-worker /health ok=true; DATABASE_URL+REDIS_URL+OPENAI SET |
| H-CF | Cloudflare deployment | PASS | www.amynest.in HTTP 200; API proxy to Coolify PASS; primary JS 959B (stub — web Firebase NOT SET) |
| H-DB | Database connectivity | PASS | Coolify Postgres select 1 PASS; 143 public tables; app DATABASE_URL → tcl9udyxcuq2zu598ebj0pfu |
| H-SCHEMA | Birth Sky schema present on Coolify Postgres | PASS | All 6 Birth Sky tables PRESENT; public_table_count=143; applied via additive SQL after unsafe drizzle push preview rejected |

## Staging

- Hosted staging: **NOT AVAILABLE**
- Local Birth Sky unit smoke: feature-flags + privacy = PASS
