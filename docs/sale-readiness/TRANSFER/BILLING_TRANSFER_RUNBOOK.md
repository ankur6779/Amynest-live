# BILLING TRANSFER RUNBOOK

**Date:** 24 September 2026  
**Do not modify billing or reopen finance totals.**

| Object | Documented ID / fact | Mechanism | Buyer access | Acceptance |
|--------|---------------------|-----------|--------------|------------|
| RevenueCat project | `proj9c1919f0` | Dashboard **invite Admin** → optional project transfer if RC offers it | Buyer RC login | Buyer opens Overview and edits an offering |
| Play app in RC | `app7b7fc89f20` ↔ `com.amynest.app` | Follows Play app transfer; refresh Play service account if used | After Play transfer | RC sees Play products |
| App Store app in RC | `appa31011b39a` ↔ `6767664343` | Follows Apple transfer; refresh shared secret | After ASC transfer | RC sees App Store products |
| Entitlement | `premium` | Export offering screenshot; do not change live now | Same | Packages visible |
| Webhook | `POST /api/subscription/webhook` + `REVENUECAT_WEBHOOK_SECRET` | Repoint URL after API cut; **rotate** secret after invite | Buyer Coolify | Test event HTTP 2xx |
| Public/secret API keys | Names only in env/certs | Issue new keys; revoke founder after accept | Buyer | Old key fails |
| Razorpay | Code still present | Razorpay is not currently used for AmyNest transactions, based on seller statement. Optional independent export to prove absence. | N/A unless account exists | Do **not** write ₹0 |

Vendor invite/transfer eligibility: **UNKNOWN** until owner clicks invite.

**Do not change products or webhooks this pass.**
