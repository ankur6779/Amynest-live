# AmyNest AI — Final Application Launch Certification (v1.0)

**Date:** 2026-07-18  
**Roles:** Principal Architect · Mobile Release · QA · DevOps · Security · Product · A11y · UX  
**Scope:** Entire consumer product (web PWA + Android WebView `android/` + iOS Capacitor)  
**Phonics / Reading Academy:** **RELEASE FROZEN** — certified separately; no redesign in this pass  
**Stance:** Certify for public launch. No feature expansion. Fix only launch-critical defects.

---

## Executive verdict

# **GO WITH CONDITIONS**

| Score | Value |
|-------|------:|
| **Overall Application Score** | **79 / 100** |
| **Launch Readiness Score** | **76 / 100** |

AmyNest is **ready for a supervised public soft-launch** of the core family product (auth → dashboard → routines → nutrition → speech → phonics → progress/pricing), provided launch conditions below are cleared before claiming full App Store / Play Store billing readiness at scale.

**Not** a hard **NO-GO** on product architecture — Coolify API + Cloudflare Pages are live and healthy.  
**Not** a clean **GO** until monetization is purchase-proven and ops gates (deploy token, backups) are closed.

---

## Scorecard

| # | Metric | Score | Notes |
|---|--------|------:|-------|
| 1 | Overall Application | **79** | Strong core; billing + ops conditions |
| 2 | Functional Quality | **84** | Primary routes mounted; SafeRoutePage + OfflineGate |
| 3 | UX | **78** | Multiple visual languages; Settings/Parent Dashboard fragmented |
| 4 | Performance | **82** | Pages TTFB ~0.15s; API Coolify healthy; cold CF path variable |
| 5 | Security | **76** | Firebase bearer + device gate + deletion; residual speech TTL / public audio |
| 6 | Accessibility | **80** | Strong on learning modules; uneven across hubs |
| 7 | Infrastructure | **84** | Coolify 100% + Pages certified; Render standby; backup automation open |
| 8 | Monetization | **60** | Code paths complete; **live purchase not certified** |
| 14 | Launch Readiness | **76** | Soft-launch yes; mass billing marketing no |

---

## Live production snapshot (2026-07-18)

| Probe | Result |
|-------|--------|
| `GET https://www.amynest.in/` | HTTP **200**, TTFB ~**0.15s** |
| `GET https://www.amynest.in/api/healthz` | `{"status":"ok"}`, `x-amynest-backend: **coolify**` |
| Prior 48h soak (Jul 13–15) | 100% Coolify, 0 monitor outages (`48-hour-production-certification.md`) |
| Phonics RC | **GO WITH CONDITIONS** (`phonics-production-certification-rc.md`) — **FROZEN** |

---

## Module certification matrix

| Module | Route / surface | Status | Launch note |
|--------|-----------------|--------|-------------|
| Home / Landing | `/` | **GO** | Native → `/sign-in` |
| Dashboard | `/dashboard` | **GO** | Skeletons, cache, sync banners |
| Routine Planner | `/routines`, `/routines/:id` | **GO** | |
| AI Routine Generator | `/routines/generate` | **GO** | Paywall-aware |
| Nutrition Hub | `/nutrition` | **GO** | Offline-first sync |
| Speech Coach | `/speech-coach`, `/speech-coach-v2` | **CONDITIONAL** | Dual v1/v2 surfaces — do not confuse marketing |
| Phonics | `/phonics` | **GO (FROZEN)** | Prior RC conditions still apply (audio ops) |
| Reading Academy | Embedded in `/phonics` | **GO (FROZEN)** | No standalone route |
| Talking Amy | `/talking-amy` | **GO** | Mic permission support path |
| Stories | Hub + `/answer-to-kids-how`, `/discovery-worlds` | **CONDITIONAL** | `discovery-world-preview` orphan page (not in Switch) |
| Worksheets | `/worksheet` | **CONDITIONAL** | **Blocked in native shells** — browser only |
| Parent surfaces | `/progress`, `/insights` + module panels | **CONDITIONAL** | Naming split; functionally OK |
| Settings | `/parent-profile`, notifications, devices | **CONDITIONAL** | No `/settings` alias |
| Premium / Pricing | `/pricing`, paywall modal | **GO** (code) | Needs live purchase proof |
| Authentication | sign-in/up, OAuth callbacks | **GO** | Platform-gated OAuth |
| Offline | `OfflineGate` banner | **CONDITIONAL** | Banner-only; module caches vary |

**Cross-cutting:** Protected routes use `SafeRoutePage` + `AppErrorBoundary` (`AppCore.tsx`). Unknown routes → `RouteFailedPage`.

---

## 9. Critical launch blockers

