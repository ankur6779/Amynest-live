# ENVIRONMENT VARIABLES

**Source of names:** `.env.development.example`, `.env.production.example`.  
**Never commit real values. This file lists names only.**

## Critical (API will not stay up without these)

| Name | Role |
|------|------|
| `DATABASE_URL` | Postgres; boot-fatal if missing |
| `REDIS_URL` | BullMQ in production |
| `WORKER_ENABLED` | Must be true in production |
| Firebase `VITE_FIREBASE_*` | Client auth (app loads without them; auth will not) |

## Billing / stores

Names appear across API and native shells: RevenueCat public/secret keys, Razorpay key/secret, Play/App Store shared secrets as configured in Coolify (exact key list is in env examples — copy from those files, do not invent).

## AI / TTS

| Name | Role |
|------|------|
| `OPENAI_API_KEY` | LLM + TTS |
| `GOOGLE_API_KEY` | Gemini / Google APIs |
| `TTS_USE_GCS` | Cache TTS on GCS |
| ElevenLabs | Present in older dev docs; confirm if still required |

## Storage / GCP

GCS credentials and bucket names live only in the secret store. `TTS_USE_GCS=true` in production example.

## Notifications / admin

| Name | Role |
|------|------|
| `NOTIFICATIONS_ENABLED` | Push |
| `ADMIN_ALERT_EMAIL` | Example shows `ankur6779@gmail.com` — **founder mailbox** |
| `ADMIN_ALERT_SLACK_WEBHOOK_URL` | Optional |
| `SENTRY_DSN` / `VITE_SENTRY_DSN` | Optional |

## Feature flags (examples)

`VITE_FF_AMYNEST_LIVING_UNIVERSE`, `VITE_FF_BIRTH_SKY`, `BIRTH_SKY_PUBLIC_ENABLED`, `VITE_FF_CO_PARENT`, `VITE_FF_GUEST_TRY_FIRST`.

## Transfer note

A buyer needs a **complete Coolify + Cloudflare + native env dump** (offline, encrypted). The examples are incomplete for a cold start. See `ACCOUNT_TRANSFER.md`.
