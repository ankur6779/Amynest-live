# BUYER FINANCE AND KPI SNAPSHOT

**Date compiled:** 2 October 2026  
**Do not mix layers.** Play gross ≠ Apple proceeds ≠ RevenueCat gross.  
**Do not treat Google Ads conversions as revenue or customers.**  
September 2026 Google Play: **excluded** (report not generated/verified). Duplicate May Play ZIP: **not counted twice**.

Internal score 55/100 is **not** a financial metric.

---

## 1. RevenueCat (subscription analytics)

**Source:** RevenueCat project `proj9c1919f0`, queried for sale-readiness **24 September 2026**.  
**Not** a bank statement.

| Metric | Value | Period | Source date |
|--------|-------|--------|-------------|
| Lifetime gross (`revenue`) | USD 26.14 | 2026-04-19 – 2026-09-24 | 24 Sep 2026 |
| Lifetime proceeds | USD 16.83 | same | 24 Sep 2026 |
| MRR | USD 5 | Point-in-time 24 Sep 2026 | 24 Sep 2026 |
| Active paid subscriptions | 3 | as-of 24 Sep 2026 | 24 Sep 2026 |
| Active trials | 0 | as-of 24 Sep 2026 | 24 Sep 2026 |
| 28-day actives | 231 | as-of 24 Sep 2026 baseline | 24 Sep 2026 |
| 7-day convert-to-pay | 1 / 2,738 (0.04%) | as documented in `handover/BILLING.md` | 24 Sep 2026 |

**ARR:** not calculated (would be an invention from a $5 point-in-time MRR).  
**Active paid (3) ≠ historical transactions.** Lifetime RC gross can include events that are not currently active.

RC figures were **not** re-queried on 2 Oct 2026 for this listing pack. Buyer should request a fresh RC export.

---

## 2. Google Play earnings (first-party)

**Source:** Seller-supplied Play earnings lines, verified in `docs/sale-readiness/FINANCE/revenue-reconciliation.md` (24 Sep 2026). ZIPs **not** stored in git.

| Month | Units | Gross | Fee shown | TDS shown | Status |
|-------|------:|-------|-----------|-----------|--------|
| May 2026 | 1 | ₹199 | ₹29.85 | ₹0.20 | VERIFIED; duplicate ZIP excluded |
| June 2026 | 1 | ₹199 | ₹29.85 | ₹0.20 | VERIFIED |
| July 2026 | 1 | ₹199 | ₹29.85 | ₹0.20 | VERIFIED |
| August 2026 | 1 | ₹199 | ₹29.85 | ₹0.20 | VERIFIED |
| **May–Aug** | **4** | **₹796** | **₹119.40** | **₹0.80** | VERIFIED **gross charges** |
| Sep 2026 | — | — | — | — | **NOT VERIFIED — omit from totals** |

SKU on verified lines: `amynest_monthly` / AmyNest Monthly; package `com.amynest.app`.  
₹675.80 after shown fee+TDS is **arithmetic only**, not certified net settlement.

---

## 3. Apple (first-party)

**Source:** App Store Connect Payments and Financial Reports CSVs in `docs/sale-readiness/FINANCE/exports/` (three files = **one** report).

| Field | Value |
|-------|--------|
| Report period | June, 2026 |
| Seller-stated payment date | 30 July 2026 |
| Units | 1 |
| Earned | ₹1,079.79 |
| Taxes and adjustments | ₹0.00 |
| **Proceeds** | **₹1,080.31** |
| Status | Paid |
| Evidence | VERIFIED |

Do not treat ₹1,599 (superseded unused figure in prior notes) as a second sale.

---

## 4. Combined figure (reference only — **not for public “revenue” headline**)

₹796 Play **gross** + ₹1,080.31 Apple **proceeds** = **₹1,876.31 mixed-basis**.  
**Not** net revenue, not profit, not MRR, not cash in bank.

---

## 5. Razorpay

Seller-stated: **not currently used** for AmyNest transactions.  
Independent export: **none**. Do not publish ₹0.

---

## 6. Google Ads (cost and **non-revenue** conversions)

**Account:** 6395859996 “Amynest AI”  
**Campaign:** `23986249354` App promotion-Android (purchases · metros)  
**Status 2 Oct 2026:** **ENABLED** (re-queried). Daily budget field **400**. Search + Display.

| Metric | Value | Period | What it is |
|--------|-------|--------|------------|
| Spend | INR **18,946.27** | Last 90 days as of 24 Sep 2026 | **Cost**, not revenue |
| Impressions | 408,902 | same | Ads |
| Clicks | 32,918 | same | Ads |
| Google conversions | **2,354** | same | **Installs + first opens**, not RC purchases |
| Conversion value (Google) | INR 103 | same | **Not** RC cash |
| Split | 2,251 Play-install conversions + 103 first opens + **0 purchase actions** | 26 Jun–24 Sep documented split | Attribution memo |

Verified paid subscribers (RC): **3**. Ads conversions **must not** be described as customers.

---

## 7. Operating costs (COGS)

| Category | Amount | Status |
|----------|--------|--------|
| Google Ads | INR 18,946.27 / 90d | VERIFIED |
| Hetzner, Cloudflare, GCS, Postgres, Redis | — | **UNVERIFIED** (no invoices in pack) |
| OpenAI / Gemini / ElevenLabs / TTS | — | **UNVERIFIED** |
| RevenueCat SaaS | — | **UNVERIFIED** |
| Domain, Apple/Play developer fees | — | **UNVERIFIED** except store take inside RC proceeds |

Ads spend **dwarfs** USD 5 MRR. That is a **fact about evidenced cost vs evidenced MRR**, not a claim that total COGS is known.

---

## 8. Listing rule

Public copy may use §1 (RC as-of 24 Sep), §2 May–Aug Play gross, §3 Apple proceeds, and Ads **spend** if conversions are labeled correctly.  
Keep mixed ₹1,876.31, convert-to-pay 0.04%, and 231 actives in the **data room** unless the seller wants them in a long-form listing with the same caveats.
