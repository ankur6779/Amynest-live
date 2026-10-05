# FINAL REMAINING BLOCKERS AFTER OWNER ACTION

**Date:** 2 October 2026  
**Score unchanged: 55/100. Hard cap unchanged: 69. No new valuation.**  
Patent App. **202611059355**: **FILED / PENDING / NOT GRANTED**. Scope **INCLUDE**. Assignment **NOT EXECUTED**.  
Path A **OWNER-CONFIRMED** (AmyWorld sole prop of Ankur Raman). **SIGNED transaction structure still missing.**

This file is the working list of what still sits between **now** and **buyer signing / closing**. Historical audits are not repeated unless still open.

Authoritative companions: `IP/SOURCE_TITLE_FINAL_GAP_REPORT.md`, `IP/FINAL_SELLER_TRANSACTION_STRUCTURE.md`, `IP/FINAL_TRANSACTION_ASSET_SCHEDULE.md`, `BILLING_FINAL_TRANSFER_GAP.md`, `TRANSFER/GITHUB_HANDOVER.md`.

---

# FINAL REMAINING BLOCKERS

## P0 — Must close before buyer signing

| ID | Blocker | Current evidence | Exact missing evidence/action | Owner | Status |
|----|---------|------------------|-------------------------------|-------|--------|
| SB-A01 | First-party **source-code / IP title** unknown | Git authors (not title); MIT field; no LICENSE; © footer; public personal repo; unsigned founder-statement **draft**; counsel questions A–J unanswered | **Signed** founder statement; **counsel memo** warranting title **or** SPA carve-outs | **SELLER** then **COUNSEL** | **OPEN** — LEGAL REQUIRED |
| SB-A02 | No executed assignment / bill of sale | Drafts only (`IP_ASSIGNMENT_DRAFT.md` wrongly **excludes** patent; INCLUDE needs a **separate** patent deed) | Counsel-conformed SPA/APA + IP assignment + bill of sale **executed** with buyer named | **COUNSEL** then **SELLER** + **BUYER** | **OPEN** — LEGAL REQUIRED |
| SB-C01 | Path A elected but **unsigned** closing structure | Owner lock 25 Sep; `FINAL_SELLER_TRANSACTION_STRUCTURE.md` is a **lock file**, not a signature | Signed SPA naming AmyWorld sole prop **and** Ankur personally for patent/domain/CF | **COUNSEL** + **SELLER** | **PATH LOCKED / NOT SIGNED** |
| SB-A03 | Patent **INCLUDE** not assigned | Applicant Ankur Raman personally; INCLUDE locked; **not granted** | Patent assignment deed + IPO recordal path executed to **named buyer** | **COUNSEL** + **SELLER** (IPO = **VENDOR**) | **OPEN** — INCLUDE; transfer **NO** |
| SB-J01 | `amynest.in` **legal title** unproven | Live use VERIFIED; holder **OWNER-CONFIRMED** Ankur personally; **no registrar screenshot** | Registrar + registrant + lock + NS screenshots (auth-code **not** in Git) | **SELLER** | **OPEN** — EVIDENCE PENDING |
| SB-F01 | Cloud **account title** screenshots missing | Hetzner **OWNER-CONFIRMED** AmyWorld; CF **OWNER-CONFIRMED** Ankur; Coolify/GCP/Firebase **UNKNOWN** | Login + billing + project-linkage screenshots (no secrets) | **SELLER** | **OPEN** — EVIDENCE PENDING |
| SB-B01 | GitHub not buyer-transferable today | Only admin `ankur6779`; public `Amynest-live`; **VERIFIED** 2 Oct 2026 | Buyer org → seller **Transfer repository** → accept → recreate secrets → Coolify git retarget | **BUYER** then **SELLER** then **VENDOR** (GitHub) | **OPEN** — BUYER REQUIRED |
| SB-L01 | Billing not buyer-operable | RC owner **VERIFIED** Ankur Raman `ankur6779@gmail.com` sole owner; Play SA + ASC keys configured; webhook live; RC secrets **escrowed** | Buyer RC account; seller **Admin invite at closing**; then key rotation; after store transfers, refresh Play SA / ASC keys. **Do not invent** a one-click RC org transfer | **SELLER** + **BUYER** + **VENDOR** (RevenueCat) | **OWNER VERIFIED; TRANSFER NOT STARTED** |
| SB-F02 | Deploy plane founder-gated | Actions secrets on personal repo; workflow hard-codes `ankur6779/Amynest-live`; Coolify git method **UNKNOWN** | Coolify source screenshot **now**; after GitHub transfer, buyer-controlled secrets + green deploy | **SELLER** (screenshot) then **BUYER** | **OPEN** |

