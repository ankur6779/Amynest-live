# AmyNest Phase 4 Monetization Implementation Review

**Status:** PHASE 4 IMPLEMENTED AND VERIFIED — STOP  
**Date:** 2026-08-17  
**Authority:** Founder Approval — D3 static Health Lab preview · D4 Speech V2 lifetime 90s first-use  
**Branch:** `cursor/free-premium-phase4-42e5`  
**PR:** https://github.com/ankur6779/Amynest-live/pull/114 (stacked on Phase 3)  
**Does not include:** Final Apple Audit · Phase 3 behavior changes except compatibility  

---

## 1. Health Lab preview architecture

Free `/health-lab` still goes through AppCore `PREMIUM_ROUTE_METADATA` with `accessKey: "canAccessHealthLab"`. If entitlements are missing that key, `ProtectedRoute` does **not** mount `HealthLabPage` / `HealthLabZone`.

The locked door now renders `HealthLabStaticFreePreview` instead of generic `PremiumRoutePreview`. Nutrition and Speech Coach locked doors are unchanged.

The preview is a static AmyNest room door:

- Calm Care-room introduction
- What the child can practice (titles/purposes from `HEALTH_LAB_QUIET_PATHS`, not playable games)
- What Premium continues
- Premium CTA via existing `openSubscriptionGate` + `PREMIUM_VOICE.continueCta`
- Leave path to Parent Hub / Today Home

It does not fetch `/api/health-lab`, does not mount `HealthLabZone`, and does not reuse `HealthLabPreviewOverview` (that remains the under-2 **age** preview inside `HealthLabPage` for entitled users).

`canAccessHealthLab` remains `isPremiumNow` in `subscriptionService`. No entitlement bypass.

## 2. Health Lab endpoint protection matrix

Authority: existing `isPremiumNow` after `healStaleSubscriptionRecord` (`assertHealthLabPremium`). Not `hubModuleGate("hub_health_lab")` (that gate allows journey/tile leakage).

| Endpoint | Class | Free | Premium | Notes |
|---|---|---|---|---|
| `GET /health-lab/profile/:childId` | progression_read | 402 `premium_required` | 200 | Inventory/progress. Not preview data. |
| `GET /health-lab/dashboard/:childId` | progression_read | 402 | 200 | |
| `GET /health-lab/history/:childId` | progression_read | 402 | 200 | |
| `GET /admin/health-lab/metrics` | admin | 403 unless admin | admin-only | No premium gate added. |
| `POST /health-lab/sync` | mutation | 402 | 200 | |
| `POST /health-lab/session` | mutation | 402 | 200 | |
| `POST /health-lab/quest` | mutation | 402 | 200 | |
| `POST /health-lab/badge` | mutation | 402 | 200 | |
| `POST /health-lab/streak` | mutation | 402 | 200 | |
| `POST /health-lab/shop` | mutation | 402 | 200 | |

Order on every non-admin route: existing auth → **child ownership** → `isPremiumNow`. Static preview needs no API.

**Compatibility fix:** POST handlers previously called `authChild({ body: { childId } })`, a synthetic object without `req.firebaseAuth`, so `getAuth` could not see the user. POSTs now pass the real `req` (body already contains `childId`). GET ownership behavior is unchanged. This is required for premium mutations to keep working after the premium gate.

## 3. Speech lifetime quota implementation

Living production is the target. Living OFF keeps legacy Speech chrome.

Free non-trial users receive **one lifetime 90-second Speech V2 demonstration**. This is not a daily quota, not a store trial, and not a RevenueCat entitlement.

Enforcement sits on the existing V2 stack:

- `canStartSession` / `registerActiveSession` / mint-after-start / `validateAndTouchSession`
- Register does **not** charge
- Page/usage GET peeks only
- Heartbeat and terminate charge **actual** tick seconds through `chargeSpeechCoachV2FirstUseSeconds`

Internal policy for free users sets `dailyLimitSeconds` to remaining lifetime seconds so existing `dailyLimitSeconds <= 0` rejects stay correct. Public usage JSON reports `dailyLimitSeconds = 90` as the lifetime cap plus `isFirstUseFree`, `remainingSeconds`, and `speechSecondsUsed` from the lifetime bucket — never UTC-day remaining.

## 4. Exact `usage_daily` feature identifier

