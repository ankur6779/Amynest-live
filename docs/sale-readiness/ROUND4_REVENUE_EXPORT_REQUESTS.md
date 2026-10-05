# ROUND 4 — REVENUE EXPORT REQUESTS

**Date:** 24 September 2026  
**Window:** 19 April 2026 → 24 September 2026 (extend to the day the export is pulled).  
**Do not mark reconciled until the files exist.**

Place drops here (no secrets in filenames):

`docs/sale-readiness/FINANCE/exports/`  
(create when files arrive; do not commit API keys)

Already verified (do not re-export unless you want a txn-level RC dump or original Play ZIP drop):

| Source | What we have | Missing |
|--------|----------------|---------|
| RevenueCat | Gross **26.14**, proceeds **16.83**, MRR **5**, 3 paid, 0 trials | Per-transaction CSV (optional) |
| Google Play | Seller-verified May–Aug 2026: 4 × ₹199 gross = **₹796**; fees −₹119.40; TDS −₹0.80. May duplicate not double-counted. | Source ZIPs not in repo; **September 2026 report when generated** |
| App Store Connect | One Payments and Financial Reports record (June, 2026): earned ₹1,079.79; proceeds **₹1,080.31**. CSVs in `FINANCE/exports/`. ₹1,599 superseded. | Any further period export needed for the full 19 Apr 2026–export-date window |
| Razorpay | Seller statement: not currently used for AmyNest transactions | Independent export **only if** needed to prove absence |

---

## 1. Razorpay

| Item | Spec |
|------|------|
| Exact export | Dashboard → **Payments** (or **Settlements**) → Export |
| Date range | 19 Apr 2026 – export day |
| Format | CSV |
| Required fields | payment/settlement ID, created_at, amount (gross), tax, fee, refund amount, net credit, currency, order/receipt, method, status, notes/product if any |
| Place | `FINANCE/exports/razorpay_payments_2026-04-19_to_YYYY-MM-DD.csv` |
| Also useful | Settlements CSV if Payments lacks net |

## 2. Google Play Console

| Item | Spec |
|------|------|
| Exact export | Play Console → **Download reports** → **Financial** / **Earnings** (and **Sales** if earnings lacks SKU) |
| Date range | 2026-04 through current month |
| Format | CSV (Google’s zip/csv) |
| Required fields | Order Number, Order Charged Date, Product ID, Currency of Sale, Item Price, Taxes Collected, Charged Amount, Financial Status, Refund Type |
| Place | `FINANCE/exports/play_earnings_2026-04_to_YYYY-MM.csv` |

## 3. App Store Connect

| Item | Spec |
|------|------|
| Exact export | **Payments and Financial Reports** and/or **Sales and Trends** → transaction / proceeds |
| Date range | Apr 2026 – current |
| Format | CSV / TSV as Apple provides |
| Required fields | Transaction ID / Apple ID, Date, SKU / Product, Customer Currency, Proceeds, Tax, Quantity, Refund indicator, Subscription period |
| Place | `FINANCE/exports/asc_financial_2026-04_to_YYYY-MM.csv` |

## 4. Optional RevenueCat txn dump

Dashboard → Customers / Charts export, or Transactions if available. Same date range. Place: `FINANCE/exports/revenuecat_transactions_....csv`

---

## Reconciliation methodology (only after files exist)

1. Normalize each row to: `source, txn_id, date, gross, tax, fees, refund, net, currency, product, status`.
2. Match Play/ASC rows to RC by store transaction ID / original transaction ID. **Count once** (RC is a rollup of stores; do not add RC + Play + Apple).
3. Razorpay rows are **India web** and should **not** appear in RC store proceeds unless you have a custom mapping — treat as a **third cash pile**.
4. Compare sum(RC proceeds) ≈ sum(Play net + ASC net) for overlapping store SKUs.
5. Refunds: subtract; never drop.
6. Google Ads conversions stay **out** of this table.

**Status: PARTIALLY EVIDENCED — Google Play May–Aug and one Apple transaction verified; September excluded; full cross-platform reconciliation still pending.**

Not fully closed. Do not mark reconciled until remaining period reports exist and the cross-platform match is done.
