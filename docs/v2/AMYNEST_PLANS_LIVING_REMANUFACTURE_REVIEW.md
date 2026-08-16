# AmyNest Plans — Living Remanufacture Review

**Status:** EXPERIENCE / UI COMPLETE  
**Date:** 2026-08-16  
**Branch:** `main`  
**Authority:** Founder Order — Subscription / Plans experience remanufacture  
**Scope:** `/pricing` presentation only  

This is **not** a pricing change. This is **not** a RevenueCat change. This is **not** another Apple Audit. Other AmyNest modules were **not** redesigned.

---

## 1. Before / after

**Before:** `/pricing` read as a promotional SaaS catalogue — violet/pink night gradient, crown badge, patent-pending sell, glowing SMARTEST CHOICE / MOST POPULAR pills, monthly-equivalent looking like the charge, ecosystem marketing block, annual upsell theatre, “Subscribe Now” trial pressure.

**After:** `/pricing` reads as AmyNest membership continuation — warm evening sanctuary, cream type, sand-edge cards, billed amount as the large price, quiet existing badges, “Keep Amy beside you.”, Continue with AmyNest, restore and billing still visible.

| Surface | Before | After |
|---|---|---|
| Hero | Growth-system catalogue headline + patent badge | Keep Amy beside you. Membership continuation |
| Cards | Neon selected glow, icon theatre, value anchors | Calm sand ring, name + audience + billed price |
| Price | Monthly equivalent could appear as the charge | Billed amount large; `≈ …/month` secondary |
| CTA | planCta sales verbs + pink glow | PREMIUM_VOICE / store-branded buttons unchanged |
| Extra marketing | Ecosystem + annual upsell on the page | Removed from this page (components kept) |
| Trial / win-back / restore | Present | Present; quieter chrome, same handlers |

---

## 2. Files changed

| File | Why |
|---|---|
| `artifacts/kidschedule/src/pages/pricing.tsx` | Living hero, cards, overlay, CTA chrome. Purchase/restore/cancel handlers unchanged. |
| `artifacts/kidschedule/src/pages/pricing-living.css` | Sanctuary materials (night/sand/cream). |
| `artifacts/kidschedule/src/lib/pricing-plan-card-ui.ts` | Display rearrangement + quiet badges. No price math. |
| `artifacts/kidschedule/src/components/plan-price-lines.tsx` | Optional `preferBilledPrimary` (pricing page only). Paywall default path unchanged. |
| `artifacts/kidschedule/src/components/subscription-pricing-sticky-cta.tsx` | Living sticky bar; billed amount; PREMIUM_VOICE CTA. Same `onCheckout`. |
| `artifacts/kidschedule/src/i18n/en.json` | Living hero/audience keys added. Old `pricing.title` left in place. |
| `artifacts/kidschedule/src/lib/pricing-living-display.test.ts` | Billed-primary + country passthrough tests. |
| `artifacts/kidschedule/src/lib/pricing-living-source.test.ts` | Source contracts: handlers kept, FOMO/neon absent. |
| `docs/v2/AMYNEST_PLANS_LIVING_REMANUFACTURE_REVIEW.md` | This review. |

---

## 3. Pricing logic untouched

Confirmed **not modified**:

- `lib/plan-price.ts` (`buildPlanPricePresentation`, equivalents, formatting)
- `lib/pricing-region.ts` (`INR_PLAN_PRICES`, `applyIndiaPricing`, locale/IP detection)
- `lib/subscription-plans.ts` (order, default plan, savings labels)
- `hooks/use-subscription.ts`
- `hooks/use-native-billing.ts`
- API `PLAN_PRICES` / `RAZORPAY_PLAN_PRICES_INR`
- RevenueCat product IDs, packages, entitlements, offers, trials

No hardcoded replacement prices. No currency conversion. No new plans. India overlay still runs only for web when `isIndia && !isNativeShell`.

`pricingLivingPriceDisplay` only rearranges strings already produced by `buildPlanPricePresentation`.

---

## 4. RevenueCat / purchase-flow regression

Handlers in `pricing.tsx` still call:

- `checkoutRazorpay(selected, …)` (Google Pay / Razorpay)
- `nativeBilling.purchase(selected)` (App Store / Play)
- `nativeBilling.restore()`
- `finalizeNativePurchase`
- `applyIndiaPricing(plans)`
- existing cancel / store-manage paths, `AmyCancelAgent`, post-purchase upsell flag

