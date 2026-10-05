# REVENUECAT / BILLING OPERATIONAL HANDOVER

**Date:** 24 September 2026  
**Not a revenue re-audit.** Cash figures stay in `FINANCE/`. This file is who can **operate** subscriptions after close.

| Object | ID / state | Owner | Evidence type | Transfer |
|--------|------------|-------|---------------|----------|
| RevenueCat project | `proj9c1919f0` “AmyNest AI” | **UNKNOWN** org | Project **VERIFIED**; title **UNKNOWN** | Invite buyer as Admin → transfer project if RC supports; else export + recreate |
| Play app in RC | `app7b7fc89f20` ↔ `com.amynest.app` | Follows Play + RC | **VERIFIED** mapping in docs | Rebuild if Play transfer changes package (it should not) |
| App Store app in RC | `appa31011b39a` ↔ `6767664343` | Follows ASC + RC | **VERIFIED** mapping | Update shared secret after Apple transfer |
| Entitlement | `premium` | In RC + API | **VERIFIED** in code/docs | Buyer must see packages `$rc_monthly` / products `amynest_monthly` etc. |
| Webhook | `https://www.amynest.in/api/subscription/webhook` | Coolify API + CF Worker | Path **VERIFIED** | Point RC dashboard at buyer-controlled API; set `REVENUECAT_WEBHOOK_SECRET` |
| RC API keys | Secret names `REVENUECAT_V2_SECRET_KEY` (cert notes), public keys in native apps | **NOT ESCROWED** | Names **VERIFIED**; values not printed | **Rotate** after invite (rotation ≠ transfer) |
| Play Billing | Native `BillingBridge` + RC | Play account **SELLER-STATED** AMYWORLD | **SELLER-STATED** console | Completes only after Play app transfer |
| App Store billing | StoreKit via RC | ASC **SELLER-STATED** AMYWORLD | **SELLER-STATED** | Completes only after Apple transfer |
| Razorpay | `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET`; webhook `/api/subscription/razorpay/webhook` | Seller: **not currently used** for AmyNest | **SELLER-STATED** unused; code **VERIFIED** | Independent export only if needed to prove absence; else retain statement |
| Google Play service account for RC | Common RC setup | **UNKNOWN** if uploaded | — | If present, re-upload under buyer Play |

## Acceptance

Buyer can change an offering / entitlement and see a webhook 2xx on a test event **without** founder RC/Play/Apple logins.

**OPEN — OWNER ACTION REQUIRED**
