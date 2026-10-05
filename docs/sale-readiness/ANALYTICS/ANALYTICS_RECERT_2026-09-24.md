# ANALYTICS RECERT 24 SEP 2026

**No fake events were created.** First-party Postgres and Firebase DebugView were **not queried**.

| Event | In code historically | Live count this pass |
|-------|----------------------|----------------------|
| install / first_open | Android/iOS + ads | **NOT QUERIED** |
| signup | Firebase Auth | **NOT QUERIED** |
| onboarding_complete | Client | **NOT QUERIED** |
| trial_start | RC + `/subscription-trial` | RC **0** active trials **VERIFIED** |
| paywall_view | Client | **NOT QUERIED** |
| begin_checkout | Historically weak | **NOT QUERIED — still at risk** |
| purchase | RC + stores | RC lifetime cash **VERIFIED**; event stream **NOT QUERIED** |
| subscription_start / renewal / cancel | RC webhook | **NOT QUERIED** |

| Source | This pass |
|--------|-----------|
| Firebase | NOT QUERIED |
| RevenueCat | Queried — 3 paid, $5 MRR, $26.14 LTV |
| Google Ads | Queried — 2,354 conversions ≠ purchases |
| Play / App Store | NOT QUERIED |

**Status: FAIL for closed-loop diligence.** Ads conversions still cannot be sold as sales.
