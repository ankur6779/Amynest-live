# AmyNest AI — Acquisition Data Room Checklist

**Audit date:** 14 September 2026
**Purpose:** Items a buyer’s counsel, financial DD, and technical DD will request.
**Status key:** READY · PARTIAL · MISSING · NOT APPLICABLE

“READY” means the artifact exists in a form a buyer could inspect **from this repository or a connected live system queried on this date**. It does **not** mean the artifact is legally sufficient to close.

---

## 1. Corporate / legal ownership

| Item | Status | Evidence / gap |
|------|--------|----------------|
| Legal entity name | PARTIAL | Product copy: “AmyWorld” (`artifacts/kidschedule/src/lib/marketing/legal-entity.ts`). App Store seller: “Amyworld”. Casing/entity identity not reconciled. |
| Certificate of incorporation / CIN / EIN | MISSING | Not in repository. |
| Cap table / share register | MISSING | Not in repository. |
| Directors / officers | MISSING | Inventor named in patent draft: Ankur Raman. Not a corporate record. |
| Founder employment / IP assignment | MISSING | Not in repository. |
| Contractor / freelancer IP assignment | MISSING | Not in repository. High risk given large AI-assisted codebase. |
| Related-party agreements (AmyWorld vs AmyNest) | MISSING | Brand vs operator split is copy-only. |

## 2. IP ownership

| Item | Status | Evidence / gap |
|------|--------|----------------|
| Source code in seller-controlled git | READY | Repo `AmyNest-AI`; 2,818 commits from 2026-04-08 to 2026-09-13. |
| Root LICENSE file | MISSING | `package.json` declares `"license": "MIT"`; no `LICENSE` file found. |
| Third-party OSS license inventory (SBOM) | MISSING | No generated SBOM in repo. No GPL/AGPL hits in a targeted search; not a substitute for a license audit. |
| Trademark filings (AmyNest, AmyWorld) | MISSING | Not in repository. |
| Patent | PARTIAL | `patent/amynest_patent_package.html` is an Indian **provisional draft**. Filing date field is placeholder: “[Date of Filing of this Provisional]”. **Application number NOT VERIFIED.** App Store listing nevertheless claims “patent-pending.” |
| Content / curriculum / audio provenance | PARTIAL | Phonics provenance tooling exists (`check-phonics-provenance`); commercial licenses for voices, research-framework citations, and generated media not packaged for a buyer. |
| Brand assets | READY | `content-engine/brand/`, `artifacts/kidschedule/public/logo.svg`, Android mipmaps, store badges. |

## 3. Source code and git

| Item | Status | Evidence / gap |
|------|--------|----------------|
| Full git history | READY | Local git; confirm GitHub/remote access for buyer. |
| Monorepo map | READY | `artifacts/kidschedule/` web; `artifacts/api-server/` API; `android/` Play shell; `artifacts/amynest-capacitor/` iOS; `lib/` 88 packages; `content-engine/`; `archive/` Expo (do not ship as product). |
| Secrets scanning report | MISSING | Buyer will run one. Public Firebase web config is bundled (expected). Play RC public SDK key appears in ops docs. |
| Archived / duplicate trees documented | PARTIAL | Workspace rule states Capacitor Android is not the Play app; `artifacts/kidschedule-android/` deprecated; Expo archived. Needs a one-page “what not to deploy” note. |

## 4. Infrastructure and deployment

| Item | Status | Evidence / gap |
|------|--------|----------------|
| Production topology doc | PARTIAL | Coolify API + Postgres + Redis; Hetzner AI worker; Cloudflare Pages + API proxy Worker; GCS audio; Render retired (`.github/workflows/deploy-production.yml`, `infra/cloudflare/`, env examples). |
| Live runbook with credentials owner map | MISSING | Env **names** in `.env.*.example`. Live secret store access not in repo. |
| CI/CD | READY | GitHub Actions: production deploy, worker, crash/audio/chat/routine gates. |
| Dockerfiles | READY | `docker/backend`, `docker/worker`, `docker/frontend`. |
| OTA (iOS) | READY | `@capgo/capacitor-updater`; `artifacts/api-server/ota/`. |
| Monitoring (Sentry) | PARTIAL | SDKs present; production error volume **NOT VERIFIED FROM CODEBASE**. |
| Firebase Crashlytics | MISSING | Documented as a gap, not integrated. |
| Domain registrar + DNS access | PARTIAL | Domain `amynest.in` / `www.amynest.in` used in config. Registrar login not in repo. |
| SSL / Cloudflare account | PARTIAL | Worker + Pages in `infra/cloudflare/`. Account ownership not proven in repo. |

