# ANALYTICS

## Sources

| Source | Role | This audit |
|--------|------|------------|
| First-party Postgres | Intended SSOT / Growth OS `/admin/growth/*` | **Not queried live** |
| Firebase Analytics | Client events | Native vs WebView gaps **not re-proven fixed** |
| RevenueCat | Cash / subscribers | **Queried 24 Sep 2026** |
| Google Ads `6395859996` | UA | **Queried** — conversions ≠ cash |
| Play / App Store | Installs | **UNVERIFIED** |

## Funnel (buyer view)

Install → open → signup → onboarding → first routine → trial/paywall → checkout → purchase → renewal.

**Current cash conversion is near-zero** (RC 0.04% 7-day convert-to-pay). Google last 90 days: **2,354 conversions / ₹18,946 spend / ₹103 conversion value**.

Do not use Google conversion counts as sales.

## Known integrity issues (still treat as open)

See `docs/sale-readiness/ANALYTICS_SELLER_DUE_DILIGENCE.md`. begin_checkout/purchase gaps, attribution, sandbox vs prod — **NOT RE-VERIFIED FIXED**.
