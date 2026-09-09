# AMYNEST — CONVERSION REMEDIATION REPORT

**Date:** 2026-09-09  
**Branch:** `cursor/parent-conversion-p0-remediation-2ad0`  
**Base:** `cursor/parent-conversion-ads-readiness-2ad0` (audit `8b3fe75d`)  
**Status:** P0 product + measurement remediation implemented. **Not ads-ready.** Zero live subscriptions remain. Next gate is a 200-install controlled cohort.

Head SHA at report time is recorded in git after this file is committed. Implementation SHAs:

- `7705469e307bdbf19bd4a7bf3720953406b24530` — first-value funnel
- `746267454e39dc3825bdc9c81d6196e7c582bbe9` — outcome paywall, limits, terms

---

## 1. Files changed

### First value / day 0
- `artifacts/kidschedule/src/lib/product-promise.ts`
- `artifacts/kidschedule/src/lib/first-experience/decide-next.ts`
- `artifacts/kidschedule/src/lib/first-experience/types.ts`
- `artifacts/kidschedule/src/lib/first-experience/storage.ts`
- `artifacts/kidschedule/src/lib/first-plan-activation.ts`
- `artifacts/kidschedule/src/lib/day0-discovery.ts`
- `artifacts/kidschedule/src/lib/child-discovery/beats.ts`
- `artifacts/kidschedule/src/lib/child-discovery/nrt-preview.ts`
- `artifacts/kidschedule/src/pages/first-experience.tsx`
- `artifacts/kidschedule/src/pages/child-discovery-film.tsx`
- `artifacts/kidschedule/src/pages/onboarding.tsx`
- `artifacts/kidschedule/src/pages/dashboard.tsx`
- `artifacts/kidschedule/src/pages/landing.tsx`
- `artifacts/kidschedule/src/lib/nav-living-ia.ts`
- `artifacts/kidschedule/src/components/mobile-tab-bar.tsx`
- `play-store-metadata.md`

### Monetization
- `lib/subscription-marketing/src/index.ts`
- `artifacts/kidschedule/src/components/paywall-modal.tsx`
- `artifacts/kidschedule/src/lib/activation-gate.ts`
- `artifacts/kidschedule/src/lib/subscription-paywall-personalization.ts`
- `artifacts/kidschedule/src/lib/subscription-feature-flags.ts`
- `artifacts/kidschedule/src/lib/subscription-defaults.ts`
- `artifacts/api-server/src/services/subscriptionService.ts` (`FREE_LIMITS.routinesMax = 3`)
- `artifacts/kidschedule/src/pages/terms.tsx`
- `artifacts/kidschedule/src/pages/billing-dispute.tsx`

### Measurement
- `lib/analytics-taxonomy/src/conversion-funnel-events.ts`
- `artifacts/kidschedule/src/lib/conversion-funnel.ts`
- `artifacts/kidschedule/src/lib/analytics/analytics-service.ts`
- `artifacts/kidschedule/src/lib/install-attribution.ts`
- `artifacts/kidschedule/src/lib/subscription-analytics.ts`
- `artifacts/api-server/src/services/growth-observatory/funnel-intelligence.ts`

Full list: `git diff --name-only 8b3fe75d..HEAD`.

---

## 2. Commits

| SHA | Message |
|-----|---------|
| `7705469e307bdbf19bd4a7bf3720953406b24530` | feat(conversion): land parents on today's plan after first open |
| `746267454e39dc3825bdc9c81d6196e7c582bbe9` | feat(conversion): sell outcomes after first value, not a feature catalog |
| *(this report)* | docs: conversion remediation report |

---

## 3. Product-flow changes

One job: **give a parent their child's next right thing today.**