Items **not** in this P0 table by owner instruction (2 Oct 2026): Play/Apple **app-store transfer eligibility** and further iOS/Android **signing investigation**. Those are **buyer-dependent closing mechanics**. Existing signing/transfer evidence stays on file.

---

## P1 — Should close before/at closing

| ID | Blocker | Current evidence | Exact missing evidence/action | Owner | Status |
|----|---------|------------------|-------------------------------|-------|--------|
| SB-A04 | MIT vs no LICENSE vs © footer | VERIFIED conflict | Address in SPA disclosures; **do not** edit metadata without counsel | **COUNSEL** | **OPEN** |
| SB-A05 | Child-data assignability | Privacy/DPDP; production DB exists | Counsel: sell vs delete vs consent | **COUNSEL** | **OPEN** |
| SB-A06 / K01 | Content/media copyright + GCS inventory | Bucket `amynest-audio-storage` **name** VERIFIED; objects/IAM **not** listed; repo `public/` / `attached_assets/` provenance **UNKNOWN** | Prefix list (no bulk download); classify OWNER / LICENSE / UNKNOWN / BUYER ACTION; counsel carve unknown | **SELLER** then **COUNSEL** | **OPEN** |
| SB-D01 | Remaining finance evidence | Play May–Aug ₹796 VERIFIED (no duplicate May); Apple ₹1,080.31 VERIFIED; RC lifetime USD 26.14 / MRR USD 5 VERIFIED 24 Sep; Sep Play **EXCLUDED**; Razorpay unused **SELLER-STATED**; ads 90d INR 18,946.27 VERIFIED | See finance list below — **do not** invent September | **SELLER** | **PARTIAL** |
| SB-F04 | Coolify git deploy method | GitHub hooks API empty | Screenshot Coolify source (App / webhook / poll) | **SELLER** | **OPEN** |
| SB-F05 | Render leftover | Historic suspend 20 Jul; `RENDER_API_KEY` GH **name** only, **NOT FOUND** in escrow | Written unused **or** 503; revoke **after** confirm | **SELLER** | **OPEN** |
| SB-J02 | `support@` mailbox / MX / SPF/DKIM/DMARC | Address in copy; `RESEND_API_KEY` **escrowed**; mailbox title **UNKNOWN** | MX + inbox screenshots; buyer mailbox at closing | **SELLER** then **BUYER** | **OPEN** |
| SB-H03 / I03 | Play / ASC **legal-name** screenshots | Play org AmyWorld + IDs **VERIFIED** on H02 pass; ASC entity still **SELLER-STATED** | Console legal-name + Account Holder screenshots (no transfer click) | **SELLER** | **PARTIAL** (Play IDs done; ASC screenshot open) |
| SB-M01 | FA / GA4 property owners | Client IDs in build; `VITE_GA4_MEASUREMENT_ID` **NOT FOUND** in escrow | Property owner screenshots or “use new IDs after close” | **SELLER** | **OPEN** |
| SB-M02 | Ads keep/pause + liability | Campaign `23986249354` **ENABLED** 2 Oct 2026; daily budget 400; Display on; 90d spend INR 18,946.27 vs USD 5 MRR | **Written keep / pause / cut-budget** (do not edit Ads now); MCC invite at closing | **SELLER** then **BUYER** | **OPEN** — ENABLED |
| SB-N01 | Unused paid services | OpenAI/Gemini/ElevenLabs/KIE/YouTube/Slack/Telegram keys **escrowed** (so they exist in prod export); live materiality **not** re-proven | Tick live vs unused on `SERVICE_USAGE_CONFIRMATION.md`; do not delete | **SELLER** | **OPEN** |
| SB-E03 | `demo@amynest.in` admin policy | Prior notes only | One written policy | **SELLER** | **OPEN** |
| SB-O01 | Live legal copy vs Path A | **Repo** copy: AmyWorld operator; patent pill “application pending… Not granted.” Social footer still “Patent Pending.” Live HTML not re-fetched this pass | Exact change list below; **do not deploy** without instruction | **SELLER** (authorize) then production later | **OPEN** |
| SB-O02 | SBOM not CycloneDX; dual-license hits | `SECURITY/SBOM.md` | Counsel note on GPL-option hits; optional SPDX | **COUNSEL** | **PREPARABLE** |
| SB-B02 | `main` unprotected | API 404 | Optional on **buyer** org | **BUYER** | **NOT MATERIAL** to signing |