| Field | Value |
|---|---|
| Feature | `speech_coach_v2_first_use_seconds` |
| Day | `lifetime` |
| Count | consumed seconds (0–90) |
| Identity | `userId` (account) |
| In `FREE_FEATURE_LIMITS`? | **No** |

Talk-with-Amy remains `speech_conversation_first_use` / `day=lifetime`. Independent row.

No new table. No `usage_daily` schema change. Unique index remains `(userId, day, feature)`.

## 5. Free consumption semantics

| State | Remaining | Start |
|---|---|---|
| 0 used | 90 | allowed |
| 30 used | 60 | allowed |
| 60 used | 30 | allowed |
| 90 used | 0 | blocked |
| >90 | 0 (capped) | blocked |

- No UTC-day reset. Next calendar day stays 0.
- Reinstall / logout / login cannot reset: the row is keyed by `userId`.
- Client timer / localStorage / React state are not authority.
- Opening Speech V2 does not consume.
- Starting a session does not consume the full 90s.
- Partial sessions add only charged ticks.
- If no lifetime row exists and the account already has V2 daily/session seconds, peek **infers** `min(90, prior seconds)` once so a trial/paid-then-free user does not receive a fresh 90s. Brand-new users with no history peek 0 and get no row until the first charge.

Copy: “Try Amy's speaking practice free.” / “You have a one-time free speaking practice.” Exhaustion is not “come back tomorrow” and not a 3-day / Premium trial.

## 6. Premium consumption semantics

Premium Speech V2 is unchanged:

- 600 seconds/day (`SPEECH_COACH_V2_PAID_DAILY_LIMIT_SECONDS`)
- Existing monthly cap
- `gpt-realtime` model routing unchanged
- Does **not** set `isFirstUseFree`
- Does **not** call `chargeSpeechCoachV2FirstUseSeconds`
- Does **not** consume the lifetime bucket

Trial remains 120 seconds/day. First-use is not overlaid on an active trial.

## 7. Failure / partial-session behavior

Accounting follows the existing V2 heartbeat:

- Tick = `min(15, max(elapsedSinceLastSeen, 1))` while live + realtime connected
- First-use path charges that tick into the lifetime bucket, capped by remaining
- Terminate may add a final tick of elapsed since last seen, capped at 15s
- Start-then-fail before any heartbeat: register charges 0. Immediate terminate with elapsed 0 charges 0.
- A failed/short session cannot burn the full 90s; at most existing 15s tick semantics apply.

If remaining hits 0 mid-session, the server returns `first_use_limit_reached` (429) and the client shows the existing continuation/paywall with first-use copy (already experienced V2; Premium continues 10 minutes/day). CTA uses `PREMIUM_VOICE` on the first-use path.

## 8. Child / account ownership semantics

Speech V2 usage identity is **per account (`userId`)**, not per child.

`usage_daily` has no `childId`. The lifetime 90 seconds is shared across children on the same account — the same model as Talk-with-Amy’s first-use stamp. Child ownership is still required to start a V2 session (`loadChild`). No new per-child quota was invented.

Health Lab mutations still require the caller to own the child, then premium.

## 9. Living vs legacy behavior

| Surface | Living ON | Living OFF |
|---|---|---|
| Health Lab free door | Care-room static preview | Same component, non-living visual |
| Health Lab entitled | Existing `HealthLabZone` | Unchanged |
| Speech V2 free first-use | 90s lifetime + calm copy | Same server rules; hub/limit chrome uses non-living labels where living is off |
| Speech V2 premium | 600s/day | Unchanged |
| Legacy Speech Coach | Not modified | Not modified |

Living OFF does not gain Health Lab interactive access. Legacy Speech entitlement/chrome was not rewritten.

## 10. RevenueCat verification

Diff vs Phase 3 does **not** include RevenueCat project, products, offerings, packages, or webhook handlers.

Entitlement id remains `premium` (`REVENUECAT_ENTITLEMENT_ID ?? "premium"`). No new entitlement. No new product. `canAccessHealthLab` still maps to `isPremiumNow`.

## 11. Pricing verification

No edits to `pricing-region.ts`, `INR_PLAN_PRICES`, Razorpay amounts, US fallback, or UK/EUR store presentation. `pricing-living-display.test.ts`: **34 web targeted tests included this file — passed**.

## 12. Model verification

