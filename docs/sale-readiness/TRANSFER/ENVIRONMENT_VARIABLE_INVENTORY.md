# ENVIRONMENT VARIABLE INVENTORY

**Date:** 24 September 2026  
**NAMES ONLY.** No values, keys, passwords, tokens, or private keys.

Sources: `.env.production.example`, `.env.development.example`, `.env.hetzner-worker.example`, `.github/workflows/deploy-production.yml`, `gh secret list` / `gh variable list` (names).

Locations: **example file** · **GitHub Actions secret name** · **GitHub variable** · **Coolify (inferred, not listed)** · **unknown store**

---

## PUBLIC CONFIG (non-secret flags / public URLs)

| Variable name | Purpose | Required? | Production? | Secret? | Current location | Transfer mechanism | Buyer action | Status |
|---------------|---------|-----------|-------------|---------|------------------|--------------------|--------------|--------|
| AMYNEST_ENV | Profile | Yes | Yes | No | example | Copy flag | Set `production` | PREPARABLE NOW |
| NODE_ENV | Node profile | Yes | Yes | No | example | Copy | Set `production` | PREPARABLE NOW |
| PORT | API port | Yes | Yes | No | example (`10000` prod) | Copy | Match Coolify | PREPARABLE NOW |
| API_PUBLIC_URL | Public API origin | Yes | Yes | No | example + GH secret **name** | Re-point after cut | New origin | OWNER ACTION REQUIRED |
| LOG_LEVEL | Logging | No | Yes | No | example | Copy | — | PREPARABLE NOW |
| NOTIFICATIONS_ENABLED | Push crons | Prod yes | Yes | No | example | Copy | Confirm | PREPARABLE NOW |
| BACKGROUND_TASKS_ENABLED | Background | Prod yes | Yes | No | example | Copy | Confirm | PREPARABLE NOW |
| SCHEDULER_ACTIVE_PLANE | Cron owner | Prod yes | Yes | No | example `coolify` | Copy | Keep until redesigned | PREPARABLE NOW |
| ADMIN_HEALTH_DIGEST_ENABLED | Digest on/off | No | Yes | No | example | Copy | — | PREPARABLE NOW |
| ADMIN_ALERT_EMAIL | Alert destination | Ops | Yes | PII | example name (founder Gmail in example — **do not treat as live proof**) | Change address | Buyer inbox | OWNER ACTION REQUIRED |
| TTS_USE_GCS | TTS cache plane | Prod yes | Yes | No | example `true` | Copy | Need GCS | OWNER ACTION REQUIRED |
| PG_POOL_MAX | Pool | No | Yes | No | example | Copy | — | PREPARABLE NOW |
| PG_STATEMENT_TIMEOUT_MS | Query cap | No | Yes | No | example | Copy | — | PREPARABLE NOW |
| ROUTINES_LIST_MAX | List cap | No | Yes | No | example | Copy | — | PREPARABLE NOW |
| WORKER_ENABLED | Dedicated worker | Prod yes | Yes | No | example | Copy | Must be true in prod | PREPARABLE NOW |
| AI_MAX_CONCURRENT_JOBS | Worker concurrency | No | Yes | No | example | Copy | — | PREPARABLE NOW |
| AI_JOB_TIMEOUT_MS | Job timeout | No | Yes | No | example | Copy | — | PREPARABLE NOW |
| SENTRY_TRACES_SAMPLE_RATE | APM sample | No | Optional | No | example | Copy | — | PREPARABLE NOW |
| VITE_AMYNEST_ENV | Web profile | Yes | Yes | No | example | Build arg | — | PREPARABLE NOW |
| VITE_APP_API_ORIGIN | Web API origin | Yes | Yes | No | example `https://www.amynest.in` | Rebuild | Confirm | PREPARABLE NOW |
| VITE_USE_LOCAL_API | Dev proxy | Dev | No | No | dev example | N/A prod | — | READY (dev) |
| PLAY_STORE_URL / APP_STORE_URL / WEBSITE_URL | Content-engine CTAs | Content | Optional | No | dev example | Copy | — | PREPARABLE NOW |
| AMYNEST_CONTENT_FACTORY_LIVE | GH variable | Content CI | Optional | No | GH variables | Recreate variable | — | PREPARABLE NOW |
| AMYNEST_CONTENT_FACTORY_REF | GH variable | Content CI | Optional | No | GH variables | Recreate | — | PREPARABLE NOW |
| AUDIO_GATE_API_URL | GH variable | CI gates | Optional | No | GH variables | Point at buyer origin | — | OWNER ACTION REQUIRED |

---

## SECRET CONFIG (names only)

