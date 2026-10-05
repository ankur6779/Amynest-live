# SECRET TYPE INVENTORY (NAMES ONLY)

**Date:** 25 September 2026  
**SB-E01 pack:** `AMYNEST-ESCROW-2026-09-25-0cc370f2` — 37 ESCROW REQUIRED records verified.  
No values. Sources used for presence: Coolify backend export, Coolify web export, local CI env files, local SSH identity. GitHub Actions secret **values** cannot be read back.

| Secret identifier / name | Purpose | Environment | Current storage location/type | Classification | Rotation before buyer | Escrow status |
|--------------------------|---------|-------------|-------------------------------|----------------|----------------------|---------------|
| DATABASE_URL | Postgres | production | Coolify export | ESCROW REQUIRED | UNKNOWN | **ESCROWED** |
| REDIS_URL | Queue | production | Coolify export | ESCROW REQUIRED | UNKNOWN | **ESCROWED** |
| REDIS_URL_EXTERNAL | Queue (CI name) | production-ci | GH secret **name** only | **NOT FOUND** | UNKNOWN | **NOT FOUND** |
| OPENAI_API_KEY | LLM / TTS | production | Coolify export | ESCROW REQUIRED | YES | **ESCROWED** |
| GEMINI_API_KEY | Gemini | production | Coolify export | ESCROW REQUIRED | YES | **ESCROWED** |
| GOOGLE_API_KEY | Google APIs | production | Coolify export | ESCROW REQUIRED | YES | **ESCROWED** |
| GOOGLE_DRIVE_KEY | Google Drive | production | Coolify export | ESCROW REQUIRED | YES | **ESCROWED** |
| GCS_SERVICE_ACCOUNT_JSON | GCS | production | Coolify export | ESCROW REQUIRED | YES | **ESCROWED** |
| DEFAULT_OBJECT_STORAGE_BUCKET_ID | Bucket id | production | Coolify export | ESCROW REQUIRED | NO | **ESCROWED** |
| FIREBASE_SERVICE_ACCOUNT_JSON | Firebase Admin | production | Coolify export | ESCROW REQUIRED | YES | **ESCROWED** |
| VITE_FIREBASE_API_KEY | Web Firebase | production | Coolify web export | ESCROW REQUIRED | UNKNOWN | **ESCROWED** |
| VITE_FIREBASE_APP_ID | Web Firebase | production | Coolify web export | ESCROW REQUIRED | UNKNOWN | **ESCROWED** |
| VITE_FIREBASE_AUTH_DOMAIN | Web Firebase | production | Coolify web export | ESCROW REQUIRED | UNKNOWN | **ESCROWED** |
| VITE_FIREBASE_MESSAGING_SENDER_ID | Web Firebase | production | Coolify web export | ESCROW REQUIRED | UNKNOWN | **ESCROWED** |
| VITE_FIREBASE_PROJECT_ID | Web Firebase | production | Coolify web export | ESCROW REQUIRED | UNKNOWN | **ESCROWED** |
| VITE_FIREBASE_VAPID_KEY | Web Firebase | production | Coolify web export | ESCROW REQUIRED | UNKNOWN | **ESCROWED** |
| VITE_GA4_MEASUREMENT_ID | Analytics | production | Workflow **name** only | **NOT FOUND** | UNKNOWN | **NOT FOUND** |
| CLOUDFLARE_API_TOKEN | Deploy / DNS | CI | GH secret **name** only | **NOT FOUND** | YES | **NOT FOUND** |
| HETZNER_HOST | Worker host | production | Local CI env | ESCROW REQUIRED | UNKNOWN | **ESCROWED** |
| HETZNER_SSH_PRIVATE_KEY | Worker SSH | production | Local SSH identity file | ESCROW REQUIRED | YES | **ESCROWED** |
| INTERNAL_HEALTH_SECRET | Healthz | production | Coolify export | ESCROW REQUIRED | YES | **ESCROWED** |
| SESSION_SECRET | Sessions | production | Coolify export | ESCROW REQUIRED | YES | **ESCROWED** |
| ADMIN_AUTH_TOKEN | Admin / CI | CI | GH secret **name** only | **NOT FOUND** | YES | **NOT FOUND** |
| API_PUBLIC_URL | Public origin | production | Coolify export (URL, not a credential) | **NOT REQUIRED** | N/A | **NOT REQUIRED** |
| KIE_API_KEY | Content factory | production | Coolify export | ESCROW REQUIRED | YES | **ESCROWED** |
| YOUBOT_API_KEY | Content factory | production | Coolify export | ESCROW REQUIRED | YES | **ESCROWED** |
| YOUTUBE_CLIENT_ID | YouTube OAuth | production-ci | Local CI env | ESCROW REQUIRED | YES | **ESCROWED** |
| YOUTUBE_CLIENT_SECRET | YouTube OAuth | production-ci | Local CI env | ESCROW REQUIRED | YES | **ESCROWED** |
| YOUTUBE_REFRESH_TOKEN | YouTube OAuth | production-ci | Local CI env | ESCROW REQUIRED | YES | **ESCROWED** |
| RENDER_API_KEY | Historic Render | CI | GH secret **name** only | **NOT FOUND** | YES (revoke later) | **NOT FOUND** |
| REVENUECAT_WEBHOOK_SECRET | Billing | production | Coolify export | ESCROW REQUIRED | YES | **ESCROWED** |
| REVENUECAT_V2_SECRET_KEY | Billing | production | Coolify export | ESCROW REQUIRED | YES | **ESCROWED** |
| REVENUECAT_SECRET_KEY | Billing | production | Coolify export | ESCROW REQUIRED | YES | **ESCROWED** |
| REVENUECAT_API_KEY | Billing | production | Coolify export | ESCROW REQUIRED | YES | **ESCROWED** |
| REVENUECAT_IOS_PUBLIC_KEY | Billing | production | Coolify export | ESCROW REQUIRED | YES | **ESCROWED** |
| VITE_REVENUECAT_IOS_API_KEY | Web billing | production | Coolify web export | ESCROW REQUIRED | YES | **ESCROWED** |
| BILLING_RECOVERY_SECRET | Billing recovery | production | Coolify export | ESCROW REQUIRED | YES | **ESCROWED** |
| RESEND_API_KEY | Email provider | production | Coolify export | ESCROW REQUIRED | YES | **ESCROWED** |
| BIRTH_SKY_FIELD_ENCRYPTION_KEY | Field crypto | production | Coolify export | ESCROW REQUIRED | UNKNOWN | **ESCROWED** |
| ELEVENLABS_API_KEY | TTS | production | Coolify export | ESCROW REQUIRED | YES | **ESCROWED** |
| HCLOUD_TOKEN | Hetzner Cloud API | production | Coolify export | ESCROW REQUIRED | YES | **ESCROWED** |
| ADMIN_ALERT_SLACK_WEBHOOK_URL | Ops Slack | production | Coolify export | ESCROW REQUIRED | YES | **ESCROWED** |
| Telegram_bot | Ops Telegram | production | Coolify export | ESCROW REQUIRED | YES | **ESCROWED** |
| RAZORPAY_KEY_ID | Web pay | UNKNOWN | Code **name** only | **NOT FOUND** | If exists | **NOT FOUND** |
| RAZORPAY_KEY_SECRET | Web pay | UNKNOWN | Code **name** only | **NOT FOUND** | If exists | **NOT FOUND** |
| SENTRY_DSN | APM | UNKNOWN | Example **name** only | **NOT FOUND** | If exists | **NOT FOUND** |
| Email / mailbox passwords | support@ / alerts | UNKNOWN | Not located | **NOT FOUND** | If exists | **NOT FOUND** |
| GitHub account password / 2FA | Repo login | founder | Founder device | **NOT REQUIRED** | N/A | **NOT REQUIRED** |

Signing materials (related P0s, not in this pack): Android keystore **ESCROWED** separately as `AMYNEST-ANDROID-ESCROW-2026-10-02-15a19d9e` (SB-H01 CLOSED); iOS certs/profiles **PARTIAL** `AMYNEST-IOS-ESCROW-2026-10-02-beeaa578` (SB-I01 OPEN — PKCS12 passphrase missing).

**Encrypted package:** `AMYNEST-ESCROW-2026-09-25-0cc370f2` — **37** records — decrypt **PASS**.
