# AmyNest Free → Premium Conversion — Phase 3 Remediation Report

**Status:** PHASE 3 IMPLEMENTED AND VERIFIED — STOP  
**Date:** 2026-08-17  
**Authority:** Founder Approval — Free → Premium Conversion Remediation (D1–D5)  
**Branch:** `cursor/free-premium-phase3-42e5`  
**Does not include:** Phase 4 implementation · Final Apple Audit  

**STOP after Phase 3.** Phase 4 (Health Lab static preview · Speech V2 first-use session) is a **separate Founder review** in §8. Do not implement it until the Founder locks the architecture below.

---

## 1. Mission result

Phase 3 conversion remediation is in production-ready code. Free families still receive the existing free floor. Premium remains optional continuity after value. Server entitlement (`isPremiumNow`, RevenueCat entitlement `premium`) is unchanged.

| Lock | Result |
|---|---|
| **D1 = YES** | Truthful trial copy · AI remaining / 70–80% education (no forced paywall) · earned routines stay open · continuation CTAs · existing-event telemetry extras |
| **D2 = first-use clock** | Talk with Amy calendar starts at first actual converse (including kickoff), not `subscription.createdAt`. Memory/status reads peek only. |
| **D3** | **Not implemented.** See §8 Founder review. |
| **D4** | **Not implemented.** See §8 Founder review. |
| **D5 = after first routine** | `/subscription-trial` is not auto-routed until `hasFirstRoutineActivationProgress()`. Premium remains reachable via pricing, paywalls, value-bridge, post-activation banner. |

---

## 2. What shipped (Phase 3)

### 2.1 Truthful trial copy

- Trial banner: “remaining in your AmyNest preview,” not “remaining in Premium.”
- Onboarding offer: “You can use AmyNest for free” · limits + optional Premium · CTA “Continue with AmyNest.”
- Phonics / Coach journey banners no longer say “free trial.”
- Talk with Amy 402: “Your 3 days of Talk with Amy have ended…” (first-use days, not a store trial).
- Conversation coach chrome: “Talk with Amy · N minutes a day” / “Talk with Amy's free days have ended.”

### 2.2 D5 — defer conversion until first routine

`shouldRouteToPostOnboardingFreeTrial` returns false when `hasFirstRoutine === false`.

Callers: `onboarding.tsx` (both completion paths), `child-discovery-film.tsx`.

After onboard, users go to `POST_ONBOARDING_ACTIVATION_PATH` until first-routine activation. The `/subscription-trial` screen still exists and remains an accessible Premium path.

### 2.3 AI quota visibility / education

- Helper: `artifacts/kidschedule/src/lib/ai-quota-education.ts`  
  Education at ≥70% used, or remaining 1 of 3 (infant).
