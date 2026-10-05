# ANALYTICS BUYER CERTIFICATION

**Date:** 24 September 2026  
No events were fabricated. Firebase DebugView / Postgres **not queried**.

| Required event | In product code? | Live count | Monetization? |
|----------------|------------------|------------|---------------|
| install | Play + ads | Ads **2,251** Play-install conversions (90d) | **NO** — install |
| first_open | `analytics-service` / startup funnel | Ads **103** first-open conversions (90d) | **NO** |
| signup | Firebase Auth | **NOT QUERIED** | no |
| onboarding_complete | teacher-os + setup-status | **NOT QUERIED** | no |
| trial_start | RC + trial routes | RC **0** active trials | maybe |
| paywall_view | paywall / birth-sky | **NOT QUERIED** | funnel |
| begin_checkout | Google conversion action exists (web + Android) | **0** in campaign 90d split | funnel |
| purchase | RC + paywall `purchase_success` + GA4 purchase actions | RC cash **3 paid / $26.14**; Ads purchase actions **0** in this campaign split | **YES** |
| subscription_start / renewal / cancel | RC webhook | **NOT QUERIED** as events | YES |

## Source comparison

| Source | What it measures here |
|--------|------------------------|
| Google Ads | Install + first_open for campaign 23986249354. Bidding = **install cost**. |
| RevenueCat | Cash and 3 actives. |
| Firebase / GA4 | Actions configured; **counts NOT QUERIED** |
| Play / Apple | **NOT QUERIED** |

Duplicates: the same install can appear as Play install + first_open (2,251 + 103).  
Sandbox vs production: RC test app exists historically — isolation **UNVERIFIED**.

**Buyer diligence: FAIL as a closed-loop purchase system.**  
**Improvement this round:** ads conversions are now **explained**, not mysterious.
