# ARCHITECTURE

**Current as of 24 September 2026 (code + env examples). Live topology not re-probed.**

```
Parents (web / iOS Capacitor / Android WebView)
        │
        ▼
Cloudflare (www.amynest.in + API proxy Worker)
        │
        ├─ static SPA (kidschedule build)
        └─ /api/* → Coolify Express 5 (`artifacts/api-server`)
                    ├─ Postgres (Drizzle)
                    ├─ Redis / BullMQ
                    ├─ Hetzner AI worker (production required)
                    ├─ Firebase Admin (auth verify)
                    ├─ RevenueCat webhooks
                    ├─ Razorpay (India web)
                    ├─ OpenAI / Gemini / TTS
                    └─ GCS (audio cache)
```

## Clients

| Surface | Path | Role |
|---------|------|------|
| Web SPA | `artifacts/kidschedule/` | Product UI |
| iOS | `artifacts/amynest-capacitor/ios/` | Capacitor shell + RC + Apple Sign-In |
| Android (shipped) | `android/` | WebView of `https://www.amynest.in` + Auth/Push/Billing bridges |
| Capacitor Android tree | `artifacts/amynest-capacitor/android/` | **Not** the Play Store app |
| Archived Expo | `archive/amynest-mobile-expo/` | Read-only |

## Shared libraries

`lib/` — ~88 packages (subscription, analytics, routines, phonics, etc.). OpenAPI spec in `lib/api-spec/`; generated clients in `lib/api-client-react/` and `lib/api-zod/`.

## Auth

Firebase Authentication (email, Google, Apple, Facebook). Native Android Google via `AuthBridge`. iOS Apple Sign-In plugin.

## Billing

Single entitlement `premium`. Stores via RevenueCat. India web via Razorpay. See `BILLING.md`.

## Content / AI

Routines and coaching go through the API + worker. TTS: OpenAI, optionally cached on GCS. Content-engine (`content-engine/`) is a YouTube / generation pipeline — **operator optional**, not required for core parenting app.

## Known architectural debt (buyer inherits)

- Dual Android stories (shipped WebView vs unused Capacitor Android)
- Large unused / flag-gated surface (Birth Sky, olympiad, content-engine)
- Federation / typecheck gaps (`AGENTS.md`)
- Stale Render references in older docs