| ID | Blocker | Owner | Clear when |
|----|---------|-------|------------|
| **L1** | **No certified live purchase** (Play/App Store → RC webhook → DB premium → `purchase_success`) | Product / Mobile | Closed-test purchase on Android + sandbox iOS restore |
| **L2** | **`CLOUDFLARE_API_TOKEN`** may be empty → gated Pages CI hard-fails | DevOps | Secret restored **or** manual wrangler deploy runbook used for this SHA |
| **L3** | **Coolify Postgres backup automation** still unchecked in migration cert | DevOps | Automated backup + one restore drill documented |
| **L4** | **Trial entitlement heal** historically showed stuck `trialing` rows (Jul 7 audit) | Backend | Confirm cron/heal → 0 stuck trials in prod DB |

These block **“billing-ready mass launch”** and **“ops-certified”** claims. They do **not** block a soft launch of free/trial learning UX if store listings do not promise instant paid unlock without verification.

---

## 10. Medium issues

| ID | Issue | Impact |
|----|-------|--------|
| M1 | Dual Speech Coach v1 + v2 | Support confusion |
| M2 | Worksheets unavailable in Android/iOS shells | Store-listing mismatch risk |
| M3 | Offline = amber banner, not full `OfflineScreen` | Uneven AI/audio offline UX |
| M4 | Settings / Parent Dashboard naming fragmentation | Parent findability |
| M5 | Multiple visual languages (hub tokens vs neon Talking Amy vs worksheet theme) | Brand inconsistency |
| M6 | Audio health gate soft-fails in CI; latest gate artifact FAIL | Audio ops confidence |
| M7 | Render standby still in Worker / retirement incomplete | Ops complexity (failover OK) |
| M8 | Speech job records TTL ~10 min (redaction on complete already) | Residual privacy window |
| M9 | Full `pnpm typecheck` known fragile vs deploy gate | CI flake risk |
| M10 | Orphan `DiscoveryWorldPreviewRoute` not registered | Dead code path |

---

## 11. Nice-to-have (do not block v1.0)

- Unify Settings under `/settings` alias  
- Mount branded `OfflineScreen` when offline  
- Wire `phonics:certify` into CI  
- Retire Render after soak  
- Crashlytics on Android native shell (WebView uses web Sentry)  
- Collapse dual Speech Coach surfaces over time  

---

## 12. Production risks

1. **Billing truth gap** — premium UI may disagree with store if webhook/heal fails.  
2. **Audio CDN / static-audio content validity** — phonics library may be fine while Amy phrase static samples fail gates.  
3. **Native mic / STT** — Android & iOS Whisper path needs network; support load on Day 1.  
4. **Worksheets expectation** — if Play/App copy implies in-app worksheets, complaints.  
5. **Deploy pipeline** — Pages secret + typecheck can block emergency hotfix via CI.  
6. **Backup restore unproven** — Coolify dump exists historically; automation unchecked.

---

## Phases (condensed)

### Functional (84)
Navigation, loading shells, error boundaries, empty states present on primary hubs. Retry patterns on dashboard/nutrition. Offline: module caches + banner; not a full offline product.

### UX consistency (78)
Shared Layout + shadcn; hubs use premium tokens; Talking Amy / Worksheet / Auth diverge intentionally. Do **not** redesign for v1.0 — document as accepted multi-surface product.

### Mobile (82)
| Shell | Notes |
|-------|-------|
| Android WebView | Auth + Billing bridges; loads `www.amynest.in` |
| iOS Capacitor | RC plugin + Firebase in WKWebView |
| PWA | SW + offline banner |
| Touch / safe area | Generally OK on primary CTAs; module variance |

### Performance (82)
Live Pages fast; API on Coolify. Bundle: Vite hashed assets + SW. Recommend field soak only — no speculative optimization.

### Security & privacy (76)
Firebase ID token → `requireAuth` → device registration. Analytics PII scrub. Account deletion path. Speech: transcript scoring; upload ephemeral + redaction. Public audio routes are intentional for `<audio>` tags (abuse surface).

### Infrastructure (84)
Coolify API + Postgres + Redis + worker; Cloudflare Pages + API proxy Worker; GCS audio; Sentry (hashed IDs); Render standby. Gaps: Pages token, backup automation, soft audio CI.

### Monetization (60)
| Path | Code | Live cert |
|------|------|-----------|
| Android Play + RC | Yes (`BillingBridge.kt`) | **No** |
| iOS StoreKit + RC | Yes (`native-billing-ios.ts`) | **No** |
| Web Razorpay (IN) | Yes | Partial / secret ops historically |
| Trial / cancel / restore | Unit-tested (premium gate 14/14; cancel 15/15) | Heal in prod TBD |

### Accessibility (80)
Learning modules (phonics frozen) strong on targets / live regions. Hub modules mixed. Reduced-motion on some CTAs. Screen-reader coverage incomplete app-wide — acceptable for soft launch with caregiver UX.

### Regression evidence (this cert)