- First screen / Discovery / landing / store copy lead with today's plan, not Hub, Rooms, Games, Birth Sky, Health Lab, or a generic AI coach.
- Guest First Experience asks name, age, and kind of day, then **automatically** builds a 4–6 block plan from existing surfaces (routine, activity, connection, Amy).
- Authenticated onboarding / Discovery Film finish **auto-generates** today's routine and lands on `/routines/:id?reveal=1`. Dashboard safety-net retries if the parent arrives empty.
- Account is required to keep/sync tomorrow, not to see today's plan.
- `FF_POST_ONBOARDING_TRIAL` default is **false**. Onboarding does not route to `/subscription-trial`.
- Hub / Rooms / Games / Birth Sky / Health Lab stay in the product but are hidden from day-0 nav until first plan progress.
- Soft paywalls defer until `first_plan_action_started` (or the existing 5-defer / 72h budget).

---

## 4. Before vs after funnel

**Before (audit)**  
Ad → unclear first experience → generic tip → account friction → repeated onboarding → dashboard → Generate → maybe value → paywall

**After (this work)**  
Ad: “Get your child's plan for today.”  
→ Open `/begin`  
→ Child name / age / today  
→ Automatic 4–6 block plan  
→ Parent starts first block  
→ Optional account to keep tomorrow  
→ Premium boundary after first action  
→ Outcome paywall  
→ Purchase *(not live-verified here)*  
→ Tomorrow's plan

---

## 5. First 60-second flow (verified locally)

Guest path on `http://localhost:3000/begin`:

1. “Your child's plan for today” + “See today's plan”
2. Name → age → kind of day
3. “Building {child}'s plan”
4. Six named blocks appear with no Generate tap
5. “Start: Morning” begins the first action

Evidence: `/opt/cursor/artifacts/journey_a_guest_first_plan.mp4`

---

## 6. First-value definition

**`first_value_achieved`:** the parent **sees** a personalized 4–6 block plan for this child (guest reveal, or authenticated first plan ready).

**`first_plan_action_started`:** they start the lead block or a routine item.

**`first_plan_action_completed`:** they mark that first step done.

This is not “opened the Hub” and not “saw a generic calm-contact tip as the whole product.”

---

## 7. Paywall changes

- Default headline: “Keep your child's days this clear.”
- Subtitle sells continuity of the plan they just used.
- `PAYWALL_CORE_BENEFITS` and `PAYWALL_OUTCOME_COMPARE` replace a Health Lab / Games / unlimited-AI lead list on the modal.
- Dashboard / routine / value-bridge sources use the outcome copy with `{child}` when known.
- Timing: soft locks wait for first plan **action**, not merely first generate.
- First routine generate remains bypassed (`shouldBypassRoutineGeneratePaywall`).
- Social proof is product facts only. **No invented reviews.**

---

## 8. Analytics changes

Canonical events (one name per step):

`first_open` · `onboarding_started` · `child_created` · `onboarding_completed` · `first_plan_generated` · `first_value_achieved` · `first_plan_action_started` · `first_plan_action_completed` · `paywall_view` · `paywall_dismiss` · `subscribe_clicked` · `checkout_started` · `purchase_success` · `purchase_failed` · `subscription_active` · `restore_purchase`

Legacy aliases remain (`premium_paywall_viewed`, `upgrade_completed`, …). They are mapped, not duplicated as a second funnel.

Every analytics emit now attaches `auth_state`, `install_source`, UTM, `gclid`, `fbclid` when present.

---

## 9. Attribution changes

- `getInstallSourceLabel()`: `gclid` → `google_ads`, `fbclid` → `meta_ads`.
- Attribution is stored in `localStorage` (`amynest:install_attribution`) and copied onto every event envelope.
- Survives expected navigation and restart on the same browser profile.
- **Not proven** across a real Play Install → signup → RevenueCat purchase in this environment.

---

## 10. Purchase verification

**Not completed as a live purchase.**

This Cloud VM cannot complete Google Play, App Store, or Razorpay checkout with real or sandbox money.

What *was* verified:

- Premium gate unit tests still pass (16/16): internal trial does not grant `isPremiumSubscriber`; paid period rules unchanged.
- Paywall still has Restore Purchases + store/web cancellation language.
- Entitlement refresh code paths were not rewritten.

**Do not treat purchase unlock &lt;30s as certified.**

Required before ads: one real Paywall → store/Razorpay → webhook → app entitlement refresh on a device.

---

## 11. Real-device / equivalent evidence

