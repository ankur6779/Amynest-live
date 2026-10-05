# AmyNest — buyer / operator handover index

**Date:** 24 September 2026  
**Purpose:** Current-system orientation. Not a listing. Not a valuation.  
**Secrets:** never paste keys here.

This folder is the operator handbook. Sale-readiness scores and hard caps live in `docs/sale-readiness/`.

| Doc | What it covers |
|-----|----------------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Runtime topology |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Coolify / Cloudflare / workers |
| [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md) | Env names only |
| [DATABASE.md](./DATABASE.md) | Postgres / Drizzle |
| [BILLING.md](./BILLING.md) | RevenueCat / stores / Razorpay |
| [ANALYTICS.md](./ANALYTICS.md) | Funnel + SSOT |
| [AI_PROVIDERS.md](./AI_PROVIDERS.md) | LLM / TTS |
| [STORAGE.md](./STORAGE.md) | GCS |
| [APP_STORE_RELEASE.md](./APP_STORE_RELEASE.md) | Shared store rules |
| [GOOGLE_PLAY_RELEASE.md](./GOOGLE_PLAY_RELEASE.md) | Android WebView |
| [IOS_RELEASE.md](./IOS_RELEASE.md) | Capacitor |
| [INCIDENT_RESPONSE.md](./INCIDENT_RESPONSE.md) | Alerts |
| [BACKUP_RESTORE.md](./BACKUP_RESTORE.md) | DB / media |
| [ACCOUNT_TRANSFER.md](./ACCOUNT_TRANSFER.md) | Credential map (blank) |
| [KNOWN_ISSUES.md](./KNOWN_ISSUES.md) | Honest defects |
| [ROADMAP.md](./ROADMAP.md) | Not a commitment |
| [BUYER_HANDOVER.md](./BUYER_HANDOVER.md) | Close checklist |
| [LICENSE_DECISION.md](./LICENSE_DECISION.md) | Why no LICENSE file was added |

## What a buyer receives (if transferred)

- This git monorepo (web: `artifacts/kidschedule/`, API: `artifacts/api-server/`, Android: `android/`, iOS: `artifacts/amynest-capacitor/`)
- Live domain historically `https://www.amynest.in` (title UNVERIFIED)
- Play package `com.amynest.app`; App Store ID `6767664343`
- RevenueCat project `proj9c1919f0` (if invited)
- Indian Patent **Application** 202611059355 **only if assigned** — **not granted**

## What a buyer does **not** automatically receive

Legal title, AmyWorld incorporation, cash in Ankur’s accounts, granted patent exclusivity, or the ability to operate without transferred logins.

## Local start (dev)

See `AGENTS.md` and `docs/dev-environment.md`. Minimum: local Postgres + `DATABASE_URL` in `.env.development`. Note: `docs/dev-environment.md` still mentions Render as PROD; **current production plane is Coolify + Cloudflare** per `.env.production.example`. Treat the Render section as **stale**.