**Redis hostname** `g7jotufnm43n4au4e8n6x946` is already in `EVIDENCE/04-DATABASE/PRODUCTION_DB_IDENTITY.md` — **do not reopen G03 identity**. Redis **account title** follows Coolify/Hetzner (SB-F01).  
**Birth Sky key** is **ESCROWED** in SB-E01 (37/37) — **do not reopen E02**.  
**API VPS IP** `188.245.208.126` is in G01 — **do not reopen F03 for the API plane**. Worker IP `167.233.39.146` remains historic; confirm on Hetzner screenshot in F01.

### P1 — Content / media (title, not presence)

| Asset class | Location | Classification |
|-------------|----------|----------------|
| First-party code, prompts, golden scripts | Git | **UNKNOWN** title (same as A01) |
| GCS audio / TTS / phonics / reels | `amynest-audio-storage` | **UNKNOWN** until prefix list — **OWNER ACTION** |
| Illustrations / worksheets / coloring / curiosity / stories | Repo `public/` + possible GCS | **UNKNOWN** — presence ≠ ownership |
| Generated factory (KIE / YouTube) | Pipeline + secrets escrowed | **UNKNOWN** if production-critical; outputs may be vendor-encumbered — **COUNSEL** |
| Fonts / stock / music | Not separately evidenced | **UNKNOWN** / **LICENSE EVIDENCE** missing |
| Open-Meteo / public APIs | Client fetch | **NOT MATERIAL** (no assignment) |
| User/child content in DB | Production Postgres | **COUNSEL** (A05) — not a copyright asset of AmyWorld |

Do not assume AmyWorld owns an object because it is in Git or GCS.

### P1 — Legal / product identity (repo; **no deploy**)

Path A-consistent in `legal-entity.ts`: AmyWorld as **operator / product-of**, **not** a registered-company owner; patent applicant Ankur Raman.

| Surface | Issue | Action (do not deploy) |
|---------|-------|------------------------|
| Privacy / Terms | Operator AmyWorld; IP “not independently documented” | Counsel: add **sole proprietorship of Ankur Raman** if they want Path A explicit |
| Footer / i18n | “© 2026 AmyNest AI. All rights reserved.” | Counsel (ties to A04) |
| `PatentPendingPill` | “Patent application pending in India” + trust line “filed. Not granted.” | **Keep** |
| Social landing / tour / `social-assets-manifest` | Shorthand **“Patent Pending”** | Replace with filed/not-granted wording **if** deploying |
| Contact | `support@amynest.in` | Keep; mailbox title is J02 |
| Live production HTML | Last certified lag **INFERRED** | Re-diff live vs repo **when** owner authorizes a copy deploy |

### P1 — Finance remaining evidence (only)

Do **not** redo May–August Play. Do **not** count duplicate May ZIP. Do **not** invent September.

1. **September 2026 Google Play** earnings report — when Play generates it (**SELLER**).  
2. Any **additional Apple** Payments reports needed for the buyer’s audit window beyond the one verified June/proceeds file (**SELLER**).  
3. **RevenueCat vs store** recon for overlapping SKUs — RC is analytics, not a substitute for missing Play Sep (**SELLER** + buyer diligence).  
4. **COGS invoices**: Hetzner, Cloudflare, GCS, OpenAI/Gemini/ElevenLabs, RC, domain, Apple/Play developer fees — all **UNVERIFIED** except ads spend (**SELLER**).  
5. **Advertising:** 90d INR 18,946.27 VERIFIED; campaign still **ENABLED** (**SELLER** decision).  
6. Razorpay independent export **only if** buyer requires proof of absence (**SELLER**).

### P1 — Ads / unused services (report only)

| Item | Fact | Action before closing | Who |
|------|------|----------------------|-----|
| Google Ads `6395859996` / campaign `23986249354` | **ENABLED**, budget 400/day, Search+Display | Written keep/pause/cut; then MCC to buyer; **do not pause in this pass** | **SELLER** then **BUYER** |
| OpenAI / Gemini / ElevenLabs / KIE / YouTube | Keys present in prod escrow | Confirm still required; buyer new vendor orgs | **SELLER** / **BUYER** |
| Slack webhook / Telegram bot | Escrowed | Confirm or disclose as ops noise | **SELLER** |
| Render | Historic | Confirm unused; revoke later | **SELLER** |
| Sentry DSN | **NOT FOUND** in escrow | Treat as unused unless Coolify shows it | **SELLER** |

