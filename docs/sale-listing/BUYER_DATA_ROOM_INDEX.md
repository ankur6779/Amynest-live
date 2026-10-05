# BUYER DATA ROOM INDEX

**Date:** 2 October 2026  
**Listing vs closing:** this index maps **existing** evidence. Empty rows mean “not invented.”  
Do not put secrets, API keys, child PII, or escrow ciphertext in a public listing. Sensitive files stay under `docs/sale-readiness/` and offline escrow.

Legend: **Owner** = SELLER / COUNSEL / BUYER / VENDOR.

---

## 01 — Executive Overview

| Item | Existing evidence | Missing | Owner | Buyer-dep. | Counsel-dep. |
|------|-------------------|---------|-------|------------|--------------|
| Fact sheet | `docs/sale-listing/AMYNEST_BUYER_FACT_SHEET.md` | — | — | No | No |
| Listing copy | `docs/sale-listing/AMYNEST_LISTING_COPY.md` | Reason-for-sale | SELLER | No | No |
| Diligence disclosure | `docs/sale-listing/BUYER_DUE_DILIGENCE_DISCLOSURE.md` | — | — | No | No |
| Internal score 55/69 | `docs/sale-readiness/FINAL_SALE_BLOCKER_REGISTER.md` | Do not “fix” by scoring | — | No | No |

## 02 — Product

| Item | Existing | Missing | Owner | Buyer-dep. | Counsel-dep. |
|------|----------|---------|-------|------------|--------------|
| Feature inventory | `docs/sale-listing/PRODUCT_FEATURE_INVENTORY.md` | Full live E2E of every module | SELLER (optional demo) | Demo access | No |
| Production cert (partial) | `docs/sale-readiness/TECH/PRODUCTION_SELLER_CERTIFICATION.md` | Recert of untested modules | SELLER | No | No |
| Live site | www.amynest.in 200 (2 Oct 2026) | — | — | No | No |

## 03 — Technology

| Item | Existing | Missing | Owner | Buyer-dep. | Counsel-dep. |
|------|----------|---------|-------|------------|--------------|
| Technical summary | `docs/sale-listing/TECHNICAL_BUYER_SUMMARY.md` | — | — | No | No |
| Tech DD (partial) | `docs/sale-readiness/TECHNICAL_DUE_DILIGENCE.md` | Full typecheck/E2E recert | SELLER | No | No |
| SBOM | `docs/sale-readiness/SECURITY/SBOM.md` | CycloneDX; `pnpm audit` | COUNSEL on dual-license | Review | Yes |

## 04 — Architecture

| Item | Existing | Missing | Owner | Buyer-dep. | Counsel-dep. |
|------|----------|---------|-------|------------|--------------|
| Deploy workflow | `.github/workflows/deploy-production.yml` | Coolify git method screenshot | SELLER | After GitHub transfer | No |
| DB identity | `docs/sale-readiness/EVIDENCE/04-DATABASE/PRODUCTION_DB_IDENTITY.md` | — | — | No | No |

**Do not copy production host passwords into the data room index.**

## 05 — Analytics

| Item | Existing | Missing | Owner | Buyer-dep. | Counsel-dep. |
|------|----------|---------|-------|------------|--------------|
| Ads disclosure | `docs/sale-readiness/MARKETING/GOOGLE_ADS_SELLER_DISCLOSURE.md` | Keep/pause decision | SELLER | MCC at close | No |
| Ads attribution | `docs/sale-readiness/MARKETING/GOOGLE_ADS_REVENUE_ATTRIBUTION.md` | RC purchase mapping | SELLER | No | No |
| FA/GA4 owners | Client IDs in build | Property screenshots | SELLER | Transfer or new IDs | No |
| RC 28d actives 231 | Baseline 24 Sep | Fresh export if buyer asks | SELLER | RC login | No |

## 06 — Revenue & Finance

| Item | Existing | Missing | Owner | Buyer-dep. | Counsel-dep. |
|------|----------|---------|-------|------------|--------------|
| Snapshot | `docs/sale-listing/BUYER_FINANCE_AND_KPI_SNAPSHOT.md` | — | — | No | No |
| Play May–Aug | Recon memo (ZIPs **not** in git) | Sep Play report; optional ZIP copies offline | SELLER | No | No |
| Apple June report | `docs/sale-readiness/FINANCE/exports/` | Other Apple months if buyer window requires | SELLER | No | No |
| RC metrics | 24 Sep query | Fresh RC export at listing | SELLER | No | No |
| COGS | `FINANCE/COGS_REGISTER.md` | Invoices | SELLER | No | No |
| Razorpay | Seller-stated unused | Optional export | SELLER | No | No |

## 07 — IP & Legal

