# Subscription funnel implementation (CRO audit)

Production implementation for all 10 CRO gaps. Marketing copy lives in `@workspace/subscription-marketing` (v2) — **not rewritten** in this pass.

## 1. Implementation plan (executed)

| Gap | Solution |
|-----|----------|
| #1 Trial wiring | `POST /api/subscription/start-trial` via `useTrialState`; `/subscription-trial` post-onboarding; trial CTA on pricing + paywall; banner + header chip; expiry analytics |
| #2 Annual default | `resolveDefaultPlanId()` — visit 1 → `six_month`, visit 2+ → `yearly` (session paywall visits via `sessionStorage`) |
| #3 Plan order | `sortPlanCards()` — yearly → six_month → monthly; mobile `order-first` on annual |
| #4 High-intent locks | `openSubscriptionGate()` / `amynest:open-paywall` on hub locks, sub-items, journey CTA |
| #5 Analytics | `trackSubscriptionEvent()` → `client-logs` type `subscription_funnel` → `/api/logs` |
| #6 Cancel save | `SubscriptionCancelDialog` two-step: annual save → confirm cancel |
| #7 Win-back | `SubscriptionWinbackModal` (lapsed + expired trial); pricing banner retained |
| #8 Post-purchase upsell | `PostPurchaseUpsellModal` after monthly / 6mo success |
| #9 Speech Coach | `reason="speech_coach"` on `LockedBlock`; live session gate; mutation `onError` → paywall |
| #10 Personalization | `resolvePaywallCopy(reason, childName)` + `usePrimaryChild()` |

## 2. Files changed

### New (kidschedule)

- `src/lib/subscription-analytics.ts`
- `src/lib/subscription-funnel-storage.ts`
- `src/lib/subscription-plans.ts`
- `src/lib/subscription-gate.ts`
- `src/lib/subscription-paywall-personalization.ts`
- `src/lib/subscription-feature-flags.ts`
- `src/lib/subscription-mutation-gate.ts`
- `src/hooks/use-trial-state.ts`
- `src/hooks/use-primary-child.ts`
- `src/components/subscription-trial-offer.tsx`
- `src/components/subscription-trial-banner.tsx`
- `src/components/subscription-trial-chip.tsx`
- `src/components/subscription-winback-modal.tsx`
- `src/components/subscription-cancel-dialog.tsx`
- `src/components/post-purchase-upsell-modal.tsx`
- `src/components/subscription-funnel-orchestrator.tsx`
- `src/pages/subscription-trial.tsx`

### Updated

- `src/contexts/paywall-context.tsx`
- `src/components/paywall-modal.tsx`, `paywall-modal-lazy.tsx`
- `src/components/subscription-event-bridge.tsx`
- `src/pages/pricing.tsx`, `onboarding.tsx`
- `src/components/locked-block.tsx`, `sub-item-gate.tsx`, `journey-preview-overlay.tsx`, `todays-path.tsx`
- `src/pages/speech-coach/*`
- `src/hooks/use-learning-load-more.ts`
- `src/AppCore.tsx`, `layout.tsx`
- `artifacts/api-server/src/routes/client-logs.ts`
- `lib/subscription-marketing` (plan order in API builder — prior session)
- `docs/subscription-funnel-implementation.md` (this file)

## 3. Architecture decisions

- **Single analytics facade** — `trackSubscriptionEvent()`; no duplicate Firebase SDK; server ingests via existing client logs pipeline.
- **Paywall vs pricing** — High-intent surfaces dispatch `amynest:open-paywall`; `/pricing` remains for browse, settings, trial banner “keep access”, win-back deep links.
- **Visit counting** — `incrementPaywallVisitCount()` only in `PaywallProvider.openPaywall()` (modal opens), not pricing page views.
- **Feature flags** — `VITE_FF_SUB_*` env vars default **on** for gradual kill-switch rollout.
- **RevenueCat attributes** — Best-effort `AmyNestBillingNative.setAttributes` after purchase (Android bridge when present).

## 4. Analytics schema

Events (message = `event` name) posted as `type: subscription_funnel`:

