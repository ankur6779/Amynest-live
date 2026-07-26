# P0 Root Cause Report: False “Trial Ended” Paywall for Brand-New Users

## Exact root cause

Brand-new users were classified as **trial ended** because multiple layers treated **bare `subscriptionState === "EXPIRED"`** (and/or a server `internalTrialExpired` derived from that same EXPIRED bit) as proof that a Premium trial had completed.

The EXPIRED bit was produced by `healStaleSubscriptionRecord` when a **capped internal age trial** (`provider=none`, `status=trialing`, `isPremiumNow=false` after `INTERNAL_TRIAL_CAP_ENFORCED_AFTER`) was incorrectly treated as a stale premium row and rewritten to:

- `status=free`
- `subscriptionState=EXPIRED`
- `expiredAt=now`
- `trialEndsAt=null`

That happened on the same `GET /api/subscription` read that auto-granted the age trial via `maybeApplyAutomaticAgeTrial`.

### Decision path (production bug)

```
Onboarding complete
  → canStartTrial gated on status==="free" (false if auto-trialing OR EXPIRED)
  → skip /subscription-trial → /routines/generate (or dashboard)
  → GET /api/subscription
      → age auto-trial (trialing, provider=none)
      → healStaleSubscriptionRecord → EXPIRED   ← poison write
  → client isServerConfirmedExpiredTrial(EXPIRED) === true
  → resolveTrialPaywallVariant → trial_ended
  → SubscriptionFunnelOrchestrator → /subscription-trial-ended
  → UI: "Your Premium Trial Has Ended" / "Continue Premium"
```

## Files responsible (line numbers at fix time)

| Layer | File | What went wrong |
|-------|------|-----------------|
| Server heal | `artifacts/api-server/src/services/subscriptionService.ts` ~614–658 | Healed capped internal trials to EXPIRED |
| Server flag | same file ~802 (pre-fix) | `internalTrialExpired = EXPIRED \|\| !!expiredAt` |
| Client expiry | `artifacts/kidschedule/src/lib/winback-eligibility.ts` ~50–59 | Bare `EXPIRED` ⇒ confirmed expired trial |
| Client variant | `artifacts/kidschedule/src/lib/trial-paywall-variant.ts` (first fix) | Used `isServerConfirmedExpiredTrial` (bare EXPIRED) |
| Onboarding route | `artifacts/kidschedule/src/pages/onboarding.tsx` ~1204, ~1253 | Gated free-trial paywall on `canStartTrial` |
| CTA gate | `artifacts/kidschedule/src/hooks/use-trial-state.ts` ~21–32 | `canStartTrial=false` for EXPIRED / non-free |
| Offer CTA | `artifacts/kidschedule/src/components/subscription-trial-offer.tsx` | Hid CTA when `!canStartTrial` |

## Why the previous fix failed

1. **Client still trusted bare `EXPIRED`** via `isServerConfirmedExpiredTrial` → `isExpiredInternalTrial` → winback / banners / stay-on-page logic.
2. **Server still set `internalTrialExpired` from any EXPIRED / expiredAt** until this pass; heal false-positives that weren’t repaired still flipped the flag.
3. **Repair window was too narrow** (1 hour fingerprint) and did not cover all false EXPIRED shapes.
4. **Onboarding still skipped `/subscription-trial`** whenever `canStartTrial` was false (auto age trial or EXPIRED), so users never saw “Start Free Trial” even when heal was preserved.
5. **`SubscriptionTrialOffer` returned `null` when `!canStartTrial`**, so reaching the free-trial page during a soft age trial still hid the CTA.
6. Deploy lag: production `main` may still have been running the heal bug without preserve/repair.

## Permanent fix implemented

### State machine (only allowed path)

`NEW_USER → FREE_TRIAL_AVAILABLE → START_FREE_TRIAL_PAYWALL → (Play billing) → TRIAL_ACTIVE → TRIAL_EXPIRED → TRIAL_ENDED_PAYWALL`

Unknown billing **never** maps to Trial Ended (defaults to free trial).

### Server

- `subscription-trial-expiry.ts`: natural completion = lived ≥1 day; false EXPIRED repaired to FREE.
- `internalTrialExpired` only for **provider=none** + natural completion (never RC/store expiry).
- `shouldPreserveActiveTrial` keeps capped internal trials out of heal.
- `repairFalseExpiredInternalTrial` resets any non-natural internal EXPIRED.

### Client

- `hasCompletedTrialEvidence` / `resolveTrialPaywallVariant`: Trial Ended **only** when `internalTrialExpired === true`.
- Bare EXPIRED → `free_trial` failsafe.
- Soft internal age trial (`provider=none`) → still `free_trial` (Play CTA).
- `isServerConfirmedExpiredTrial`: flag only (no bare EXPIRED).
- Onboarding uses `shouldRouteToPostOnboardingFreeTrial` (not `canStartTrial`).
- Free-trial offer uses state machine + native `purchase("yearly")` on Play/App Store.
- DEV `assertTrialEndedAllowed` / `trialEndedAssertViolation` when Trial Ended UI would paint without evidence.
- Structured `logTrialPaywallDecision` on redirect + Trial Ended screen.

### Tests

- Client: brand-new, never-subscribed, eligible, active store trial, natural expired, subscriber, offline/unresolved, bare EXPIRED failsafe, post-onboarding routing, assert violation.
- Server: instant heal vs natural expiry, RC EXPIRED ignored, missing timestamps.

## Expected UX

Brand-new users **always** see:

- Title: **Start your FREE 3-Day Premium Trial**
- CTA: **Start Free Trial**

The string **“Your Premium Trial Has Ended”** must not appear unless `internalTrialExpired === true` after a naturally completed internal trial.
