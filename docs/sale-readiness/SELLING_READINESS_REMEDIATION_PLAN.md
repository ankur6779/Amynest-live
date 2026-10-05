# SELLING READINESS REMEDIATION PLAN

**Date:** 24 September 2026

## P0 — MUST FIX BEFORE ANY LISTING

| ID | Problem | Evidence | Buyer impact | Fix | Files / owner | Validation | Risk | Status |
|----|---------|----------|--------------|-----|---------------|------------|------|--------|
| P0-1 | Source-code title UNKNOWN | No assignment; MIT in package.json; no LICENSE | Deal killer / hard cap 69 | Counsel: assignment Ankur → seller entity or personal bill of sale; LICENSE decision | Legal, not git | Signed deeds | High if delayed | **OPEN** |
| P0-2 | AmyWorld vs Ankur Raman | `legal-entity.ts` vs IPO Form 1 | Who is the seller? | Incorporate or sell as individual; align legal copy | Counsel + `legal-entity.ts` | Docs match | High | **OPEN** |
| P0-3 | False social proof | `en.json` “12,000+ Parents” | Fraud / chargeback of trust | Strip or replace with verified 231/3 | i18n — **not changed this pass** (product copy) | Grep | Medium | **OPEN** |
| P0-4 | Revenue not fully reconciled | Play May–Aug gross ₹796 and one Apple proceeds ₹1,080.31 now recorded; Sep excluded; Razorpay statement only; no cross-platform close | Hard cap 79 still applies | Remaining period exports + one recon table | Finance | One closed table | Low | **OPEN — PARTIALLY EVIDENCED** |
| P0-5 | Account transfer map missing | Founder-only logins | Cannot operate | Fill `handover/ACCOUNT_TRANSFER.md` with owners (no secrets) | Seller | Checklist complete | Medium | **PARTIAL** (template only) |
| P0-6 | Ads still burning vs $5 MRR | Google ₹18,946 / 90d | Buyer inherits burn | Pause UA or disclose | Ads console | Spend = 0 or disclosed | Low | **OPEN** |
| P0-7 | Patent copy stale | “Provisional patent filed” without number; “patent-pending” | Misrepresentation | Use only “Indian Patent Application No. 202611059355 filed” or strip | i18n / stores | Counsel | Medium | **OPEN** |

## P1 — SHOULD FIX

| ID | Problem | Fix | Status |
|----|---------|-----|--------|
| P1-1 | No SBOM | `pnpm` license report | OPEN |
| P1-2 | No COGS invoices | 90-day vendor bills | OPEN |
| P1-3 | Form 9 unpublished | File / wait for publication | OPEN (seller-stated in progress) |
| P1-4 | Privacy/terms AmyWorld | Align with seller identity | OPEN |
| P1-5 | Live production feature recert | Route probe + paywall sandbox | OPEN |
| P1-6 | Analytics event recert | Postgres + RC + GA4 | OPEN |
| P1-7 | Debug routes in production | Confirm flags off | OPEN |

## P2 / P3

P2: architecture keep/kill map, Crashlytics, typecheck cleanup.  
P3: feature federation, conversion rebuild — **buyer or post-sale**.

## Implemented this pass (safe, in-repo, no production behavior change)

- Data-room documentation under `docs/sale-readiness/`
- Handover templates (no secrets)
- LICENSE decision note (no LICENSE file added)
- Root `README.md` engineering entry (no traction claims)
- Independent re-score (honest; **not** 90+)
- `typecheck:libs` run (PASS) — no production change

**Not implemented:** i18n claim strip, ad pause, legal assignments, LICENSE grant, listing package.
