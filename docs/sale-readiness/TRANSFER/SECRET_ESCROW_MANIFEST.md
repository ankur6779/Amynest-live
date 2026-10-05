# SECRET ESCROW MANIFEST

**Date:** 25 September 2026  
**No secret values collected or printed.**  
Escrow statuses: **ESCROWED** · **NOT ESCROWED** · **NOT FOUND** · **NOT REQUIRED** · **UNKNOWN**.  
Pack: `AMYNEST-ESCROW-2026-09-25-0cc370f2` — 37 records — decrypt **PASS**.  
Evidence: `../EVIDENCE/03-ESCROW/SECRET_ESCROW_EVIDENCE.md`.

| Secret / credential type | Purpose | System | Current location | Owner | Escrow required? | Rotate after closing? | Buyer replacement required? | Status |
|--------------------------|---------|--------|------------------|-------|------------------|----------------------|------------------------------|--------|
| Android upload keystore + passwords | Sign AAB | Play | Offline Android escrow pack | Founder | **Yes** (SB-H01) | If Play reset | If lost / policy | **ESCROWED** (`AMYNEST-ANDROID-ESCROW-2026-10-02-15a19d9e`) |
| iOS distribution certs / profiles | Sign IPA | Apple | Offline iOS escrow pack | Founder | **Yes** (SB-I01) | **Yes** after ASC transfer | **Yes** (new certs typical) | **PARTIAL** (`AMYNEST-IOS-ESCROW-2026-10-02-beeaa578`; PKCS12 passphrase missing) |
| APNs key | Push | Apple/Firebase | **UNKNOWN** | Founder | If exists | If transferred | Often **Yes** | **UNKNOWN** |
| DATABASE_URL | Postgres | Coolify export | Offline escrow pack | Founder | **Yes** | **Yes** on new host | **Yes** | **ESCROWED** |
| REDIS_URL | Queue | Coolify export | Offline escrow pack | Founder | **Yes** | **Yes** | **Yes** | **ESCROWED** |
| REDIS_URL_EXTERNAL | Queue (CI name) | GH name only | Not located | Founder | If distinct from REDIS_URL | **Yes** | **Yes** | **NOT FOUND** |
| OPENAI_API_KEY | LLM / TTS | Coolify export | Offline escrow pack | Founder | **Yes** | **Yes** | **Yes** | **ESCROWED** |
| GEMINI_API_KEY | Gemini | Coolify export | Offline escrow pack | Founder | **Yes** | **Yes** | **Yes** | **ESCROWED** |
| GOOGLE_API_KEY / GOOGLE_DRIVE_KEY | Google APIs | Coolify export | Offline escrow pack | Founder | **Yes** | **Yes** | **Yes** | **ESCROWED** |
| GCS service account JSON | Media | Coolify export | Offline escrow pack | Founder | **Yes** | **Yes** | **Yes** | **ESCROWED** |
| DEFAULT_OBJECT_STORAGE_BUCKET_ID | Bucket id | Coolify export | Offline escrow pack | Founder | **Yes** | No | Confirm | **ESCROWED** |
| Firebase Admin JSON | Auth admin | Coolify export | Offline escrow pack | Founder | **Yes** | **Yes** | **Yes** | **ESCROWED** |
| VITE_FIREBASE_* | Client build | Coolify web export | Offline escrow pack | Founder | **Yes** | Rebuild | Recreate | **ESCROWED** |
| VITE_GA4_MEASUREMENT_ID | Analytics | Workflow name | Not located | Founder | If used | Rebuild | Recreate | **NOT FOUND** |
| ELEVENLABS_API_KEY | TTS | Coolify export | Offline escrow pack | Founder | **Yes** | **Yes** | **Yes** | **ESCROWED** |
| KIE_API_KEY / YOUBOT_API_KEY | Content factory | Coolify export | Offline escrow pack | Founder | **Yes** | **Yes** | **Yes** | **ESCROWED** |
| YouTube OAuth (id / secret / refresh) | Upload | Local CI env | Offline escrow pack | Founder | **Yes** | **Yes** | **Yes** | **ESCROWED** |
| RevenueCat webhook / secret / v2 / API / iOS | Billing | Coolify export | Offline escrow pack | Founder | **Yes** | **Yes** | **Yes** | **ESCROWED** |
| BILLING_RECOVERY_SECRET | Billing recovery | Coolify export | Offline escrow pack | Founder | **Yes** | **Yes** | **Yes** | **ESCROWED** |
| RESEND_API_KEY | Email provider | Coolify export | Offline escrow pack | Founder | **Yes** | **Yes** | **Yes** | **ESCROWED** |
| Birth Sky field encryption key | Decrypt fields | Coolify export | Offline escrow pack | Founder | **Yes** | Dangerous if done wrong | Load same key first | **ESCROWED** |
| SESSION_SECRET / INTERNAL_HEALTH_SECRET | API | Coolify export | Offline escrow pack | Founder | **Yes** | **Yes** | **Yes** | **ESCROWED** |
| HCLOUD_TOKEN | Hetzner Cloud API | Coolify export | Offline escrow pack | Founder | **Yes** | **Yes** | **Yes** | **ESCROWED** |
| HETZNER_HOST | Worker host | Local CI env | Offline escrow pack | Founder | **Yes** | UNKNOWN | **Yes** | **ESCROWED** |
| HETZNER_SSH_PRIVATE_KEY | Worker SSH | Local SSH identity | Offline escrow pack | Founder | **Yes** | **Yes** | **Yes** | **ESCROWED** |
| Slack webhook / Telegram bot | Ops | Coolify export | Offline escrow pack | Founder | **Yes** | **Yes** | **Yes** | **ESCROWED** |
| CLOUDFLARE_API_TOKEN | Deploy/DNS | GH secret **name** | Not located locally | Founder | **Yes** if exists | **Yes** | **Yes** | **NOT FOUND** |
| ADMIN_AUTH_TOKEN | Admin/CI | GH secret **name** | Not located locally | Founder | **Yes** if exists | **Yes** | **Yes** | **NOT FOUND** |
| RENDER_API_KEY | Historic | GH secret **name** | Not located locally | Founder | Confirm then revoke | Revoke | No | **NOT FOUND** |
| Razorpay key id / secret | Web pay | Code names | Not located | Founder | If account exists | Retire | Confirm unused | **NOT FOUND** |
| Sentry DSN | Optional ops | Example name | Not located | Founder | If set | **Yes** | **Yes** | **NOT FOUND** |
| Admin / support mailbox passwords | Email | UNKNOWN | Not located | Founder | If mailbox exists | **Yes** | **Yes** | **NOT FOUND** |
| GitHub account password / 2FA | Repo | `ankur6779` | Founder device | Founder | No (transfer repo, don’t sell login) | N/A | Buyer org | **NOT REQUIRED** |

Ceremony performed 25 September 2026. Ciphertext **outside Git**. SHA-256 in evidence file only.
