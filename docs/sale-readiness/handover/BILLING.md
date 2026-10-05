# BILLING

**Do not invent store proceeds. Live numbers: 24 September 2026.**

## Model

Freemium. One entitlement: `premium`. Plans historically:

| Channel | Periods (historical catalog) |
|---------|------------------------------|
| App Store | $4.99 / $24.99 / $39.99 (14 Sep listing) |
| India web Razorpay | ₹199 / ₹999 / ₹1499 (`subscriptionService.ts`) |
| Play | RevenueCat Play app `app7b7fc89f20` |

## Systems

| System | ID / note |
|--------|-----------|
| RevenueCat | Project `proj9c1919f0` “AmyNest AI” |
| Play | `app7b7fc89f20`, package `com.amynest.app` |
| App Store | `appa31011b39a`, App ID `6767664343` |
| Test store | `app5c5ca2ad1a` — isolation **UNVERIFIED** |
| Razorpay | India web; **lifetime cash UNVERIFIED this pass** |
| Webhook | `/api/subscription/webhook` |

## Verified economics (RevenueCat only)

| Metric | Value |
|--------|-------|
| Active paid | **3** |
| Active trials | **0** |
| MRR | **USD 5** |
| Lifetime gross | **USD 26.14** (19 Apr–24 Sep 2026) |
| Lifetime proceeds | **USD 16.83** |
| 7-day convert-to-pay | **1 / 2,738 (0.04%)** |

Full table: `docs/sale-readiness/REVENUE_RECONCILIATION.md`.

## Transfer

Invite buyer to RC org; transfer Play / ASC; Razorpay KYC or re-onboard. Webhooks must be re-pointed. Sandbox vs production keys must stay isolated.