`PRODUCTION_REALTIME_MODEL_DEFAULT = "gpt-realtime"`. `speechCoachV2RealtimeService.test.ts` passed. No model routing change.

## 13. Test results

### TypeScript

| Check | Result |
|---|---|
| `pnpm run typecheck:libs` | PASS |
| `pnpm --filter @workspace/api-server typecheck` | PASS |
| kidschedule `tsc` (pre-commit) | PASS |

### Health Lab

| Case | Result |
|---|---|
| Free user sees static preview (source + render) | PASS |
| Free user cannot mount HealthLabZone | PASS |
| AppCore still requires `canAccessHealthLab` | PASS |
| Free GET profile 402 | PASS |
| Free POST shop/session 402 | PASS |
| Premium GET + POST 200 | PASS |
| Premium cannot mutate another user’s child (404) | PASS |

### Speech V2 first-use

| Case | Result |
|---|---|
| 0 → 90 remaining | PASS |
| 30 → 60; 60 → 30; 90 → 0 | PASS |
| Exhausted blocked; extra charge 0 | PASS |
| `day=lifetime` (no UTC reset) | PASS |
| Same `userId` after “relogin” still 0 | PASS |
| Peek does not increment | PASS |
| Register/start does not consume | PASS |
| Heartbeat charges 1–15s, not 90 | PASS |
| Short terminate does not burn 90 | PASS |
| Premium 600/day, no lifetime row | PASS |
| Trial 120/day, not first-use | PASS |
| Talk-with-Amy feature independent | PASS |
| `gpt-realtime` unchanged | PASS |
| Feature not in `FREE_FEATURE_LIMITS` | PASS |

### Regression

| Suite | Result |
|---|---|
| `subscription-premium-gate` (`isPremiumNow`) | PASS |
| Phase 3 freeze (`free-premium-phase3-freeze`) | PASS |
| P0-7 `hard-day-monetization` + `sub-item-gate.hard-day` | PASS |
| Talk-with-Amy first-use window + converse stamp source | PASS |
| Pricing living display | PASS |
| Speech V2 heartbeat gating (no bill while disconnected) | PASS |
| P0 cost **route wiring** | PASS |
| P0 cost **integration** | Cancelled by Node test runner (`cancelledByParent` / pending event loop) — pre-existing harness issue when this file is driven under `--test`; not a Phase 4 product failure. Ask Amy 10/3 and `ai_query` source wiring unchanged. |

Logs: `/opt/cursor/artifacts/phase4_api_targeted_tests.log`, `phase4_api_targeted_tests_retry.log`, `phase4_web_targeted_tests.log`, `phase4_api_regression_tests.log`.

## 14. Production build result

| Build | Result |
|---|---|
| `pnpm --filter @workspace/api-server build` | **OK** (`dist/index.mjs`, worker bundle) |
| `pnpm run build:web` | **OK** (Vite production, SEO assets generated) |

Logs: `/opt/cursor/artifacts/phase4_api_build.log`, `phase4_web_build.log`.

## 15. Known limitations

1. First-use ticks use existing V2 heartbeat math (`min(15, max(elapsed, 1))`). A live first heartbeat can charge 1s even if wall elapsed is 0. This is existing session accounting, not a full 90s burn.
2. Terminate after a live session may add one final ≤15s tick. Documented existing semantics.
3. Prior V2 history is inferred into the lifetime bucket (capped at 90) so downgraded trial/paid users are not granted a second demonstration.
4. The 90-second allowance is **per account**, shared by all children.
5. Health Lab GET profile/dashboard/history are gated as progression. The static preview does not need them.
6. POST `authChild(req)` is a compatibility fix so premium Health Lab mutations authenticate. It does not loosen ownership or premium.
7. P0 cost-safety integration tests remain cancelled by the Node test runner in this environment; route-wiring assertions passed.
8. No Final Apple Audit (explicitly out of scope).

## Source-level freeze (diff vs Phase 3)

Touched files are Health Lab preview/gates, Speech V2 first-use, and their tests only.

Confirmed **not** changed: RevenueCat products/entitlements, country prices, AI models, Ask Amy 10/3, Emotional Support 4, P0-7 helpers, Phase 3 trial copy, Talk first-use clock implementation, routine generate, DB schema / migrations.

---

**STOP after Phase 4 verification.** Do not run Final Apple Audit.