## 5. Domains

| Item | Status | Evidence / gap |
|------|--------|----------------|
| amynest.in + www | PARTIAL | Used as production origin. WHOIS / registrar **NOT VERIFIED FROM CODEBASE**. |
| Email (support@amynest.in) | PARTIAL | Referenced in product/legal copy. Mailbox ownership not proven. |
| Universal links / App Links | READY | iOS entitlements `applinks:amynest.in`; Android `assetlinks.json` referenced in `android/README.md`. |

## 6. App Store (Apple)

| Item | Status | Evidence / gap |
|------|--------|----------------|
| App listing | READY | https://apps.apple.com/us/app/amynest-ai-smart-parenting/id6767664343 |
| Bundle ID | READY | `com.amynest.app` |
| Seller | PARTIAL | “Amyworld” — account transfer requires Apple developer enrollment in buyer’s entity. |
| IAP products | READY | Monthly $4.99; 6-month $24.99; yearly $39.99 (US listing, 14 Sep 2026). |
| Ratings / units / proceeds | PARTIAL | Ratings: not enough to display. Units and proceeds **NOT VERIFIED FROM CODEBASE** (no App Store Connect export in repo). |
| Privacy Nutrition Label | READY | Listing discloses purchases, location, contact info, user content, identifiers. |
| Transfer checklist (App Store Connect) | MISSING | Not prepared. |

## 7. Google Play

| Item | Status | Evidence / gap |
|------|--------|----------------|
| Package name | READY | `com.amynest.app` |
| Listing URL | READY | https://play.google.com/store/apps/details?id=com.amynest.app |
| Native app source | READY | `android/` WebView wrapper (not Capacitor Android). |
| Play Billing products | READY | `amynest_monthly`, `amynest_6month`, `amynest_yearly` mapped in RC + docs. |
| Install / ANR / review metrics | MISSING | Play Console export not in repo. Public page fetch failed (HTTP 409) on 14 Sep 2026. |
| Play Console account transfer | MISSING | Not documented. |

## 8. RevenueCat

| Item | Status | Evidence / gap |
|------|--------|----------------|
| Project | READY | `proj9c1919f0` “AmyNest AI” (created 2026-04-19). Empty second project `proj04992681` exists. |
| Apps | READY | Play `app7b7fc89f20`; App Store `appa31011b39a`; Test Store `app5c5ca2ad1a`. |
| Entitlement | READY | `premium` (`entld84a0126e2`). |
| Offering | READY | `default` with `$rc_monthly`, `$rc_six_month`, `$rc_annual`. |
| Live metrics access | READY | Queried 14 Sep 2026: 3 actives, $5 MRR, $26.14 lifetime gross. |
| Webhook | PARTIAL | Code + docs: `https://www.amynest.in/api/subscription/webhook`. Buyer must confirm dashboard destination. |
| Transfer / API keys | MISSING | Secret keys not (and should not be) in git. Rotation plan needed. |

## 9. Razorpay (India web)

| Item | Status | Evidence / gap |
|------|--------|----------------|
| Integration in code | READY | Create/verify/webhook routes; INR prices ₹199 / ₹999 / ₹1499. |
| Live settlement reports | MISSING | **NOT VERIFIED FROM CODEBASE.** No Razorpay API was queried. |
| Blocked in store shells | READY | Native Android/iOS block Razorpay when billing bridges present (Play/Apple policy). |

## 10. Firebase

| Item | Status | Evidence / gap |
|------|--------|----------------|
| Auth | READY | Client + Admin SDK; email/password, Google, Apple, Facebook. |
| FCM | READY | Server dispatch + native bridges. |
| Analytics | PARTIAL | Used for subscription attribution events; product SSOT is Postgres (`analytics-growth-report.md`). |
| Firestore | NOT APPLICABLE | Postgres is system of record. |
| Hosting | NOT APPLICABLE | Production web is Cloudflare Pages. |
| Crashlytics | MISSING | Not integrated. |
| Service account / project ownership transfer | MISSING | Project IDs in client defaults; IAM transfer not documented. |