| Variable name | Purpose | Required? | Production? | Secret? | Current location | Transfer mechanism | Buyer action | Status |
|---------------|---------|-----------|-------------|---------|------------------|--------------------|--------------|--------|
| DATABASE_URL | Postgres | **Boot-fatal** | Yes | Yes | GH secret **name**; Coolify **inferred** | New URL after restore | Provision DB | OWNER ACTION REQUIRED |
| REDIS_URL / REDIS_URL_EXTERNAL | BullMQ | Prod yes | Yes | Yes | example + GH secret **name** | New Redis URL | Provision Redis | OWNER ACTION REQUIRED |
| OPENAI_API_KEY | LLM/TTS | Feature | Yes if AI on | Yes | GH secret **name** | New org key | Buyer TOS | OWNER ACTION REQUIRED |
| GOOGLE_API_KEY / GEMINI_API_KEY | Gemini/Google | Feature | If used | Yes | example + GH secret **name** | New key | Buyer GCP | OWNER ACTION REQUIRED |
| ELEVENLABS_API_KEY | Optional TTS | Optional | UNKNOWN live | Yes | dev example | New or drop | Confirm unused | UNKNOWN |
| GCS_SERVICE_ACCOUNT_JSON | GCS IAM | Prod TTS | Yes | Yes | GH secret **name** | New SA JSON | Buyer GCP | OWNER ACTION REQUIRED |
| DEFAULT_OBJECT_STORAGE_BUCKET_ID / GCS_BUCKET_NAME | Bucket id | Prod TTS | Yes | Low | GH secret **name** / code default | Same name if project moves | Confirm | OWNER ACTION REQUIRED |
| FIREBASE_SERVICE_ACCOUNT_JSON | Admin auth | API | Yes | Yes | Rotation doc; Coolify **inferred** | New SA | Buyer GCP | OWNER ACTION REQUIRED |
| VITE_FIREBASE_* (API_KEY, AUTH_DOMAIN, PROJECT_ID, APP_ID, MESSAGING_SENDER_ID, VAPID_KEY) | Client auth/push | Web yes | Yes | Client-public / still treat as controlled | Workflow refs; **not** on `gh secret list` | Rebuild web | Recreate | UNKNOWN store |
| VITE_GA4_MEASUREMENT_ID | GA4 | If used | UNKNOWN | Measurement | Workflow ref; not on secret list | Rebuild | New or transfer property | UNKNOWN |
| CLOUDFLARE_API_TOKEN | Pages/Worker deploy | CI yes | Yes | Yes | GH secret **name** | New token | Buyer CF | OWNER ACTION REQUIRED |
| HETZNER_HOST / HETZNER_SSH_PRIVATE_KEY | Worker SSH | CI worker | Yes | Yes | GH secret **names** | New host/key | Buyer Hetzner | OWNER ACTION REQUIRED |
| INTERNAL_HEALTH_SECRET | Healthz lock | Optional | If set | Yes | GH secret **name** | New | Set | OWNER ACTION REQUIRED |
| ADMIN_AUTH_TOKEN | Admin/CI | UNKNOWN scope | If set | Yes | GH secret **name** | New | Set | UNKNOWN purpose-complete |
| REVENUECAT_WEBHOOK_SECRET / REVENUECAT_V2_SECRET_KEY | Billing | Yes if RC | Yes | Yes | Code names; Coolify **inferred** | Rotate after invite | Buyer RC | OWNER ACTION REQUIRED |
| RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET | Web pay | If used | Seller unused | Yes | Code names | Retire or KYC | Confirm unused | SELLER-STATED unused |
| BIRTH_SKY_FIELD_ENCRYPTION_KEY | Field crypto | If Birth Sky data | If used | Yes | example comment | Escrow then rotate carefully | Load on scratch | OWNER ACTION REQUIRED |
| SESSION_SECRET | Sessions | API | Yes typically | Yes | dev example **name** | New | Set ≥32 chars | OWNER ACTION REQUIRED |
| SENTRY_DSN / VITE_SENTRY_DSN / SENTRY_USER_HASH_SALT | APM | Optional | UNKNOWN live | Yes | empty example | New or omit | Confirm | UNKNOWN |
| ADMIN_ALERT_SLACK_WEBHOOK_URL | Slack digest | Optional | UNKNOWN | Yes | empty example | New or omit | Confirm | UNKNOWN |
| ADMIN_ALERT_TELEGRAM_* | Telegram | Optional | UNKNOWN | Yes | commented example | New or omit | Confirm | UNKNOWN |
| KIE_API_KEY | Video factory | Content | UNKNOWN live | Yes | GH secret **name** | New or revoke | Confirm | UNKNOWN |
| YOUTUBE_CLIENT_ID / YOUTUBE_CLIENT_SECRET / YOUTUBE_REFRESH_TOKEN | Upload | Content | UNKNOWN live | Yes | GH secret **names** | New OAuth | Confirm | UNKNOWN |
| YOUBOT_API_KEY | Content | UNKNOWN | UNKNOWN | Yes | dev example | Confirm | Confirm | UNKNOWN |
| RENDER_API_KEY | Historic Render | Should be unused | UNKNOWN | Yes | GH secret **name** | Revoke after confirm | Ignore if dead | OWNER ACTION REQUIRED |
| EXPO_PUBLIC_* | Archived Expo | Not shipped stores | No | Mixed | prod example | Ignore for Play/iOS | — | PREPARABLE NOW (ignore) |

**Never commit filled `.env.production`.** Buyer receives values via **offline escrow**, not git.
