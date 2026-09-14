# AmyNest Expired-Trial Entitlement Leak — Forensic Audit

**Date:** 2026-09-14  
**Branch:** `cursor/expired-trial-entitlement-leak-6940`  
**Severity:** High (authorization integrity)  
**Scope:** Server entitlement + premium API + premium UI guards  
**Customer-environment writes:** None  

---

## Executive Summary

An expired 3-day trial could keep using **premium-class** surfaces because authorization was **inconsistent and fail-open**, not because RevenueCat products or prices were wrong.

**Root causes**

1. **UNKNOWN entitlement → ALLOW** on premium UI routes, learning-journey timeout, hub-module journey fetch errors, and routine-generation API exceptions.
2. **Hub module API bypass:** journey lock ran only when `childId` was present. Omitting `childId` fell through to a client-tracked tile quota (often 0) and allowed the module.
3. **Weekly-report APIs had no premium check** while `canAccessWeeklyReports` is `isPremium` only.

**Not a leak (documented free floor)**

Expired trial is **not** a full product lock. Free/quota features stay available: dashboard, saved routines, Ask Amy daily quota, games browse, onboarding, profile, and unused hub-tile / nutrition / speech session quotas.

**Business / security impact**

Expired-trial users could reach premium weekly reports and some hub/learning APIs after the UI showed a paywall, and could keep premium screens if entitlement lookup hung or failed. That undercuts conversion and violates the server-as-security-boundary rule.

---

## Entitlement Architecture

### Subscription states

| State | Meaning | Premium? |
| --- | --- | --- |
| Unauthenticated | No identity | DENY all authenticated APIs |
| FREE | Never subscribed / never completed a real internal trial | DENY premium; ALLOW free/quota |
| TRIAL (store / grandfathered) | Time-bound `trialEndsAt` in the future | ALLOW until expiry |
| Internal 3-day trial (`provider=none`, post-2026-07-26) | Capped preview | **DENY premium** (`isPremiumNow=false`); feature caps apply |
| EXPIRED / expired internal trial | Trial ran to scheduled end | DENY premium; ALLOW free/quota |
| ACTIVE paid | `currentPeriodEnd` in the future | ALLOW |
| CANCELLED with remaining period | Paid period still valid | ALLOW until period end |
| GRACE_PERIOD | `gracePeriodExpiresAt` in the future | ALLOW until grace end |
| PAUSED | Billing paused | DENY |
| Paid expired / refunded (EXPIRED) | Period ended | DENY |
| Manual / admin grant | `provider=manual` + future period | ALLOW (legitimate internal) |
| Bonus grant | `bonusExpiresAt` in the future | ALLOW |
| Lookup failure | DB / RC / eval error | **UNKNOWN → DENY premium** |

**Source of truth:** PostgreSQL `subscriptions` via `getOrCreateSubscription()` → `healStaleSubscriptionRecord()` → `isPremiumNow()` / `decidePremiumFromSubscription()`.  
Frontend React Query / localStorage / RevenueCat SDK are **UX only**. Client `isPremium`, `role`, and `entitlement` fields are ignored.

### Decision chain (after this fix)

```
Firebase identity
    → subscriptions row (heal + false-expiry repair)
    → decidePremiumFromSubscription()  → ALLOW | DENY | UNKNOWN
    → Feature policy
         premium-only  → requirePremium / hubModuleGate({ premiumOnly })
         quota         → featureGate / journey / tile quota
         free          → auth + ownership only
    → Frontend decidePremiumRouteAccess()  (UX; never overrides API)
```

UNKNOWN is never treated as ALLOW.

---

## Root Cause Detail

### V1 — Premium UI fail-open (`AppCore` ProtectedRoute)

`if (entitlements && !entitlements[accessKey])` denied only when entitlements existed. Timeout (`useFailOpenAfter`) plus missing entitlements **mounted the premium page**.

### V2 — Learning journey fail-open

On timeout without journey access the gate rendered children (“so Practice/Quiz stay reachable”).

### V3 — Hub module API childId bypass

`assertHubModuleAccess` checked journey only when `childId` was on the request. Direct API calls without `childId` used tile quota. `/feature-usage/track` is client-initiated, so `used` often stayed 0.

### V4 — Routine generate fail-open

`routineGenerateGate` caught errors and called `next()`.

### V5 — Weekly report APIs unguarded

`GET /api/family-intelligence/weekly-report` and `GET /api/child-intelligence/:childId/weekly-report` checked auth/ownership only. `canAccessWeeklyReports` is premium-only.