| Event | When |
|-------|------|
| `paywall_opened` | Modal open |
| `paywall_reason` | Gate / bridge before open |
| `plan_selected` | User taps plan card |
| `annual_default_shown` | 2nd+ visit default yearly |
| `annual_selected` | Yearly plan selected |
| `trial_started` | Trial CTA success |
| `trial_converted` | Premium after local trial marker |
| `trial_expired` | Trial end detected client-side |
| `checkout_started` | Razorpay / native checkout |
| `purchase_success` / `purchase_failed` | Checkout outcome |
| `cancel_started` | User opens cancel flow |
| `cancel_save_offer_shown` / `accepted` / `cancel_continue` | Two-step cancel |
| `cancel_confirmed` | Final cancel |
| `annual_upgrade` | Upsell / cancel-save / post-purchase |
| `winback_shown` / `winback_clicked` | Win-back modal |
| `post_purchase_upsell_*` | Post monthly/6mo upsell |

**Meta fields:** `reason`, `plan`, `source`, `platform` (`ios` \| `android` \| `web`), `country` (`IN` \| `GLOBAL`), `at` (ISO timestamp), optional `extra`.

## 5. Feature flag strategy

| Env var | Default | Purpose |
|---------|---------|---------|
| `VITE_FF_SUB_ANNUAL_DEFAULT_REPEAT` | true | 2nd+ paywall → yearly default |
| `VITE_FF_SUB_ANNUAL_FIRST_PLAN_ORDER` | true | Card order yearly first |
| `VITE_FF_SUB_PAYWALL_MODAL_LOCKS` | true | Locks → modal not `/pricing` |
| `VITE_FF_SUB_POST_ONBOARDING_TRIAL` | true | `/subscription-trial` route |
| `VITE_FF_SUB_TRIAL_STATUS_UI` | true | Banner + chip |
| `VITE_FF_SUB_WINBACK_MODAL` | true | Global win-back modal |
| `VITE_FF_SUB_POST_PURCHASE_UPSELL` | true | Post-purchase annual modal |
| `VITE_FF_SUB_CANCEL_ANNUAL_SAVE` | true | Cancel step-1 annual offer |
| `VITE_FF_SUB_ANNUAL_PRICE_EQUIV` | true | ≈₹125 / $3.33 mo on annual card |

Set `false` or `0` in env to disable without deploy.

## 6. Rollout plan

1. **Staging** — Enable all flags; verify trial start, paywall visits (sessionStorage), analytics in `/api/logs` buffer.
2. **10% production** — Flags on; monitor `purchase_success` / `trial_started` ratio.
3. **50%** — Compare `annual_selected` vs baseline six_month default cohort.
4. **100%** — Keep kill-switches for 2 weeks.

## 7. Migration requirements

- **Server:** Deploy `client-logs` union including `subscription_funnel` before relying on dashboards.
- **Clients:** No DB migration; localStorage/sessionStorage keys are new (non-breaking).
- **RevenueCat:** Optional `setAttributes` on Android native billing bridge (no-op if missing).

## 8. Risk assessment

| Risk | Mitigation |
|------|------------|
| Double trial start | Server eligibility + `canStartTrial` guard |
| Paywall visit inflation | Count only on `openPaywall`, not pricing |
| iOS/Android RC paywall bypasses custom modal | Default off (`VITE_FF_SUB_NATIVE_RC_PAYWALL`); custom paywall + `purchase()` |
| Cancel-save triggers checkout while user wanted cancel | Step 2 still required for final cancel |
| Trial converted false positive | Requires `getTrialStartedLocally()` marker |

## 9. QA checklist

- [ ] New user onboarding → `/subscription-trial` → start trial → dashboard chip/banner
- [ ] Trial ineligible user skips trial screen
- [ ] First paywall open defaults **six_month**; second open defaults **yearly**
- [ ] Plan cards order: yearly, six_month, monthly (mobile annual first)
- [ ] Hub lock overlay opens **paywall**, not pricing page
- [ ] Speech Coach locked tile + live session + API 402 opens `speech_coach` paywall
- [ ] Razorpay / native purchase fires `purchase_success`
- [ ] Monthly purchase shows post-purchase annual upsell once
- [ ] Cancel: annual save step → continue → confirm
- [ ] Lapsed / expired trial sees win-back modal (7d dismiss cooldown)
- [ ] Events appear in client logs with `subscription_funnel` type

## 10. Production readiness checklist

- [ ] `VITE_FF_SUB_*` documented in deployment env
- [ ] API server deployed with `subscription_funnel` log type
- [ ] RevenueCat products aligned with `yearly` / `six_month` / `monthly` IDs
- [ ] Razorpay plans match server plan IDs
- [ ] Privacy: analytics meta excludes child PII (only plan/reason/source)
- [ ] Smoke test on iOS (RC paywall) + Android + web India checkout