- UI: `AmyAiQuotaHint` on classic Ask Amy and living workspace.
- Exhaustion: P0-7 D3 soft-continue **unchanged**; added `ASK_AMY_SOFT_CONTINUE.resetHint` (“Amy's extra help returns tomorrow.”).
- Shared-pool 402 copy: `PAYWALL_AI` → “unlimited Amy help.”
- **Did not** change 10 / 3 quotas, Ask Amy no-auto-paywall, or split `ai_query`.

### 2.4 Earned routines

- Removed list-level view-lock of already-saved routines.
- Opening a saved routine never paywalls.
- Generate still paywalls when `generateLocked` and not first-routine bypass.
- **Did not** change journey 3 or `FREE_LIMITS.routinesMax`.

### 2.5 Continuation CTAs

- Coach: `livingGoalLockedCta()` = “Continue with the complete Coach experience” (no unlock).
- Birth Sky: after first free insight, continuation card; CTA uses existing `premium_insight` (does not auto-open paywall on insight).
- Family: `PAYWALL_REASON_COPY.child_limit` / `child_locked` — “AmyNest can grow with your family.”

### 2.6 Telemetry (existing events, no schema)

- `paywall_opened` extras: `feature`, `used`, `limit`, `usage_label`, `module`.
- Funnel step name `quota_warning` on 70–80% education (no new DB table).
- `trial_converted` only if provider is not `none` / `manual`.

### 2.7 Talk-with-Amy first-use clock (D2)

- Pure math: `speechConversationTrialWindow.ts` (UTC `Date.now()`).
- Stamp: `speech_conversation_first_use` in existing `usage_daily`, `day=lifetime`, `count` = unix seconds.
- **Not** in `FREE_FEATURE_LIMITS` (no fake quota in entitlements).
- Insert-if-absent; never increment.
- Backward compat: if stamp missing, infer `min(createdAt)` of `speech_conversation_seconds` rows.
- Premium: 600s/day, no calendar expiry, no stamp required.
- Reinstall / login: stamp is by `userId`.

**Verification-found fix (this pass):** `GET /api/speech/converse/memory` previously called `resolveConversationBudget()`, which stamped first-use when the parent only opened the screen. That violated D2. Memory now **peeks**. Only `POST /api/speech/converse` (including kickoff) **stamps**.

---

## 3. Absolute freezes — verified unchanged

| Freeze | Evidence |
|---|---|
| Country-wise prices | `RAZORPAY_PLAN_PRICES_INR` still 199 / 999 / 1499. No pricing file in this diff. |
| RevenueCat products | No `rcPricingService` / product-id changes. |
| Entitlement `premium` | `REVENUECAT_ENTITLEMENT_ID ?? "premium"` unchanged. |
| Shared AI quota | `FREE_FEATURE_LIMITS.ai_query = 10`. `infant_ai_query` default 3. Not split. `speech_conversation_first_use` is **not** a FeatureKey. |
| AI models | No model-routing edits. Talk converse model untouched. Speech V2 still `gpt-realtime` (Phase 4 not shipped). |
| Existing free value | Routines generate floor, Ask Amy 10, infant 3, Emotional 4, Talk 5 min/day during first-use window — not removed. |
| Emotional Support free floor | `HARD_DAY_EMOTIONAL_CARD_COUNT = 4`. P0-7 test still asserts section lifetime 4. |
| Ask Amy soft exhaustion | Soft-continue copy only; no Upgrade / Unlock / Zap; no auto-paywall. |
| P0-7 Hard-Day Law | Helpers unchanged except additive `resetHint`. Tests still forbid upgrade/unlock/zap/FOMO. |
| Living interiors | Coach CTA string only; no Care / Coach room remanufacture. |
| DB schema | No `lib/db` migrations. First-use clock reuses `usage_daily`. |

`isPremiumNow` remains false for capped internal trials (`subscription-premium-gate` 16/16).

---

## 4. Free → value → Premium journey (Phase 3)

```
Onboard complete
        │
        ├─ hasFirstRoutine? NO  →  activation path (first routine)
        │                            Premium still reachable from pricing / paywalls
        │
        ├─ first routine felt     →  optional /subscription-trial
        │                            (“You can use AmyNest for free”)
        │
        ├─ Ask Amy                →  remaining hint → 70% education (no paywall)
        │                            exhaust → soft-continue + tomorrow reset
        │
        ├─ Saved routine          →  always open
        │                            new generate may paywall after free uses
        │
        ├─ Talk with Amy          →  clock starts on first converse/kickoff
        │                            5 min/day × 3 UTC days, then continuity 402
        │
        └─ Paid user              →  isPremiumNow unchanged; 600s Talk; no calendar expiry
```

---

## 5. Paid-user regression

- Premium Talk budget still 600s/day; `isPremiumNow` short-circuits before first-use stamp.
- Health Lab still `canAccessHealthLab: isPremium` (Phase 4 not opened).
- Speech V2 still 0s for free / 120s trial / 600s paid via existing policy (Phase 4 not opened).
- Internal capped trials still non-premium (`isPremiumNow=false`) and still preserved by heal.

---

## 6. P0-7

Hard-Day Law is intact:

- Emotional Support: 4 free cards, SubItemGate MFHO passthrough.
- Ask Amy: help first, soft-continue on exhaust, no distress paywall.
- 70–80% education is **not** a paywall; it names tomorrow’s reset and optional unlimited continuity.
- Coach / family CTAs are continuation voice, not unlock theatre.

---

## 7. Verification

| Check | Result |
|---|---|
| Kidschedule targeted Vitest | **56 passed** / 11 files (`trial-paywall-variant`, `ai-quota-education`, `hard-day-monetization`, living-room, phase3 freeze, activation-gate, value-bridge, paywall-usage, onboarding-conversion-flags, first-value telemetry/flags) |
| API `conversationTrialWindow` + stamp-vs-peek | **6 passed** |
| API `subscription-premium-gate` | **16 passed** |
| `pnpm --filter @workspace/kidschedule typecheck` | **pass** |
| `pnpm --filter @workspace/api-server typecheck` | **pass** |
| `pnpm run typecheck:libs` | **pass** |
| `pnpm --filter @workspace/api-server build` | **pass** (`dist/index.mjs`) |
| `pnpm run build:web` | **pass** (Vite 27.58s · SEO 58/64 routes) |
| Final Apple Audit | **not run** (Founder lock) |

Known pre-existing (not Phase 3): `speechCoachV2UsagePolicy.test.ts` “paid user gets 600 seconds” fixture uses `status: "active"` without `subscriptionState: "ACTIVE"`, so `isPremiumNow` is false. Paid-user authority is covered by `subscription-premium-gate.test.ts`. Do not “fix” that fixture by loosening `isPremiumNow`.

Logs: `/tmp/phase3-verify/kidschedule-tests.log`, `/tmp/phase3-verify/api-tests.log`, `/tmp/phase3-verify/build-web.log`.

---

## 8. PHASE 4 — Founder review (do not implement yet)

**D3 and D4 are not in this branch.** The architecture can support both **only** under the constraints below. If the Founder cannot accept those constraints, **STOP** — do not ship a client-only preview or a daily 90-second Speech V2 grant.

### 8.1 D3 — Health Lab static / free preview

**Current authority**

- Entitlements: `canAccessHealthLab: isPremium` only (`subscriptionService.ts`).
- Route: `AppCore` `PremiumRoutePreview` blocks `/health-lab` **before** `HealthLabPage` mounts.
- `HealthLabPreviewOverview` in `health-lab.tsx` is an **age** preview (older children), not a free-tier preview, and is unreachable for free users today.
- `/api/health-lab/*` authenticates child ownership **only**. There is **no** `isPremiumNow` check on profile, sync, session, quest, badge, shop, or dashboard. If `HealthLabZone` mounts for a free user, progression / shop / quests can persist.

**Can it be done without bypassing premium?**

**YES — static door only.** Required locks:

1. **Do not** set `canAccessHealthLab = true` for free users.
2. **Do not** mount `HealthLabZone`, motion games, shop, quests, scoring, or sync.
3. Replace or branch `PremiumRoutePreview` for `/health-lab` with copy-only static preview (reuse `HealthLabPreviewOverview` markup / i18n; no `/api/health-lab` calls).
4. Continuation CTA only (PREMIUM_VOICE). No unlock / FOMO / distress sell.
5. **Do not** remanufacture the living Care interior.
6. Strongly recommended companion (not a schema change): add `isPremiumNow` (or equivalent) on Health Lab **mutation and progress GET** routes so a future client bug cannot write inventory. This **hardens** server authority; it does not grant preview access.

**If the Founder wants an interactive first game / one quest / live avatar:** **STOP.** That exposes premium inventory and cannot be enforced by a static preview. The current APIs would accept it.

**P0-7:** Health Lab is not an Ask Amy / Emotional Support hard-day path. A static preview after the parent chose Care does not weaken Hard-Day Law, provided we do not paywall distress and do not sell fear.

**Founder decision needed:** Approve static door-only preview **with** server Health Lab progress/mutation gates as defense-in-depth? Yes / No / Static UI only (no API hardening this pass).

### 8.2 D4 — Speech V2 first-use 60–90 seconds

**Current authority**

- Policy: free non-trial `dailyLimitSeconds = 0`. Trial 120s/day. Paid 600s/day.
- `canStartSession(used, 0)` is false (`isDailyLimitReached` when limit ≤ 0).
- `POST` start session checks policy **before** `registerActiveSession`.
- `registerActiveSession` throws if `dailyLimitSeconds <= 0`.
- Realtime mint runs only after a startable session (`mintRealtimeClientSecret` after `canStartSession`).
- Daily usage (`speech_coach_v2_daily_usage`) **resets UTC midnight**.
- Completed sessions (`speech_coach_v2_sessions`) miss abandoned in-progress seconds.
- Model: existing Realtime model (`gpt-realtime` path). **Do not change models.**
- `canAccessSpeechCoach` is `isPremium \|\| !hub_speech_session.locked` (3 hub sessions). Free users can already enter `/speech-coach`; V2 Realtime is a **separate** 0s overlay.

**Why `dailyLimitSeconds = 90` for all free users is unsafe**

That would grant **90 seconds every UTC day**, forever, until they pay. That is a new free floor, not a first-use session, and it weakens the paid 600s product.

**Can a one-shot 60–90s session be enforced without schema?**

**YES — same pattern as Phase 3 Talk-with-Amy**, if the Founder accepts a `usage_daily` lifetime feature string that is **not** added to `FREE_FEATURE_LIMITS`:

| Mechanism | Safe? |
|---|---|
| Client timer only | **No.** Entitlement bypass. |
| Free `dailyLimitSeconds = 90` standing | **No.** Daily grant, not first-use. |
| SUM `speech_coach_v2_sessions.durationSeconds` only | **No.** Abandoned sessions would not count; next day could mint again. |
| `usage_daily` `day=lifetime` feature `speech_coach_v2_first_session` (not a FeatureKey), count = seconds used, insert/update capped at 90; policy returns `min(90 - used, …)` then 0 forever; ticks charge **both** daily row (for paid/trial accounting) **and** lifetime first-session row; start + register + mint all read that remaining | **Yes.** No schema. Server authority. Reinstall follows `userId`. |
| New DB column / table | Frozen unless separately approved. Unnecessary if lifetime `usage_daily` is allowed. |

**Additional D4 locks if approved**

- Cap **90 seconds** (upper end of 60–90) unless the Founder specifies 60.
- Do not flip `isPremiumNow` or `canAccessSpeechCoach`.
- Do not add the feature string to `FREE_FEATURE_LIMITS` (would appear as a fake shared quota).
- Do not change `SPEECH_COACH_V2_TRIAL_DAILY_LIMIT_SECONDS` (120) or paid 600.
- Do not change the Realtime model.
- Infer prior V2 use from existing sessions / daily rows for users who already practiced (backward compat), then persist the lifetime stamp.
- Cost: 90s of Realtime is a real grant. Server must refuse mint when remaining is 0.

**If the Founder forbids any new `usage_daily` feature string:** **STOP.** The existing daily V2 tables cannot safely express a lifetime first session.

**Founder decision needed:** Approve D4 using lifetime `usage_daily` (no schema, not in `FREE_FEATURE_LIMITS`), 90s cap, mint/register/tick server-enforced? Yes / No / 60s instead of 90s.

---

## 9. What this pass did **not** do

- Health Lab preview  
- Speech V2 first-use session  
- Price / product / entitlement / model / quota-split changes  
- DB migrations  
- Final Apple Audit  

---

## 10. Recommendation

**Ship Phase 3.** It matches D1, D2, D5 and the absolute freezes.

**Hold Phase 4** until the Founder answers §8.1 and §8.2. Implementation of D3/D4 without those locks would either bypass entitlement or invent a daily free Speech V2 floor.