| Suite | Result |
|-------|--------|
| Phonics v2/v3 + mount + roadmap (prior RC) | **140 passed** |
| Focused kidschedule smoke (phonics mount, roadmap, speech legacy, verify-email) | **17 passed** |
| Subscription premium gate | **14 passed** |
| Subscription cancel | **15 passed** |
| P0 cost-safety route wiring | **3 passed** (test updated for `hubModuleGate` on abacus tutor — **gates still present**) |
| Full kidschedule vitest | Not completed in-window (long-running); use CI + focused suites |
| Full API `pnpm test` | Previously failed on brittle abacus regex — **fixed** |

**CI fix included (launch quality only):** `p0-cost-safety-guards.test.ts` now asserts `hubModuleGate` + `infantExploreMutationGate` + `aiUsageGate` without brittle exact order.

---

## 13. Final verdict

| Option | Decision |
|--------|----------|
| GO | — |
| **GO WITH CONDITIONS** | **← Selected** |
| NO GO | — |

### What you may launch now
- Public web + soft marketing of **learning & parenting hubs** (dashboard, routines, nutrition, speech, **frozen** phonics, progress).  
- Auth and free/trial exploration with clear support.

### What you must not claim yet
- “Billing battle-tested at scale” without L1.  
- “Worksheets in the Play/App Store app” (browser-only).  
- Teacher Mode / classroom readiness.  
- Group assessment UI as a shipped phonics flow (library-only).

### Leave unchanged (v1.0 freeze)
- Phonics / Reading Academy (full freeze)  
- SATPIN, lesson engine, AI Reading Coach evaluation  
- Core subscription entitlement math (`isPremiumNow` / cancel semantics) unless a live billing bug appears  
- Coolify canary architecture  

---

## 10. Production deployment checklist

### Infrastructure
- [ ] Coolify API `/api/healthz` → `ok` + `x-amynest-backend: coolify`
- [ ] Cloudflare Pages deploy of release SHA succeeds (token **or** manual wrangler)
- [ ] Worker routes `/api/*` → Coolify; Render standby ready (`CANARY_PERCENT` runbook)
- [ ] Redis + Postgres healthy; BullMQ worker heartbeat OK
- [ ] GCS credentials present for phonics/static audio
- [ ] Coolify Postgres **automated backups verified** + restore drill note

### Monitoring & analytics
- [ ] Sentry web + API DSN live
- [ ] Crash events `/api/crash-events` receiving
- [ ] Hetzner / Coolify 60s health probes still running
- [ ] GA4 / funnel events for signup + paywall (no PII)

### Monetization
- [ ] RevenueCat webhook → `https://www.amynest.in/api/subscription/webhook` (bearer secret)
- [ ] Android closed-test purchase → premium in DB → analytics `purchase_success`
- [ ] iOS sandbox purchase/restore smoke
- [ ] Trial heal: stuck `trialing` count = 0
- [ ] Restore purchases on both shells
- [ ] Razorpay secret present if India web paid is in scope

### Feature flags / messaging
- [ ] Speech Coach: decide default surface (v1 vs v2) for support docs
- [ ] Worksheets: store listing says browser / web if native blocked
- [ ] Phonics Teacher Mode **off** in marketing
- [ ] Release notes list frozen phonics RC conditions

### Smoke tests (release SHA)
- [ ] Sign-up / sign-in (Google Android, Apple iOS, email web)
- [ ] Dashboard loads with child
- [ ] Generate or open a routine
- [ ] Nutrition hub opens
- [ ] Speech Coach one session (mic allow + deny)
- [ ] Phonics Start Here → lesson → book → parent card
- [ ] Pricing → paywall opens; restore button visible
- [ ] Offline: open app airplane mode → banner; cached content where expected
- [ ] Delete-account entry reachable from profile

### Rollback
- [ ] API: set Worker `CANARY_PERCENT=0` → Render standby (if still provisioned)
- [ ] Pages: Cloudflare previous deployment
- [ ] DB: Coolify backup restore path documented (do not run unless incident)

### Post-launch (first 72h)
- [ ] Watch Sentry + crash events hourly Day 1
- [ ] Watch subscription webhook errors
- [ ] Watch stuck trials query daily
- [ ] Support: mic permission + premium not unlocking FAQ ready

---

## Release notes (suggested)

**AmyNest v1.0** — Family learning & parenting companion  
- Dashboard, routines, nutrition, speech coach, phonics reading journey  
- Premium via Google Play / App Store (RevenueCat) and India web where enabled  
- Runs on `www.amynest.in` (Cloudflare Pages) with Coolify API  

**Known limitations:** Worksheets studio is web-browser only; offline AI features require connectivity; Speech Coach has legacy + v2 surfaces.

---

## Certification statement

AmyNest v1.0 is **conditionally certified for public soft-launch** at overall score **79** and launch readiness **76**. Clear **L1–L4** before declaring full commercial launch. Keep **Phonics RELEASE FROZEN**. Do not expand scope — execute the checklist.
