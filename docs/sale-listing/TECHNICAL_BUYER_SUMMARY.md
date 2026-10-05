# TECHNICAL BUYER SUMMARY

**Date:** 2 October 2026  
**No secrets, keys, or connection strings.**

Legend: **VERIFIED** · **SELLER-CONFIRMED** · **UNKNOWN** · **BUYER ACTION**

---

## Architecture

**VERIFIED (as operated):**

```
iOS Capacitor ─┐
Android WebView─┼─► www.amynest.in (Cloudflare Pages SPA)
Web browsers ──┘         │
                         ▼
              Cloudflare Worker (amynest-api-proxy)
                         │
                         ▼
              Coolify API origin (Hetzner VPS 188.245.208.126)
                         ├─ PostgreSQL (Coolify hostname tcl9udyxcuq2zu598ebj0pfu)
                         └─ Redis (g7jotufnm43n4au4e8n6x946)
              Hetzner AI worker (SSH from GitHub Actions; historic IP 167.233.39.146 — confirm)
              GCS amynest-audio-storage (audio/media)
              Firebase Auth / FCM as configured
              RevenueCat (Play + App Store apps + webhook)
```

Live check 2 Oct 2026: site 200; `/api/health` 200 `ok: true`.

---

## Repo structure

**VERIFIED** public repo `ankur6779/Amynest-live` (sole admin `ankur6779`, 2 Oct 2026).

| Path | Role |
|------|------|
| `artifacts/kidschedule/` | Web SPA |
| `artifacts/api-server/` | API |
| `android/` | **Shipped** Play WebView |
| `artifacts/amynest-capacitor/` | **Shipped** iOS |
| `lib/` | Shared packages (+ generated OpenAPI clients) |
| `content-engine/` | Content factory code |
| `infra/` | Cloudflare/deploy config |
| `archive/amynest-mobile-expo/` | **Do not ship** |

Root `package.json`: `"license": "MIT"`, `"private": true`, **no LICENSE file**. That is a **title/disclosure** issue, not a stack description.

---

## Deployment / CI/CD

| Fact | Class |
|------|--------|
| GitHub Actions `deploy-production.yml` on `main`: Pages + Worker + path-filtered Hetzner | **VERIFIED** |
| Workflow gated on `github.repository == 'ankur6779/Amynest-live'` | **VERIFIED** |
| Coolify deploys API (not that workflow) | **VERIFIED** as documented; git method **UNKNOWN** (hooks API empty) |
| `main` branch protection | **VERIFIED absent** |

**BUYER ACTION:** after repo transfer, recreate Actions secrets from escrow (not git), edit repository-name gate, reconnect Coolify.

---

## Database / storage / recovery

| Item | Class |
|------|--------|
| Prod Postgres identity | **VERIFIED** (SB-G01 CLOSED) |
| Encrypted dump + scratch restore | **VERIFIED** (SB-G02 CLOSED) — pack offline |
| Redis hostname | **VERIFIED** (in G01 evidence) |
| GCS bucket **name** | **VERIFIED** `amynest-audio-storage` |
| GCS object inventory / IAM | **UNKNOWN** |
| Child-data legal transfer | **UNKNOWN** (counsel) |

**BUYER ACTION:** restore dump on buyer Postgres; new `DATABASE_URL`; new GCS IAM. Do not put dump in git.

---

## Mobile wrappers

| Platform | Class |
|----------|--------|
| Android WebView + native bridges (auth, push, billing) | **VERIFIED** as shipped architecture |
| iOS Capacitor + plugins | **VERIFIED** as shipped architecture |
| Upload keystore escrowed | **VERIFIED** (SB-H01) |
| Play App Signing Google-held key | **VERIFIED enrolled** (distinct from upload key) |
| iOS distribution PKCS12 fully openable | **UNKNOWN** / partial pack; **BUYER ACTION** typically **new certs** after ASC transfer |

---

## Authentication / billing / analytics

| Item | Class |
|------|--------|
| Firebase Auth | **VERIFIED** in code; project title **UNKNOWN** |
| RevenueCat `proj9c1919f0`; Play + ASC apps configured; entitlement `premium`; webhook `https://www.amynest.in/api/subscription/webhook` | **VERIFIED** 2 Oct 2026 |
| RC owner Ankur Raman `ankur6779@gmail.com` sole owner | **VERIFIED** |
| Razorpay | **SELLER-CONFIRMED** unused; code still present |
| GA4 measurement ID in Actions | **UNKNOWN** store (`NOT FOUND` in escrow) |
| Ads campaign ENABLED | **VERIFIED** 2 Oct 2026 |

**BUYER ACTION:** RC Admin invite at closing; rotate keys; after store transfers, refresh Play SA and ASC keys in RC.

---

## External services

Present in production escrow or code (live materiality not all re-proven): OpenAI, Gemini, ElevenLabs, KIE, YouTube OAuth, Resend, Slack webhook, Telegram bot, Hetzner API token. Sentry DSN **NOT FOUND** in escrow. Render historic.

**UNKNOWN:** which of those are still load-bearing vs leftover.  
**BUYER ACTION:** new vendor accounts and keys after close; do not reuse founder keys long-term.

---

## Secrets

| Item | Class |
|------|--------|
| 37 production secret **types** escrowed offline | **VERIFIED** (SB-E01) — **values not listed here** |
| GitHub Actions secret **names** documented | **VERIFIED** names only |
| Rotation | **BUYER ACTION** after control |

---

## Known technical risks (not hidden)

1. Founder-gated deploy (`ankur6779` + Coolify method unknown).  
2. Large product surface; not every module recertified.  
3. MIT metadata vs © footer vs public repo (legal, not runtime).  
4. GCS/media rights and object inventory incomplete.  
5. Ads spend currently large vs USD 5 MRR if campaign stays on.  
6. Dual-license npm hits in SBOM — counsel, not a crash bug.  
7. Worker IP dual-documented until Hetzner screenshot.  
8. Birth Sky public flag true on health payload — extra operational surface.

None of the above is a claim that the site is down (it responded 200 on 2 Oct 2026).