---

## Buyer-dependent items

| ID | Item | Why buyer-dependent | Seller preparation | Buyer action |
|----|------|---------------------|--------------------|--------------|
| SB-B01 | GitHub repo transfer | Destination org required | Transfer UI when org exists; Coolify screenshot | Create org; accept; recreate secrets |
| SB-H02 | **Google Play app transfer** | Buyer Play Developer account | Keep H01 escrow + Play IDs already captured | Enroll Play; accept app transfer at closing |
| SB-I02 | **Apple app transfer** | Buyer Apple Developer | Keep I01 pack as-is; buyer typically **new certs** after ASC transfer | Enroll Apple; accept app transfer at closing |
| SB-L01 | RevenueCat Admin | Buyer RC login | Invite **at closing**; do not invite now | Accept Admin; rotate keys; retarget webhook |
| SB-J01 (execution) | `.in` registrar transfer | Buyer registrar | Registrar evidence pack + unlock when closing | Accept domain; new NS if needed |
| SB-F01 (execution) | Hetzner / CF / Coolify / GCP IAM | Buyer vendor logins | Title screenshots now | Accept project/admin |
| SB-A02 | Counter-sign SPA / assignments | Buyer legal name + signatory | Counsel drafts with placeholder | Execute |
| SB-M02 | Ads admin | Buyer Google Ads | Keep/pause decision | Accept MCC / admin |
| SB-P01 | Founder-exit PASS | Aggregate of the above | Escrows already done | Operate without `ankur6779` |

---

## Already CLOSED — DO NOT REOPEN

- Production secrets escrow — SB-E01 `AMYNEST-ESCROW-2026-09-25-0cc370f2` (37 records, decrypt PASS). Includes Birth Sky field key and RC API/webhook secrets.  
- Production DB host identification — SB-G01 Coolify Postgres `tcl9udyxcuq2zu598ebj0pfu` on `188.245.208.126`. Redis hostname `g7jotufnm43n4au4e8n6x946` recorded in the same evidence file.  
- DB backup — SB-G02 encrypted dump `AMYNEST-DB-ESCROW-2026-09-25-006374fd`.  
- DB restore verification — SB-G02 scratch restore PASS.  
- Android upload signing escrow — SB-H01 `AMYNEST-ANDROID-ESCROW-2026-10-02-15a19d9e` (Play App Signing key remains Google-held, as documented).

Also record:

- **Android app transfer = buyer-dependent, not current commercial blocker** (standard Play transfer at closing with buyer Play account).  
- **Apple app transfer = buyer-dependent, not current commercial blocker** (standard App Store transfer at closing with buyer Apple Developer).  
- Further Play/Apple **eligibility / signing investigation cycles are stopped** unless a concrete technical/legal fact appears that would **prevent** those standard transfers.

---

## Immediate Next 5 Actions

1. **SELLER — sign** `IP/FOUNDER_SOURCE_CODE_STATEMENT_DRAFT.md` (fill every `[TO BE CONFIRMED]`; contractors none **or** attach agreements).  
2. **COUNSEL — write** the source-title memo (questions A–J) **and** conform Path A closing set: SPA/APA + dual-capacity IP assignment + **separate** patent assignment for 202611059355 + bill of sale using `FINAL_TRANSACTION_ASSET_SCHEDULE.md` (buyer name placeholder until known).  
3. **SELLER — capture** (no DNS/account changes): `amynest.in` registrar/registrant, Cloudflare account email/ID, Hetzner customer/billing as AmyWorld, Coolify login + git source method.  
4. **SELLER — GCS prefix list** for `amynest-audio-storage` (names only, no bulk download) so counsel can carve unknown media.  
5. **SELLER — written Ads decision** for campaign `23986249354` (keep / pause / cut budget) **without changing the campaign**, and drop RC collaborator screenshot into `EVIDENCE/11-REVENUECAT/` (API already shows sole owner `ankur6779@gmail.com`).

Do **not** transfer GitHub, invite a buyer to RevenueCat, start Play/Apple transfers, or deploy legal copy until the owner explicitly instructs.
