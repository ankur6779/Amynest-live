# REVENUE RECONCILIATION

**As of:** 24 September 2026  
**Do not treat this as a valuation.**

| # | Metric | Value | Date range | Source | Confidence |
|---|--------|-------|------------|--------|------------|
| 1 | Gross revenue (RC) | **USD 26.14** | 2026-04-19 – 2026-09-24 | RevenueCat `get-revenue-metric` `revenue` | **VERIFIED** |
| 2 | Net proceeds (RC, tax + store commission) | **USD 16.83** | same | RevenueCat `proceeds` | **VERIFIED** (RC definition only) |
| 3 | MRR | **USD 5** | point-in-time 24 Sep 2026 | RevenueCat overview | **VERIFIED** |
| 4 | ARR run-rate | **USD 60** if $5 MRR held | implied | 5 × 12 | **PARTIAL** (arithmetic only; not a forecast) |
| 5 | Lifetime revenue (all processors) | UNVERIFIED as one net figure | May–Aug Play + one Apple report + RC | Mixed bases; Sep excluded; Razorpay statement only | **PARTIAL** — see `FINANCE/revenue-reconciliation.md` |
| 6 | Paid subscribers (ever) | UNVERIFIED as a unique count | — | RC shows 1 convert-to-pay in 7-day window across 2,738 new customers; 3 currently active | **PARTIAL** |
| 7 | Active paid subscribers | **3** | 24 Sep 2026 | RevenueCat overview | **VERIFIED** |
| 8 | Active trials | **0** | 24 Sep 2026 | RevenueCat overview | **VERIFIED** |
| 9 | Trial-to-paid | UNVERIFIED | — | 0 active trials; historical internal trials existed Jul 2026 | **UNVERIFIED** (current) |
| 10 | Install-to-signup | UNVERIFIED current | Jul 2026: first_open 146 / signup 39 | Postgres growth report 13 Jul 2026 | **UNVERIFIED** (stale) |
| 11 | Signup-to-trial | UNVERIFIED | — | | **UNVERIFIED** |
| 12 | Trial-to-checkout | UNVERIFIED | — | | **UNVERIFIED** |
| 13 | Checkout-to-purchase | UNVERIFIED current | Jul 2026: `purchase_success` = 0 in analytics | | **UNVERIFIED** (current) |
| 14 | Refunds | UNVERIFIED | — | RC refund chart not pulled this pass | **UNVERIFIED** |
| 15 | Churn | UNVERIFIED | — | 3 actives; no duration export | **UNVERIFIED** |
| 16 | CAC | UNVERIFIED | Ads spend exists; paying users ≈ 3 | Cannot allocate | **UNVERIFIED** |
| 17 | Ad spend (Google, 90d) | **INR 18,946.27** | LAST_90_DAYS from 24 Sep 2026 | Google Ads campaign `23986249354` | **VERIFIED** |
| 18 | Revenue attributed to ads | **INR 103** Google conversion *value*; RC cash **not** mapped | same | Google Ads `conversions_value` | **PARTIAL** — value is **not** subscription revenue |
| 19 | Organic vs paid | UNVERIFIED | Jul 2026: 0 Google/Meta attributed installs in Postgres | | **UNVERIFIED** (current) |

## Reconciliation statement

RevenueCat cash and Google Ads “conversions” **do not reconcile**.

- Google reports **2,354 conversions** and **₹103** conversion value on **₹18,946** spend.
- RevenueCat reports **USD 26.14** lifetime gross and **3** active paid subscriptions.

A buyer must treat Google conversion counts as **install/event inflation**, not as 2,354 sales.

Razorpay India web collections: **seller statement only** — Razorpay is not currently used for AmyNest transactions, based on seller statement. Not an independent zero-transaction export.

Play / App Store first-party financial evidence (24 Sep 2026 update): **PARTIALLY EVIDENCED**.  
Google Play May–August 2026 **VERIFIED GROSS CHARGES ₹796** (four ₹199 charges; May ZIP duplicate not double-counted; source ZIPs not in repo).  
Apple Payments and Financial Reports (June, 2026) **VERIFIED PROCEEDS ₹1,080.31** (one unit; ₹1,599 superseded).  
September 2026 Google Play financial report was not yet generated at the time of this evidence update and is therefore excluded from the verified revenue period.  
**Combined documented platform amount using mixed bases — NOT a reconciled net revenue figure:** ₹1,876.31.  
Do not add RC + Play + Apple. See `FINANCE/revenue-reconciliation.md`.

**HARD CAP implication:** revenue cannot be fully reconciled across processors → selling score **cannot exceed 79** even if all other categories were perfect.
