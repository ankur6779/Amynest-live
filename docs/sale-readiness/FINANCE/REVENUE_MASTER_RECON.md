# REVENUE MASTER RECON

**Date:** 24 September 2026  
**Status: PARTIALLY EVIDENCED — Google Play May–Aug and one Apple transaction verified; September excluded; full cross-platform reconciliation still pending.**

Connectors used: RevenueCat MCP (prior).  
Play / Apple first-party figures: seller-supplied reports (this update).  
Razorpay: seller statement only; no independent export.

Do not treat missing rows or missing months as zero.  
Do not add RevenueCat + Play + Apple.

| Source | Period | Gross | Tax | Fees | Refunds | Net | Currency | Txn count | Product | Status | Verified |
|--------|--------|-------|-----|------|---------|-----|----------|-----------|---------|--------|----------|
| RevenueCat `revenue` | 2026-04-19–2026-09-24 | 26.14 | in RC rollup | in RC rollup | UNVERIFIED | — | USD | UNVERIFIED | mixed | lifetime metric | **YES (RC analytics)** |
| RevenueCat `proceeds` | same | — | in RC def | store+tax | UNVERIFIED | 16.83 | USD | UNVERIFIED | mixed | lifetime metric | **YES (RC analytics)** |
| RevenueCat point-in-time | 24 Sep 2026 | MRR 5 | — | — | — | 5 | USD | 3 active / 0 trials | premium | live | **YES (RC analytics)** |
| Google Play | May 2026 | 199 | 0.20 TDS | 29.85 | UNVERIFIED | not treated as final net | INR | 1 | amynest_monthly | charged | **YES (gross)** |
| Google Play | June 2026 | 199 | 0.20 TDS | 29.85 | UNVERIFIED | not treated as final net | INR | 1 | AmyNest subscription (seller-verified) | charged | **YES (gross)** |
| Google Play | July 2026 | 199 | 0.20 TDS | 29.85 | UNVERIFIED | not treated as final net | INR | 1 | AmyNest subscription (seller-verified) | charged | **YES (gross)** |
| Google Play | August 2026 | 199 | 0.20 TDS | 29.85 | UNVERIFIED | not treated as final net | INR | 1 | AmyNest subscription (seller-verified) | charged | **YES (gross)** |
| Google Play | September 2026 | — | — | — | — | — | INR | — | — | **EXCLUDED** | **NO — report not generated** |
| App Store Connect | Payments and Financial Reports (June, 2026); payment date shown 30 Jul 2026 | 1079.79 earned | 0 | 0 adjustments | UNVERIFIED | 1080.31 proceeds | INR | 1 | AmyNest App Store | Paid | **YES (proceeds)** |
| Razorpay | — | — | — | — | — | — | INR | — | — | seller statement: not currently used for AmyNest transactions | **STATEMENT ONLY** |

Google Play May–August 2026 **VERIFIED GROSS GOOGLE PLAY CHARGES = ₹796**. Shown fees −₹119.40 and TDS −₹0.80. Arithmetic after those shown deductions = ₹675.80 (not labeled final settlement). Duplicate May ZIP not double-counted. Source ZIPs are **not** in the repository.

APPLE VERIFIED PROCEEDS = **₹1,080.31**. ₹1,599 is superseded.

**Combined documented platform amount using mixed bases — NOT a reconciled net revenue figure:** ₹796 + ₹1,080.31 = **₹1,876.31**.

Google Ads 2,354 conversions are **installs + first opens**, not this table (see ads attribution).

## Remaining export / recon work

1. September 2026 Google Play report when generated.  
2. Any required App Store Connect period/export evidence needed to establish the full audit window.  
3. Razorpay export only if needed to independently establish absence of AmyNest transactions; otherwise retain seller statement.  
4. Final cross-platform reconciliation once all available period reports are collected.

Detail table: [revenue-reconciliation.md](./revenue-reconciliation.md).  
Source files: [exports/](./exports/).

**OWNER ACTION REQUIRED** for the remaining items. Hard cap 69 unchanged. Revenue hard-cap 79 is **not** lifted: reconciliation is still incomplete.