### Journey A — new parent (guest) — PASS locally

Browser E2E on Vite (`localhost:3000/begin`): Noah, 5–7, school day → 6-block plan → Start Morning → Mark as done → plan remains without account wall.

<video src="/opt/cursor/artifacts/journey_a_guest_first_plan.mp4" controls></video>

<img src="/opt/cursor/artifacts/first_screen_plan_promise.webp" alt="First screen: child's plan for today" />
<img src="/opt/cursor/artifacts/noah_six_block_plan.webp" alt="Noah's six-block plan" />
<img src="/opt/cursor/artifacts/first_action_started.webp" alt="First morning action started" />
<img src="/opt/cursor/artifacts/plan_home_no_account_wall.webp" alt="Plan home without account wall" />

### Journey B — guest → account — PARTIAL

Guest plan dual-writes `sessionStorage` + `localStorage` (`amynest_guest_plan_v1`). Vitest confirms the plan survives sessionStorage clear. Full Firebase signup → same server routine was **not** run (no auth in this VM).

### Journey C — value → paywall — UNIT PASS, UI not filmed

`shouldDeferPaywallForActivation` stays true until `amynest:sub:first_plan_action`. Hard quotas (AI) still paywall immediately.

### Journeys D / E / F — purchase / fail / restore — NOT RUN

No store credentials, no RevenueCat sandbox purchase on this agent.

---

## 12. Regression results

| Check | Result |
|-------|--------|
| Focused kidschedule vitest (15 files, 71 tests) | PASS |
| Kidschedule `tsc --noEmit` | PASS |
| `subscription-premium-gate` (16 tests) | PASS — no entitlement leakage from this work |
| Rooms / Games / Hub code | Not deleted; hidden on day 0 until first plan |
| Frozen routine engine files | Not edited |
| Known pre-existing vitest import failures (`hub-support-utils`, `routine-timeline-ui`, `safe-import`) | Untouched |

Log: `/opt/cursor/artifacts/conversion_remediation_vitest.log`

---

## 13. Remaining P0 / P1 issues

**P0 still open**

- **P0-12 purchase verification** — no live purchase, cancel, fail, restore, reinstall, or &lt;30s unlock evidence. Operator runbook: `docs/product-growth/play-subscription-certification-checklist-2026-09-09.md`. **Do not mark P0-12 PASS until a real Play purchase on a physical device is verified through the webhook → `subscriptions` → `isPremiumSubscriber` chain.**
- **P0-10/11 cohort measurement** — canonical events exist; no production install→purchase cohort yet.
- Chat onboarding still exists as a longer authenticated path; Discovery Film is the shorter authenticated path. Both now auto-generate.

**P1 remaining**

- **P1-1 social proof:** no legitimate production reviews were added. Slot is facts-only.
- **P1-6** contextual paywall is wired for dashboard/routine/Amy sources; not every lock reason was rewritten.
- Play Console / App Store Connect listing beyond `play-store-metadata.md` still needs a human publish.
- Discovery Film still contains unused rhythm UI in the file; the beat is no longer in the question order.

---

## 14. Known limitations

- Guest plan is local, not a server routine. After signup, `activateFirstPlan` generates a **new** authenticated routine for today. Child name/age continuity is kept; block-for-block identity is not guaranteed.
- Guest state does not grant premium.
- `first_value_achieved` on the authenticated path fires when the first plan is ready (seeing the plan), which is earlier than completing an action.
- No conversion-rate claims. Live data still has **zero subscriptions**.
- **Not ready for paid ads.** Next gate: 200-install cohort measuring `first_open` → `first_value_achieved` (≥25%), D1, paywall, checkout, purchase, `install_source` coverage (≥80% of paid installs).

---

## Ads gate (do not skip)

Minimum from the audit — **measure, do not invent:**

- ≥25% of first opens reach `first_value_achieved`
- D1 ≥15%
- ≥80% of paid installs have `install_source`
- Successful real purchase unlock
- Paywall after completed plan / first action
- Outcome-based paywall (shipped)

Stronger commercial gate: install → paid ≥0.8%, D7 ≥10%, CPA below subscription economics.