| Item | Existing | Missing | Owner | Buyer-dep. | Counsel-dep. |
|------|----------|---------|-------|------------|--------------|
| Path A lock | `IP/SELLER_STRUCTURE_DECISION.md` | Signed SPA | SELLER | Counter-sign | **Yes** |
| Source title pack | `IP/SOURCE_TITLE_FINAL_OWNER_ACTION_PACKAGE.md` | Signed founder statement; counsel memo | SELLER then COUNSEL | Accept warranty/carve | **Yes** |
| Patent papers | `patent/` ; status memos | Assignment + IPO; publication proof | SELLER | Named assignee | **Yes** |
| Privacy/Terms | In-app pages | Live copy deploy if authorized | SELLER | No | Review |
| Child-data assignability | Privacy text | Counsel opinion | COUNSEL | May require consent/delete | **Yes** |

## 08 — Infrastructure

| Item | Existing | Missing | Owner | Buyer-dep. | Counsel-dep. |
|------|----------|---------|-------|------------|--------------|
| Hetzner / CF holders | Owner-confirmed structure | Login/billing screenshots | SELLER | Admin accept | No |
| Coolify / GCP / Firebase | Use documented | Title screenshots | SELLER | IAM | No |
| Secret escrow | Evidence **IDs only** in `EVIDENCE/03-ESCROW/` | Handover under SPA | SELLER | Receive pack | Escrow terms |
| DB dump + restore | `EVIDENCE/04-DATABASE/` | Buyer scratch restore | SELLER done | Buyer infra | Data legality |

## 09 — App Stores

| Item | Existing | Missing | Owner | Buyer-dep. | Counsel-dep. |
|------|----------|---------|-------|------------|--------------|
| Play IDs + listing | `EVIDENCE/09-PLAY/` | ASC legal-name screenshot | SELLER | **Play transfer** | No |
| Android upload key escrow | `EVIDENCE/05-ANDROID/` | — | Closed | Receive at close | No |
| iOS pack (partial) | `EVIDENCE/10-APPLE/` | Buyer typically new certs after ASC transfer | — | **ASC transfer** | No |

Eligibility screenshots are **not** a listing condition. Transfers = closing.

## 10 — Billing

| Item | Existing | Missing | Owner | Buyer-dep. | Counsel-dep. |
|------|----------|---------|-------|------------|--------------|
| RC owner | `EVIDENCE/11-REVENUECAT/RC_ACCOUNT_OWNERSHIP.md` | Dashboard screenshot optional | SELLER | **Admin invite at closing** | No |
| Transfer gap | `BILLING_FINAL_TRANSFER_GAP.md` | Do not invent org-transfer button | — | Buyer RC account | No |
| Webhook URL | Public path `/api/subscription/webhook` | HMAC not in listing | — | Retarget after API cut | No |

## 11 — Content & Media

| Item | Existing | Missing | Owner | Buyer-dep. | Counsel-dep. |
|------|----------|---------|-------|------------|--------------|
| GCS name | `amynest-audio-storage` | Prefix inventory | SELLER | New SA | Title opinion |
| Hub modules | Code in parenting-hub | Per-file licenses | SELLER | — | Carve unknown |

## 12 — Operations

| Item | Existing | Missing | Owner | Buyer-dep. | Counsel-dep. |
|------|----------|---------|-------|------------|--------------|
| Support email | `support@amynest.in` in copy | Mailbox/MX proof | SELLER | New inbox | No |
| Ads campaign | ENABLED 2 Oct 2026 | Written keep/pause | SELLER | MCC | No |
| Unused services | `SERVICE_USAGE_CONFIRMATION.md` | Live vs unused ticks | SELLER | New vendor keys | No |

## 13 — Transfer & Closing

| Item | Existing | Missing | Owner | Buyer-dep. | Counsel-dep. |
|------|----------|---------|-------|------------|--------------|
| Asset schedule | `IP/FINAL_TRANSACTION_ASSET_SCHEDULE.md` | Executed docs | COUNSEL | Sign | **Yes** |
| Remaining blockers | `FINAL_REMAINING_BLOCKERS_AFTER_OWNER_ACTION.md` | Closures | Mixed | Many | Yes |
| GitHub handover | `TRANSFER/GITHUB_HANDOVER.md` | Buyer org | SELLER | **Yes** | No |
| Master matrix | `TRANSFER/MASTER_BUYER_HANDOVER_MATRIX.md` | Stale rows vs 2 Oct — use remaining-blockers as current | — | Yes | Yes |

## 14 — Known Risks / Open Items

| Item | Existing | Missing | Owner | Buyer-dep. | Counsel-dep. |
|------|----------|---------|-------|------------|--------------|
| Disclosure | `BUYER_DUE_DILIGENCE_DISCLOSURE.md` | — | — | No | No |
| Listing-safe metrics | `LISTING_SAFE_METRICS.md` | — | — | No | No |
| Q&A | `BUYER_QA.md` | Reason for sale | SELLER | No | Some |

**Not created (do not fake):** audited financial statements, user-cohort retention export, trademark certificate, patent grant, executed SPA.