## 11. Analytics (first-party)

| Item | Status | Evidence / gap |
|------|--------|----------------|
| Event taxonomy | READY | `@workspace/analytics-taxonomy`; `analytics_events` table. |
| Admin Growth OS | READY | `/admin/growth/*` + `/api/admin/growth/*`. |
| Historical snapshot | READY | `analytics-growth-report.md` (13 Jul 2026); `docs/product-growth/*`. |
| Current dashboard export for DD | MISSING | Buyer needs a dated export of DAU/MAU/retention/revenue from production Postgres. July numbers are stale. |
| GA4 | PARTIAL | Marketing pages only (`VITE_GA4_MEASUREMENT_ID`). No GA4 Data API numbers in this audit. |

## 12. Advertising

| Item | Status | Evidence / gap |
|------|--------|----------------|
| Google Ads account | READY | Customer `6395859996` “Amynest AI”, currency INR, campaign `23986249354` ENABLED. Last 90d spend ₹18,929; last 30d ₹31.54. |
| Meta AMYNESTAI | READY | `act_4168770199922660`, ACTIVE, lifetime spend ₹12,711.85; 718 `mobile_app_install` (insights 28 Jun–14 Sep 2026). |
| Meta Amy World AD | READY | `act_1882592585790848`, lifetime spend ₹4,915.26; 7 pixel `purchase` events totaling ₹473 — **do not treat as RC revenue**. |
| Attribution quality | PARTIAL | July 2026 Postgres audit: 0 Google/Meta attributed installs in-product despite UA. Pixel/Google conversions do not match paid subs. |
| Creative / brand usage rights | MISSING | Ad creatives and likeness rights not packaged. |

## 13. Financial statements

| Item | Status | Evidence / gap |
|------|--------|----------------|
| P&L / balance sheet / tax returns | MISSING | Not in repository. |
| Bank statements | MISSING | Not in repository. |
| COGS ledger (OpenAI, ElevenLabs, GCP, Coolify, Hetzner, Cloudflare, Apple/Play fees) | MISSING | Env vars prove vendors exist; amounts **NOT VERIFIED FROM CODEBASE**. |
| RevenueCat revenue | READY | Lifetime gross $26.14; proceeds $16.83 (19 Apr–14 Sep 2026). |
| Store proceeds (App Store Connect / Play) | MISSING | Should reconcile to RC; not exported. |
| Ad spend | PARTIAL | Google 90d + Meta lifetime as above. Incomplete vs credit-card/GST invoices. |

## 14. Subscription revenue and users

| Item | Status | Evidence / gap |
|------|--------|----------------|
| Live paid subscribers (RC) | READY | 3 active; 0 trials (14 Sep 2026). |
| Lifetime RC transactions | READY | 6. |
| Convert-to-pay | READY | 1 paying customer in 7-day window across 2,728 new RC customers. |
| Postgres `subscriptions` table export | MISSING | July snapshot: 2 RC ACTIVE, 261 FREE, 8 TRIAL, 33 EXPIRED (`analytics-growth-report.md`). Current table not exported. |
| Churn / LTV / ARPU | MISSING as current | July estimated ARPU ₹162 from 2 users — too small to be meaningful. |
| Refunds | PARTIAL | Webhook handles `REFUND`; refund rate chart not pulled; volume likely negligible. |

## 15. User metrics and retention

| Item | Status | Evidence / gap |
|------|--------|----------------|
| Current DAU/MAU from product DB | MISSING | RC 28-day actives = 283 (SDK definition, not product DAU). |
| July 2026 funnel snapshot | READY | `analytics-growth-report.md`. |
| Retention cohorts (current) | MISSING | July D1 5.2%, D7 2.4% are stale. |
| Customer support volume | MISSING | No Zendesk/Intercom export in repo. In-app `/support`, `support@amynest.in`. |

## 16. Privacy, terms, compliance

