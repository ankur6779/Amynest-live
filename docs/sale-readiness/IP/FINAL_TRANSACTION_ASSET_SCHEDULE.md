# FINAL TRANSACTION ASSET SCHEDULE

**Date:** 2 October 2026  
**DRAFT SCHEDULE FOR COUNSEL — NOT EXECUTED.**  
Seller structure: Path A (`FINAL_SELLER_TRANSACTION_STRUCTURE.md`).  
Patent: **INCLUDE**, personally held, not granted.  
Do not treat this file as a signed bill of sale.

Party placeholders: **BUYER LEGAL NAME** (to be inserted when known).

---

## How to use at signing

Execute (counsel to conform):

| # | Instrument | Signatories | Purpose |
|---|------------|-------------|---------|
| 1 | Asset purchase agreement / SPA | AmyWorld (Ankur as proprietor) + Buyer | Business assets, operations, going concern |
| 2 | Intellectual property assignment | Ankur Raman personally **and** as proprietor, as counsel directs + Buyer | First-party IP actually held |
| 3 | Patent assignment (India) + IPO recordal package | Ankur Raman personally + Buyer | App. **202611059355** only |
| 4 | Bill of sale / delivery receipt | Same as (1) | Schedules A–E below |
| 5 | Domain / Cloudflare transfer authorizations | Ankur Raman personally | Vendor forms; **not** the SPA |
| 6 | Secret/signing escrow acknowledgement | Seller + Buyer | Handover of existing encrypted packs (no values in Git) |
| 7 | Source-title disclosure schedule | Seller | MIT/©/AI/media carve-outs from counsel memo |

Play Console and App Store Connect **app transfers** are **vendor closing mechanics** (buyer accounts required). They are scheduled here; they are **not** a pre-marketing diligence P0.

---

## Schedule A — AmyWorld commercial / business assets

Transfer **to the extent owned** by the sole proprietorship (counsel to confirm):

| Asset | Identifier / notes | Transfer mechanism at closing |
|-------|--------------------|-------------------------------|
| AmyNest / AmyNest AI product business | Going concern | SPA |
| GitHub repository possession | `ankur6779/Amynest-live` (public) | GitHub **repository transfer** to buyer org (SB-B01) |
| Play listing (AmyWorld enrollment **OWNER-CONFIRMED**; Console ID `8521950598112974454`; app `4972454135983854770`) | Package `com.amynest.app` | Standard Play **app transfer** when buyer Play account exists |
| App Store listing | App ID `6767664343`; bundle `com.amynest.app` | Standard Apple **app transfer** when buyer Apple Developer exists |
| Hetzner (OWNER-CONFIRMED AmyWorld) | Live API VPS `188.245.208.126`; worker historically `167.233.39.146` | Project/server transfer or rebuild |
| Coolify control plane | Production API + Postgres + Redis on that VPS | Admin invite or rebuild |
| RevenueCat project | `proj9c1919f0`; Play `app7b7fc89f20`; ASC `appa31011b39a`; entitlement `premium` | RC invite Admin + webhook retarget |
| Cursor tooling relationship | OWNER-CONFIRMED AmyWorld | Account change or discontinue; **not** source title |
| Customer contracts / subscriptions in stores | Follow store + RC | After store + RC handover |
| Marketing/ads account | Google Ads `6395859996`; campaign `23986249354` ENABLED; keep/pause **UNDECIDED** | MCC / admin invite; do not edit now |

**Excluded from AmyWorld-owned unless counsel reclassifies:** patent, `amynest.in`, Cloudflare (Schedule P).

---

## Schedule B — Ankur Raman personally held (must transfer in personal capacity)

| Asset | Status | Instrument |
|-------|--------|------------|
| Indian Patent Application **202611059355** | FILED/PENDING; **INCLUDE**; **NOT ASSIGNED** | Patent assignment + IPO recordal |
| Domain `amynest.in` / `www.amynest.in` | OWNER-CONFIRMED personal; registrar **screenshot pending** | Registrar `.in` transfer (auth-code **not** in Git) |
| Cloudflare account (zone + Pages + Worker) | OWNER-CONFIRMED personal | Cloudflare user/account transfer or Super Admin then cutover |

---

## Schedule C — Source code / IP rights (title UNKNOWN)

Convey **whatever rights seller actually has** in:

- `artifacts/kidschedule/`, `artifacts/api-server/`, `android/`, `artifacts/amynest-capacitor/`, `lib/` (including generated clients as generated), `content-engine/` **code**, `scripts/`, `infra/`, docs as text  
- Brand use of “AmyNest” / “AmyNest AI” (no TM registration evidenced)

**Disclosures (mandatory until counsel memo):** MIT field; no LICENSE; © footer; public repo; Replit scaffold; Cursor/AI-assisted commits; no contractor agreements found.

**Not assigned:** npm/Gradle/CocoaPods; Apple/Google SDKs; unknown-provenance media (Schedule D carve-out).

Existing draft: `IP_ASSIGNMENT_DRAFT.md` — **update** to Path A dual-capacity + **separate** patent deed (current draft incorrectly excludes patent entirely; INCLUDE requires a **separate** patent assignment, not silence).

---

## Schedule D — Content / software / media

| Class | Examples | Conveyance |
|-------|----------|------------|
| First-party original (if founder statement + counsel agree) | Product UI, prompts, golden scripts **as code** | Schedule C |
| GCS objects | Bucket `amynest-audio-storage` — inventory **not done** | Convey **owned** objects; carve **unknown** / third-party / generated-vendor |
| Repo binaries `public/`, `attached_assets/` | Per-file provenance **UNKNOWN** | Same carve-out |
| Third-party / licensed | Fonts, stock, JPL, Open-Meteo, KIE/YouTube outputs if vendor-owned | License or exclude |

---

## Schedule E — Operations escrow (already exist; deliver at closing)

| Pack | ID | Notes |
|------|----|--------|
| Production secrets | `AMYNEST-ESCROW-2026-09-25-0cc370f2` | 37 records; decrypt PASS |
| DB dump | `AMYNEST-DB-ESCROW-2026-09-25-006374fd` | Scratch restore PASS |
| Android upload keystore | `AMYNEST-ANDROID-ESCROW-2026-10-02-15a19d9e` | Not Play App Signing key |
| iOS profiles (+ opaque p12) | `AMYNEST-IOS-ESCROW-2026-10-02-beeaa578` | PKCS12 inner-open **not** done; Apple typically issues **new** certs after ASC transfer |

Credentials **rotate after** buyer control. Do not put values in Git.

---

## What “done” looks like (no execution this pass)

- Buyer legal name inserted.  
- Counsel conforms (1)–(7).  
- Ankur signs in both capacities.  
- Buyer counter-signs.  
- Vendor transfers (GitHub, Play, Apple, registrar, CF, Hetzner, RC) run **after** or **with** those signatures per closing checklist — **not** before.