### V6 — Hub journey fetch error → legacy unlock

`useHubModuleGate` used tile quota when `hubJourney.access` was missing, including query errors.

---

## Vulnerability Matrix

| ID | Module | Route/API | Vulnerability | Severity | Fixed |
| --- | --- | --- | --- | --- | --- |
| V1 | Premium routes | `/nutrition`, `/speech-coach`, `/health-lab` (+ deep links) | UNKNOWN entitlement → ALLOW | High | Yes |
| V2 | Learning | `/phonics`, `/study`, `/abacus`, … | Timeout → ALLOW after journey | High | Yes |
| V3 | Parent Hub APIs | `hubModuleGate` without `childId` | Journey lock skipped | High | Yes |
| V4 | Routines | `POST` routine generate | Gate exception → ALLOW | High | Yes |
| V5 | Insights | `GET` weekly-report APIs | No premium check | High | Yes |
| V6 | Hub UI | `useHubModuleGate` | Journey error → legacy unlock | Medium | Yes |
| V7 | Feature quotas | `featureGate` | Uncaught lookup could be inconsistent | Medium | Yes |

---

## Complete Route Matrix (authorization class)

Legend: **P** = premium-only · **Q** = quota / journey · **F** = free (auth + ownership) · **Pub** = public

| Module | Frontend | Backend | Class | Enforcement |
| --- | --- | --- | --- | --- |
| Auth / onboarding | `/sign-in`, `/onboarding` | `/api/onboarding/*` | F | Auth |
| Dashboard | `/dashboard` | `/api/dashboard/*` | F | Auth |
| Children / profile | `/children`, `/parent-profile` | `/api/children`, `/api/parent-profile` | F | Auth + caps |
| Routines browse | `/routines`, `/routines/:id` | GET routines | F | Auth + ownership |
| Routine generate | `/routines/generate` | POST generate | Q | `routineGenerateGate` fail-closed |
| Ask Amy | `/assistant` | `/api/ai/*` | Q | `featureGate("ai_query")` fail-closed |
| Nutrition hub | `/nutrition` | meals / nutrition | Q | Route + `featureGate` + `canAccessNutritionHub` fail-closed |
| Speech Coach | `/speech-coach` | `/api/speech/*` | Q | Route + session quota |
| Speech V2 | `/speech-coach-v2` | `/api/speech-coach-v2/*` | Q | Server usage policy (0s expired after first-use) |
| Health Lab | `/health-lab` | `/api/health-lab/*` | P | Route + `assertHealthLabPremium` |
| Weekly reports | infant UI / APIs | `/api/*weekly-report*` | P | `requirePremium` / `isPremiumNow` |
| Smart Study / phonics premium actions | `/study`, `/phonics` | hub premiumOnly routes | P | `hubModuleGate({ premiumOnly })` fail-closed |
| Hub modules | `/parenting-hub`, `/life-skills`, … | hub-gated APIs | Q | Journey (per user) then tile quota |
| Games | `/games` | `/api/gaming-rewards` | F | Auth (not `canAccessActivitiesHub`) |
| Downloads (worksheet/color/funsheet) | hub tiles | download routes | Q | `isPremiumNow` raises caps; free quotas remain |
| Birth Sky | `/birth-sky` | `/api/birth-sky/*` | Q | 1 free AI insight then paywall |
| Insights page | `/insights` | `/api/dashboard/insights` | F | Auth (dashboard insights stay free) |
| Pricing / trial ended | `/pricing`, `/subscription-trial-ended` | `/api/subscription` | F | Auth; GET fallback is free-deny |
| Admin | `/admin` | `/api/admin/*` | Role | Admin allowlists (unchanged) |

Deep links use the same Wouter routes as direct URLs. After this fix, premium routes fail closed on refresh, cold start, and timeout.

---

## Changes Made

