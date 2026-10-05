# Revenue reconciliation — 24 September 2026 finance evidence update

**Evidence update only.** Round-4 score remains **55/100**. Hard cap remains **69**.  
This file does **not** close ownership, transfer, patent publication, live-copy, security deployment, ads, or other P0/P1 items.

**Status:** PARTIALLY EVIDENCED — Google Play May–Aug and one Apple transaction verified; September excluded; full cross-platform reconciliation still pending.

## What was inspected

| Source | How inspected | In repo? |
|--------|---------------|----------|
| Google Play earnings reports for May, June, July, August 2026 | Seller-supplied verified line items. Seller stated four ZIP uploads with May duplicated. | **No.** ZIP/CSV filenames are not in this repository. See [exports/README.md](./exports/README.md). |
| App Store Connect Payments and Financial Reports | Seller CSVs inspected on disk and copied unchanged | **Yes.** `exports/financial_report.csv`, `exports/financial_report (1).csv`, `exports/financial_report (2).csv` |
| RevenueCat | Prior MCP evidence retained | Prior docs only (no new RC export) |
| Razorpay | Seller statement only | **No** independent export |

Do not treat missing processors or missing months as zero.

---

## A. RevenueCat — operational / subscription analytics (retained)

These rows are **not** first-party store settlement reports. They are kept so buyers can see both layers.

| Metric | Value | Period / as-of | Evidence status |
|--------|-------|----------------|-----------------|
| Lifetime gross (`revenue`) | USD 26.14 | 2026-04-19 – 2026-09-24 | VERIFIED (RevenueCat) |
| Lifetime proceeds | USD 16.83 | same | VERIFIED (RevenueCat definition) |
| MRR | USD 5 | 24 Sep 2026 point-in-time | VERIFIED (RevenueCat) |
| Active paid | 3 | 24 Sep 2026 | VERIFIED (RevenueCat) |
| Active trials | 0 | 24 Sep 2026 | VERIFIED (RevenueCat) |

Do **not** add RevenueCat + Google Play + Apple. The same store sale can appear in both RevenueCat and a first-party report.

Do **not** use RevenueCat as a substitute for the missing September 2026 Google Play financial report.

---

## B. First-party platform financial evidence (this update)

### Reconciliation table

| Platform | Period | Transactions / Units | Gross / Earned | Fees / Taxes / Adjustments | Reported proceeds | Evidence status | Notes |
|----------|--------|----------------------|----------------|----------------------------|-------------------|-----------------|-------|
| Google Play | May 2026 | 1 | ₹199 gross | ₹29.85 fee + ₹0.20 TDS | not treated as final net | VERIFIED | Product: AmyNest Monthly (AmyNest AI: Smart Parenting); SKU `amynest_monthly`; package `com.amynest.app`. Duplicate May ZIP not double-counted. |
| Google Play | June 2026 | 1 | ₹199 gross | ₹29.85 fee + ₹0.20 TDS | not treated as final net | VERIFIED | Seller-verified AmyNest subscription charge. Source ZIP not in repo. |
| Google Play | July 2026 | 1 | ₹199 gross | ₹29.85 fee + ₹0.20 TDS | not treated as final net | VERIFIED | Seller-verified AmyNest subscription charge. Source ZIP not in repo. |
| Google Play | August 2026 | 1 | ₹199 gross | ₹29.85 fee + ₹0.20 TDS | not treated as final net | VERIFIED | Seller-verified AmyNest subscription charge. Source ZIP not in repo. |
| Apple | iTunes Connect Payments and Financial Reports **(June, 2026)**; seller-stated payment date **30 July 2026** | 1 | ₹1,079.79 earned | ₹0.00 taxes and adjustments | ₹1,080.31 | VERIFIED | Status Paid. Exchange rate shown 1.00048 on `financial_report (2).csv`. Only Apple transaction currently evidenced for this audit period. ₹1,599 is superseded and unused. |

### Google Play May–August 2026 (verified)

- **VERIFIED GROSS GOOGLE PLAY CHARGES:** ₹796
- Google Play fees shown: −₹119.40
- India TDS shown: −₹0.80
- Arithmetic after these shown deductions: ₹675.80

₹675.80 is **not** labeled a final accounting / net settlement amount. The source reports were not present in the repository, so other adjustments (refunds, chargebacks, later corrections) are **not** independently ruled out from files in this repo.

September 2026 Google Play financial report was not yet generated at the time of this evidence update and is therefore excluded from the verified revenue period.

### Apple (verified)

- **APPLE VERIFIED PROCEEDS = ₹1,080.31**
- Earned: ₹1,079.79
- Taxes and adjustments: ₹0.00
- Total owed: ₹1,079.79
- Report header period: **June, 2026**
- Seller-stated transaction/payment date shown: **30 July 2026**
- Status: Paid
- Product is an AmyNest App Store transaction (seller statement + `amynest` context of the supplied report). Apple commission is **not** invented beyond what the report shows.

Three CSV views exist; they are one report, not three sales.

### Combined documented platform amount (reference only)

₹796 + ₹1,080.31 = **₹1,876.31**

**Combined documented platform amount using mixed bases — NOT a reconciled net revenue figure.**

Do **not** call ₹1,876.31 net revenue, profit, MRR, ARR, or cash received. Play is verified **gross charges**. Apple is verified **proceeds**.

---

## C. Razorpay

Razorpay is not currently used for AmyNest transactions, based on seller statement.

This is **not** written as “Razorpay revenue = ₹0”. No independent Razorpay export was supplied.

---

## D. September 2026

September 2026 Google Play financial report was not yet generated at the time of this evidence update and is therefore excluded from the verified revenue period.

- No September estimate
- No August extrapolation
- No RevenueCat September substitute for the missing Play report

---

## E. Remaining revenue evidence items

1. September 2026 Google Play report when generated.
2. Any required App Store Connect period/export evidence needed to establish the full audit window.
3. Razorpay export only if needed to independently establish absence of AmyNest transactions; otherwise retain seller statement.
4. Final cross-platform reconciliation once all available period reports are collected.

Revenue is **not** fully closed.