| Item | Status | Evidence / gap |
|------|--------|----------------|
| Privacy policy | PARTIAL | Live URL https://www.amynest.in/privacy (page in app). Legal review of COPPA/DPDP/GDPR adequacy **MISSING**. |
| Terms of service | PARTIAL | https://amynest.in/terms |
| Account deletion | READY | `/delete-account` + deletion service tests. |
| Child data handling policy | PARTIAL | Parent-gated product; `@workspace/safety` age-band rules. No dedicated COPPA program found. |
| DPA / subprocessors list | MISSING | OpenAI, ElevenLabs, Firebase, GCS, RevenueCat, Razorpay, Cloudflare, Sentry implied. |
| Security.txt | READY | Points at privacy URL. |
| Penetration test / security audit | MISSING | |
| Data processing locations | MISSING | Coolify/Hetzner/GCS regions not confirmed in this audit. |

## 17. Third-party licenses and AI providers

| Item | Status | Evidence / gap |
|------|--------|----------------|
| OpenAI agreement | MISSING | Key via env; models in `openai-model-catalog.ts` (`gpt-5`, `gpt-5-mini`, `gpt-4o-mini`, `gpt-realtime`, `gpt-4o-mini-tts`). |
| ElevenLabs agreement | MISSING | Phonics + TTS + Scribe. |
| Google AI / Gemini / Veo / Imagen | MISSING | content-engine. |
| KIE.ai / you.bot | PARTIAL | Benchmark/optional; may be unused in prod. |
| RevenueCat contract | MISSING | Project live. |
| Razorpay contract | MISSING | |
| Firebase / GCP | MISSING | |
| Resend (email) | PARTIAL | Optional per deps. |
| Capgo OTA | PARTIAL | Dependency present. |
| Ephemeris / JPL data license | PARTIAL | `artifacts/ephemeris-daemon/` — redistribution terms must be checked. |

## 18. Security documentation

| Item | Status | Evidence / gap |
|------|--------|----------------|
| Auth model write-up | PARTIAL | Code: Firebase ID token + device registration + admin allowlists. No buyer-facing security whitepaper. |
| Secret rotation | PARTIAL | `docs/gcp-credential-rotation.md` exists. Broad inventory missing. |
| Rate limiting | READY | Redis distributed limiter in API. |
| Encryption | PARTIAL | Birth Sky field encryption env; not a full data-classification policy. |
| Hardcoded secrets review | PARTIAL | No private API keys found in a targeted TS search; public Firebase key and RC public key in docs. Buyer will still scan. |

## 19. Deployment documentation

| Item | Status | Evidence / gap |
|------|--------|----------------|
| Dev environment | READY | `docs/dev-environment.md`, `AGENTS.md`. |
| Production deploy workflow | PARTIAL | GitHub Actions + Coolify/Hetzner. Host access instructions incomplete for a non-founder. |
| Commercial launch runbooks | PARTIAL | `docs/ops/commercial-launch-*`. |
| Single-active scheduler / plane | READY | `SCHEDULER_ACTIVE_PLANE=coolify` in prod example. |

## 20. People and operations

| Item | Status | Evidence / gap |
|------|--------|----------------|
| Org chart | MISSING | Appears founder-operated (Ankur Raman named in ads login + patent draft). |
| Customer support process | MISSING | |
| On-call / incident history | MISSING | Crash intelligence exists in product; history not exported. |
| Key-person risk memo | MISSING | **Should be written before listing.** |

## 21. Buyer demo environment

| Item | Status | Evidence / gap |
|------|--------|----------------|
| Seeded demo account | PARTIAL | `demo@amynest.in` referenced as unlimited/QA. Credentials must not be production-admin. |
| Recorded product walkthrough | MISSING | Store screenshots exist; no DD demo video in repo. |
| Architecture one-pager for buyers | MISSING until this audit’s presentation is used. |

---

## Close-readiness score (data room only)

| Category | Ready | Partial | Missing |
|----------|-------|---------|---------|
| Legal / IP / corporate | 1 | 4 | 8+ |
| Product / code / stores / RC | High | Some | Play metrics, Razorpay ledger |
| Financials | RC live metrics only | Ad spend APIs | P&L, tax, COGS, bank |
| Transferability | Low | Infra described | Access map, account transfers |

**A buyer can diligence the product. A buyer cannot currently diligence the company.** That fact alone caps financial-buyer price and delays close until corporate/IP/financial folders exist.
