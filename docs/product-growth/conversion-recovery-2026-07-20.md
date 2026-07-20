# Conversion Recovery — Trial → Paid (2026-07-20)

**Mission:** Unblock Install → Trial → Paywall → Google Play → Premium  
**Scope:** Kidschedule client + subscription marketing (no AI / routine engine rewrite)  
**Status:** Code complete · deploy required for production validation

---

## 1. Root cause list

| # | Root cause | Severity | Status |
|---|------------|----------|--------|
| 1 | Full-screen trial-ended page existed but was **never routed / orchestrated** | P0 | **Fixed** |
| 2 | Mid-trial conversion CTAs weak; banners fired `checkout_started` before store open | P1 | **Fixed** |
| 3 | Post-activation premium nudge suppressed during internal trial | P1 | **Fixed** |
| 4 | Paywall CTA scrolled off-screen; missing 7-benefit list / sticky CTA | P1 | **Fixed** |
| 5 | `subscribe_clicked` only on unreachable trial-ended page | P1 | **Fixed** |
| 6 | Activation defer could ignore real routines if milestones cleared | P1 | **Fixed** (durable flag + `routineCount` meta) |
| 7 | Pricing Cancel-for-trialists / expiry cron | P0 (prior) | Already fixed (Jul 6) |
| 8 | Internal trial = full premium → few lock paywalls until expiry | By design | Mitigated with banners + fullscreen |

---

## 2. Files changed

### Client (kidschedule)
- `src/AppCore.tsx` — route `/subscription-trial-ended`
- `src/lib/route-chunk-preload.ts` — preload trial-ended chunk
- `src/lib/trial-ended-redirect.ts` + `.test.ts` — redirect gate
- `src/components/subscription-funnel-orchestrator.tsx` — redirect + debug
- `src/components/subscription-trial-banner.tsx` — Subscribe Now + Upgrade Today
- `src/components/subscription-trial-expired-banner.tsx` → fullscreen
- `src/components/subscription-post-activation-banner.tsx` — mid-trial upgrade
- `src/components/subscription-trial-chip.tsx` — Subscribe CTA
- `src/pages/subscription-trial-ended.tsx` — analytics fix
- `src/components/paywall-modal.tsx` — sticky CTA, 7 benefits, logging
- `src/pages/pricing.tsx` — subscribe_clicked + debug + trial copy
- `src/contexts/paywall-context.tsx` — typed `routineCount`
- `src/components/subscription-event-bridge.tsx` — pass `routineCount`
- `src/lib/subscription-funnel-storage.ts` — first-routine durable flag
- `src/lib/activation-gate.ts` + `.test.ts`
- `src/lib/first-value-telemetry.ts` — subscription funnel routine events
- `src/pages/routines/generate.tsx` — first-routine progress strip

### Marketing
- `lib/subscription-marketing/src/index.ts` — six_month badge **Most Popular**

---

## 3. Why each change was required

| Change | Why |
|--------|-----|
| Wire trial-ended fullscreen | Highest-intent conversion moment was unreachable |
| Dual trial CTAs | Internal trial never showed Cancel-only; always Subscribe |
| Mid-trial post-activation CTA | Activated trialists had no upgrade nudge until expiry |
| Sticky paywall CTA | Primary CTA must stay visible on small Android screens |
| Analytics split | `checkout_started` only at real store/Razorpay start |
| Durable activation flag | Stop forever-defer when milestones wiped |
| Most Popular badge | CRO clarity on 6-month plan |
| Generate progress strip | Push first routine inside 5 minutes |

---

## 4. Before vs After flow

### Before
```
Install → Onboarding → Internal trial (full premium)
  → Paywalls mostly suppressed
  → Trial ends → soft banner only (fullscreen orphaned)
  → Pricing OK for purchase (Jul 6) but few reached it
  → 0 purchase_success
```