Test IDs preserved: `plan-card-${id}`, `button-upgrade-app-store`, `button-upgrade-googlepay`, `button-upgrade-razorpay`, `button-upgrade-google-play-native`, `pricing-sticky-cta`, restore, privacy/terms/support.

Google Pay / Play Store brand colors on those buttons were not restyled.

---

## 5. Country-price verification

Compared **displayed billed line** to existing product data (not invented catalog prices).

| Market | Source of truth | Yearly billed display |
|---|---|---|
| India (web overlay) | `INR_PLAN_PRICES.yearly = 1499` | `₹1,499` · Billed annually · `≈ ₹124.92/month` |
| US (API fallback) | existing `PLAN_PRICES.yearly = 39.99 USD` | `$39.99` · Billed annually · `≈ $3.33/month` |
| UK | store amount/currency passthrough fixture | living amount = engine format of store `34.99 GBP` — not converted from USD |
| EUR | store amount/currency passthrough fixture | living amount = engine format of store `39.99 EUR` — not converted from USD |

India six-month / monthly from the same overlay: `₹999` / `₹199`.

Live App Store / Play localized strings continue to win on native shells via existing `storePriceLabel` / `storePricesByPlan`. This environment did not call RevenueCat for live UK/EUR storefronts; the UI does not replace those strings.

Artifact: `/opt/cursor/artifacts/country_price_verification.json`

---

## 6. Mobile / desktop

CSS is mobile-first: stacked cards, `overflow-x: hidden`, 44px+ tap targets, `overflow-wrap` on prices, 3-column from 640px, tighter type under 360px, `prefers-reduced-motion`.

Visuals of the manufactured CSS with engine-formatted India amounts:

- 320 / 360 / 390 / 430 stacked, billed ₹ amounts readable, CTA and restore visible, badges not colliding
- Desktop 3-column, same calm hierarchy

`/pricing` is a protected route, so these screenshots use the production living CSS plus engine-formatted `INR_PLAN_PRICES` (the same strings the page renders for India web). The React purchase tree was not logged-in in this session.

---

## 7. Accessibility (static)

| Check | Result |
|---|---|
| Semantic `h1` | Yes |
| Plan cards are `button` + `aria-pressed` | Yes |
| Focus-visible rings on cards, CTA, restore | Yes |
| Cream on night background | Improved vs neon catalogue |
| Restore / cancel / legal links remain | Yes |
| Reduced-motion | CSS disables card/CTA/spinner transitions |
| VoiceOver / TalkBack / Dynamic Type on device | **Not claimed** — not tested on real devices |

---

## 8. State coverage (presentation)

| State | Behaviour |
|---|---|
| Loading | Existing loading copy, living colour |
| Purchase error | Existing `notice` from checkout/restore reasons |
| Already subscribed | Existing `pricing.already_premium` / on-plan pill, quieter chrome |
| Expired / lapsed | Existing `SubscriptionWinBackBanner` still mounts |
| Processing | Overlay restyled; still driven by `submitting` / `verifying` / `nativeBilling.purchasing` |
| P0-7 | `hard-day-monetization` **not** modified; tests pass |

---

## 9. Blind test

1. Aggressive pricing page? **No** — sanctuary membership, not a funnel.
2. Feels like AmyNest? **Yes** — night/sand/cream, continuation voice.
3. Actual price immediately understandable? **Yes** — billed amount is the large line.
4. Plan differences quickly? **Yes** — Growth Year / Steady Progress / Try the System + one audience sentence.
5. Premium as continuation? **Yes** — Keep Amy beside you / Continue with AmyNest.
6. Manipulative? **No** — no limited-time / miss-out / patent sell. Existing badges are quiet.
7. SaaS marketplace? **No** — ecosystem catalogue and annual upsell removed from this page.
8. Mobile comfortable? **Yes** at 320–430.
9. Country prices untouched? **Yes** — engine/overlay/store passthrough only.
10. Purchase flow untouched? **Yes**.

Target: *This feels like joining AmyNest, not buying a subscription from a sales funnel.*

---

## 10. Quality gate

| Gate | Result |
|---|---|
| TypeScript `pnpm --filter @workspace/kidschedule run typecheck` | PASS |
| plan-price + living display + source + P0-7 tests | PASS (26) |
| Production `pnpm --filter @workspace/kidschedule run build` | PASS |
| Pricing/RevenueCat/API engines unmodified | PASS |
| Purchase/restore/cancel handlers unmodified | PASS |
| No new plans / no amount changes | PASS |
| No other module remanufacture | PASS |
| No Apple Audit rerun | PASS |

**Verdict: Plans UI remanufacture COMPLETE.**
