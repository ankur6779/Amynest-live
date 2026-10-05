# ANALYTICS SELLER DUE DILIGENCE

**Date:** 24 September 2026

## Funnel events (code vs live)

| Stage | In code? | Live production count this pass |
|-------|----------|--------------------------------|
| Install | Android/iOS + ads | UNVERIFIED (Play/App Store not exported) |
| Open | Firebase / first-party | UNVERIFIED |
| Signup / anonymous | Firebase Auth + API | UNVERIFIED |
| Onboarding | `/onboarding`, Discovery Film | UNVERIFIED |
| First meaningful action (routine generate) | `/routines/generate` | UNVERIFIED |
| Trial | `/subscription-trial`, RC trials | RC **0** active trials **VERIFIED** |
| Paywall | native RC + Razorpay | UNVERIFIED views |
| Begin checkout | historically missing / weak | **NOT RE-VERIFIED** — treat as still at risk |
| Purchase | RC + store + Razorpay | RC lifetime gross **VERIFIED**; event-level **UNVERIFIED** |
| Subscription activation | RC webhook `/api/subscription/webhook` | Code READY; destination **UNVERIFIED** |
| Renewal | RC | UNVERIFIED |
| Cancellation | RC | UNVERIFIED |

## Previously known issues — still true?

| Issue | 2026-07 / 09-09 finding | 24 Sep 2026 |
|-------|-------------------------|-------------|
| Install optimization / fake conversions | Google conversions ≠ subscriptions | **STILL TRUE** — 2,354 Google conversions vs 3 RC paid |
| Missing begin_checkout / purchase | Conversion audit 41/100 | **NOT RE-PROVEN FIXED** — no live Postgres pull |
| Native Firebase only in Android WebView | Prior note | **NOT RE-PROVEN FIXED** |
| Purchase verification gaps | Jul `purchase_success` = 0 | Analytics SSOT **not queried** |
| Attribution 100% unknown UTM | Jul 13 | **NOT RE-PROVEN FIXED** |
| Sandbox vs production | Test Store app `app5c5ca2ad1a` exists | Isolation **UNVERIFIED** |

## Buyer conclusion

Analytics **cannot** be sold as a closed-loop subscription measurement system. Ads are still on. Conversion events are not cash.

**Status: PARTIAL / FAIL for diligence.**
