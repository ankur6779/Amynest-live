# REVENUE RECONCILIATION MASTER

**Date:** 24 September 2026  
Do not mix installs, ad conversions, and cash.  
Do not add RevenueCat + Play + Apple.

**Status:** PARTIALLY EVIDENCED — Google Play May–Aug and one Apple transaction verified; September excluded; full cross-platform reconciliation still pending.

| Source | Period | Gross | Fees | Refunds | Tax | Net | Currency | Txn count | Verified? | Evidence |
|--------|--------|-------|------|---------|-----|-----|----------|-----------|-----------|----------|
| RevenueCat revenue | 2026-04-19 – 2026-09-24 | **26.14** | in proceeds | UNVERIFIED | in proceeds | — | USD | UNVERIFIED | **YES (RC analytics)** | `get-revenue-metric` revenue |
| RevenueCat proceeds | same | — | store+tax in RC def | UNVERIFIED | in RC def | **16.83** | USD | UNVERIFIED | **YES (RC analytics)** | `get-revenue-metric` proceeds |
| RevenueCat MRR | point-in-time 24 Sep | 5 | — | — | — | 5 | USD | 3 actives | **YES (RC analytics)** | overview |
| RevenueCat trials | 24 Sep | — | — | — | — | — | — | 0 | **YES (RC analytics)** | overview |
| Google Play Console | May–August 2026 | **796** | 119.40 shown | UNVERIFIED | 0.80 TDS shown | not treated as final net | INR | 4 | **YES (gross charges)** | Seller-verified earnings line items; ZIPs not in repo; May duplicate not double-counted |
| Google Play Console | September 2026 | — | — | — | — | — | INR | — | **EXCLUDED** | Report not yet generated |
| App Store Connect | Payments and Financial Reports (June, 2026); payment date shown 30 Jul 2026 | **1079.79** earned | 0 adjustments | UNVERIFIED | 0 | **1080.31** proceeds | INR | 1 | **YES (proceeds)** | `exports/financial_report (2).csv`; ₹1,599 superseded |
| Razorpay | — | — | — | — | — | — | INR | — | **SELLER STATEMENT** | Not currently used for AmyNest transactions; no independent zero export |
| Bank records | — | — | — | — | — | — | — | — | **NOT QUERIED** | Not in repo as a bank statement |
| Google Ads spend | LAST_90_DAYS from 24 Sep | spend **18946.27** | — | — | — | — | INR | — | **YES (spend)** | campaign 23986249354 |
| Google Ads conversions | same | 2354 events / value 103 | — | — | — | — | INR value | 2354 | **YES as ads events** | **NOT sales** |

## Totals

**Verified RC subscription analytics:** USD 26.14 gross / 16.83 proceeds (RC only).  
**VERIFIED GROSS GOOGLE PLAY CHARGES (May–Aug 2026):** ₹796.  
**APPLE VERIFIED PROCEEDS:** ₹1,080.31.  
**Combined documented platform amount using mixed bases — NOT a reconciled net revenue figure:** ₹1,876.31.

All-processor lifetime / cash received / MRR / ARR from these mixed figures: **NOT CLAIMED**.

Detail: [revenue-reconciliation.md](./revenue-reconciliation.md).

Hard cap: unreconciled processors still apply → selling score **cannot exceed 79** on the revenue-recon cap. Binding Round-4 cap remains **69** (source title). Score remains **55/100**.