| File | Why |
| --- | --- |
| `artifacts/api-server/src/services/entitlement-authorization.ts` | Single ALLOW/DENY/UNKNOWN resolver |
| `artifacts/api-server/src/middlewares/requirePremium.ts` | Fail-closed premium API middleware |
| `artifacts/api-server/src/services/hubModuleGateService.ts` | Per-user journey lock; UNKNOWN deny |
| `artifacts/api-server/src/services/parentHubJourneyService.ts` | Read-only journey lookup (no create) |
| `artifacts/api-server/src/middlewares/hubModuleGate.ts` | Resolver + fail-closed catch |
| `artifacts/api-server/src/middlewares/featureGate.ts` | Routine/feature gates fail closed |
| `artifacts/api-server/src/routes/family-intelligence.ts` | Weekly report requires premium |
| `artifacts/api-server/src/routes/child-intelligence.ts` | Weekly report requires premium |
| `artifacts/kidschedule/src/lib/premium-access-decision.ts` | Frontend ALLOW/DENY/UNKNOWN |
| `artifacts/kidschedule/src/AppCore.tsx` | Premium routes fail closed |
| `artifacts/kidschedule/src/components/learning-journey-gate.tsx` | Timeout/error fail closed |
| `artifacts/kidschedule/src/hooks/use-hub-journey.ts` | Expose `isError` |
| `artifacts/kidschedule/src/hooks/use-hub-module-gate.ts` | Journey error → lock |
| Tests + this report | Regression + certification |

**Not changed:** Google Play / RevenueCat products, prices, ads, Firebase event names, signing, customer subscription rows.

---

## Tests Added

- `entitlement-authorization.test.ts` — states, exact expiry, UNKNOWN ≠ ALLOW, client-shaped isPremium ignored
- `expired-trial-entitlement-leak.test.ts` — source contract: no fail-open, weekly-report gated, no client premium params
- `premium-access-decision.test.ts` — UI decision matrix
- `expired-trial-entitlement-leak.test.ts` (web) — AppCore / learning / hub fail-closed
- Updated `child-intelligence.test.ts` — free user weekly-report → 403
- Updated `data-integrity-p0.test.ts` and Phase 4 Health Lab freeze for the new deny path

---

## Live-account Verification

This environment has **no credentials** for the expired-trial test account and **must not** write live billing/auth. Live account forensics (Firebase UID, RC customer info, live `subscriptions` row) are **not executed here**.

Authoritative resolver behavior for an expired trial is certified by unit tests: `status=trialing` + past `trialEndsAt` → DENY; `subscriptionState=EXPIRED` → DENY; exact `trialEndsAt === now` → DENY.

---

## Free vs premium matrix (intended)

| Feature | Free | Expired trial | Paid |
| --- | --- | --- | --- |
| Dashboard, profile, children (1) | ALLOW | ALLOW | ALLOW |
| Saved routines | ALLOW | ALLOW | ALLOW |
| Ask Amy (daily quota) | ALLOW until quota | ALLOW until quota | ALLOW |
| Games browse/play | ALLOW | ALLOW | ALLOW |
| Nutrition / speech unused quota | ALLOW | ALLOW | ALLOW |
| Health Lab | DENY | DENY | ALLOW |
| Weekly report APIs | DENY | DENY | ALLOW |
| Premium hub actions (smart study, phonics load-more, …) | DENY | DENY | ALLOW |
| UNKNOWN entitlement | DENY premium | DENY premium | n/a |

---

## Remaining Risks

1. **Live expired account** was not signed in here (no secrets). Confirm G1 against live `subscriptions` + RevenueCat after deploy.
2. Offline cached lesson audio / previously downloaded files can still play on-device; new signed downloads stay server-gated.
3. `/insights` dashboard charts remain free; only dedicated weekly-report APIs are premium.
4. Hub journey 7-day calendar is still independent of the 3-day subscription trial (documented free floor). After the journey locks, APIs now stay locked even without `childId`.
5. Admin / `ADMIN_PREMIUM_*` / hardcoded reviewer emails still grant premium (legitimate, not this leak).

---

## Certification Gates

| Gate | Result | Notes |
| --- | --- | --- |
| G1 Expired trial identified | CONDITIONAL | Resolver + tests PASS; live account not queried |
| G2 Premium UI protected | PASS | Fail-closed route decision |
| G3 Premium API protected | PASS | Weekly reports + premiumOnly hub + feature gates |
| G4 Resource authorization | PASS | Weekly reports 403; hub journey per user |
| G5 Deep links | PASS | Same Wouter guards as direct URL |
| G6 Cache/session | PASS | Cached subscription stripped of premium; timeout → DENY |
| G7 Error paths fail closed | PASS | UNKNOWN → DENY |
| G8 Free features preserved | PASS | Free/quota classes unchanged |
| G9 Regression tests | PASS | See tests listed |
| G10 Full module audit | PASS | Inventory above; free modules evaluated as ALLOW-by-design |

**Overall: CONDITIONAL PASS** — code/security boundary PASS; live expired-account retest still required in a signed-in environment.
