# FINANCE/exports

**Date recorded:** 24 September 2026

Do not invent filenames. Only files that exist in this directory are listed below.

## Present in this repository (copied unchanged)

Seller App Store Connect CSVs were found on the seller workstation (`/Users/macbook/Downloads/`) and copied here without modification.

| Original filename | SHA-256 | What it is |
|-------------------|---------|------------|
| `financial_report.csv` | `4273813441ac62a6048c79807eec6d1daf0fc2a22cc8045ad12aca78d63e3b4c` | iTunes Connect Payments and Financial Reports **(June, 2026)** — India (INR) 1 unit; earned 1079.79; proceeds shown as **12.96 USD** |
| `financial_report (1).csv` | `5edf3be91aece12598b2f1f49708d1d3733517f421e0596fd53b11476fea8550` | Same June 2026 report header; proceeds shown as **1,079.79 INR** |
| `financial_report (2).csv` | `0b769edc03f2454d67a7b3388ab665346a933f63e69e18f5be1d9c5b50e9e075` | Same June 2026 report header; exchange rate **1.00048**; proceeds **1080.31 INR**; status **Paid** to seller bank (source file contains a masked account). **This is the diligence proceeds file.** |

These three files are **views of one Apple report**, not three transactions.

APPLE VERIFIED PROCEEDS used in the recon = **₹1,080.31** (from `financial_report (2).csv`).  
A previously mentioned ₹1,599 figure is **superseded** and is not used.

The source CSV for `(2)` includes a masked bank destination. Treat the file as confidential data-room material.

## Not present in this repository

**Google Play earnings ZIPs / CSVs** for May, June, July, and August 2026 were **not** found in the repository and were **not** copied into this folder.

The seller stated that four ZIP uploads were supplied and that the May report appears twice. Diligence recorded the seller-verified line items in [../revenue-reconciliation.md](../revenue-reconciliation.md) and **did not double-count May**.

Do not invent Play ZIP names, export IDs, or order numbers.

## Also not present

- September 2026 Google Play financial report (not yet generated; excluded)
- Razorpay payments/settlements export
- A complete App Store Connect export covering the full original audit window (19 Apr 2026 through export date)