### After
```
Install → Onboarding → Internal trial
  → Countdown + Subscribe Now / Upgrade Today (always)
  → First routine progress strip (activation)
  → Mid-trial upgrade nudge after first routine
  → Trial expires → full-screen Continue Premium (one-tap Play)
  → Maybe Later → soft banner (24h cooldown) → same page
  → Purchase → premium_unlocked + analytics
```

---

## 5. Funnel diagram

```mermaid
flowchart TD
  A[Install / first_open] --> B[Onboarding]
  B --> C[Optional /subscription-trial]
  C --> D[routines/generate]
  D --> E{First routine?}
  E -->|No| D
  E -->|Yes| F[Premium value + mid-trial Subscribe]
  F --> G{Trial active?}
  G -->|Yes| H[Banner: X days left + Subscribe]
  G -->|Expired| I[/subscription-trial-ended fullscreen]
  H --> J[/pricing or Paywall]
  I --> K[Continue Premium]
  J --> K
  K --> L[RevenueCat / Google Play]
  L --> M[purchase_success]
  M --> N[premium_unlocked]
```

---

## 6. UI changes (no screenshots in CI)

- Trial banner: dual links **Subscribe Now** / **Upgrade Today**
- Trial chip: `Nd left · Subscribe`
- Paywall: 7 benefits list + sticky footer CTA + Restore + Terms/Privacy
- Trial-ended: existing dark fullscreen (now reachable)
- Generate: first-routine 3-step progress strip

---

## 7. Analytics coverage

| Event | Where |
|-------|--------|
| `first_open` | analytics service (existing) |
| `onboarding_started` / `completed` | onboarding (existing) |
| `routine_started` | first-value CTA → subscription funnel |
| `routine_completed` | generate success → subscription funnel |
| `paywall_opened` / `paywall_viewed` | paywall + banners + trial-ended |
| `subscribe_clicked` | pricing, paywall, banners, chip, trial-ended CTA |
| `checkout_started` | **only** store/Razorpay start |
| `purchase_success` / `purchase_failed` | pricing + paywall + trial-ended |
| `trial_started` / `trial_expired` / `trial_converted` | existing + orchestrator |
| `restore_purchase` | paywall restore |
| `premium_unlocked` | pricing native success (+ purchase_success mapper) |

Debug: `[amynest:subscription-debug]` JSON lines on open/defer/checkout/result.

---

## 8. Test report

Run locally:

```bash
pnpm --filter @workspace/kidschedule test -- src/lib/trial-ended-redirect.test.ts src/lib/activation-gate.test.ts
```

Manual QA matrix (post-deploy):

| Scenario | Expected |
|----------|----------|
| Fresh install | Onboarding → trial offer → generate progress |
| Active trial | Banner Subscribe/Upgrade; pricing purchasable; no Cancel |
| Expired trial | Auto-redirect fullscreen; Continue Premium → Play |
| Maybe Later | Dashboard expired banner; cooldown 24h |
| Paid user | No trial-ended redirect; Already premium |
| Restore | Paywall Restore Purchases |
| Offline | Native unavailable message; retry when online |
| Small screen | Sticky paywall CTA visible |

---

## 9. Risk assessment

| Risk | Mitigation |
|------|------------|
| Aggressive redirect loops | Skip list + dismiss cooldown + redirect once per mount |
| False expired for never-trialed | `isExpiredInternalTrial` requires server flag / EXPIRED / local trial start |
| Badge copy change (Safest → Most Popular) | Marketing-only; plans still three tiers |
| Mid-trial paywall spam | Soft banners only; locks still suppressed while `isPremium` |

---

## 10. Production readiness score

| Gate | Score |
|------|------:|
| Purchase path unblocked (code) | 95 |
| Trial-ended conversion wired | 95 |
| Analytics fidelity | 90 |
| Activation assist | 85 |
| Live E2E purchase proof | 0 (needs deploy + Play sandbox) |
| **Overall ship readiness** | **88 / 100** |

**Ship blocker remaining:** Deploy API + static web + Android wrapper; confirm first live `purchase_success` and trial expiry cron healing stuck `trialing` rows.
