# SERVICE USAGE CONFIRMATION

**Date:** 24 September 2026  
**Do not delete accounts, keys, or webhooks.**  
Companion: `EXTERNAL_SERVICE_HANDOVER.md`.

Allowed live-use labels: **FOUND IN CODE** · **LIVE USE VERIFIED** · **LIVE USE UNKNOWN** · **NOT FOUND**.

| Service | Code / config | Live production | If account confirmation needed |
|---------|---------------|-----------------|--------------------------------|
| Sentry | **FOUND IN CODE** (DSN env names; empty example) | **LIVE USE UNKNOWN** | **OWNER ACTION REQUIRED** |
| Slack | **FOUND IN CODE** (`ADMIN_ALERT_SLACK_WEBHOOK_URL`) | **LIVE USE UNKNOWN** | **OWNER ACTION REQUIRED** |
| KIE | **FOUND IN CODE** (`KIE_API_KEY` secret **name**) | **LIVE USE UNKNOWN** | **OWNER ACTION REQUIRED** |
| YouTube | **FOUND IN CODE** (`YOUTUBE_*` secret **names**) | **LIVE USE UNKNOWN** | **OWNER ACTION REQUIRED** |
| ElevenLabs | **FOUND IN CODE** (optional TTS) | **LIVE USE UNKNOWN** | **OWNER ACTION REQUIRED** |
| OpenAI | **FOUND IN CODE** | **LIVE USE UNKNOWN** (required if AI/TTS stay on) | **OWNER ACTION REQUIRED** |
| Gemini | **FOUND IN CODE** | **LIVE USE UNKNOWN** | **OWNER ACTION REQUIRED** |
| Firebase / FCM | **FOUND IN CODE** | **LIVE USE UNKNOWN** (INFERRED in use; not re-proven this pass) | **OWNER ACTION REQUIRED** |
| GCS | **FOUND IN CODE** | **LIVE USE UNKNOWN** (INFERRED via `TTS_USE_GCS`) | **OWNER ACTION REQUIRED** |
| Cloudflare | **FOUND IN CODE** | **LIVE USE UNKNOWN** (INFERRED edge) | **OWNER ACTION REQUIRED** |
| RevenueCat | **FOUND IN CODE** | **LIVE USE UNKNOWN** (prior cash query is not this pass) | **OWNER ACTION REQUIRED** |
| Google Ads | **FOUND IN CODE** + prior account query | Campaign historically live — **do not change** | **OWNER ACTION REQUIRED** (keep/pause decision only) |
| Render | **FOUND IN CODE** leftover `RENDER_API_KEY` name | **LIVE USE UNKNOWN** (historic suspend 20 Jul 2026) | **OWNER ACTION REQUIRED** (confirm unused; do not revoke this pass) |
| Razorpay | **FOUND IN CODE** | Seller-stated unused — **not** LIVE USE VERIFIED | **OWNER ACTION REQUIRED** (optional export) |
| Telegram | **FOUND IN CODE** (optional / commented) | **LIVE USE UNKNOWN** | **OWNER ACTION REQUIRED** |
| Open-Meteo | **FOUND IN CODE** | Client weather — no account | No owner account action |
| Twilio / SMS | **NOT FOUND** in env examples | **LIVE USE UNKNOWN** if only in Coolify | **OWNER ACTION REQUIRED** if Coolify shows a key |
| Billed Google Maps | **NOT FOUND** this pass | — | None |

Owner confirms live vs unused **offline**. Nothing is deleted in this pass.
