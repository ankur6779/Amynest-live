# SOURCE TITLE FINAL GAP REPORT

**Date:** 2 October 2026  
**Not a legal opinion. Git authorship is not copyright title.**  
Patent remains **FILED / PENDING / NOT GRANTED**. Scope **INCLUDE** is locked elsewhere; this file is software/content title only.

Commercial seller (Path A): **AmyWorld — sole proprietorship of Ankur Raman**.  
Source-code legal title: **UNKNOWN** until counsel says otherwise.

## What is already evidenced (do not re-investigate)

| Fact | Status |
|------|--------|
| Root `"license": "MIT"` since Replit scaffold `90c25805c` (8 Apr 2026) | **VERIFIED** |
| No `LICENSE` / `LICENSE.md` ever in git; GitHub `licenseInfo=null` | **VERIFIED** |
| Footer “© 2026 AmyNest AI. All rights reserved.” | **VERIFIED** |
| Public personal repo `ankur6779/Amynest-live`; only collaborator `ankur6779` (admin) | **VERIFIED** 2 Oct 2026 |
| Git authors (commit counts, not title): `ankur6779` 5427; `Cursor Agent` 648; `Ankur` 98; `cursor[bot]` 22; `github-actions[bot]` 21; `APPLE` 10; `Replit Agent` 1; `agent` 1 | **VERIFIED** |
| No contractor / employment / contributor agreements **found** in repo | **VERIFIED absence** |
| Founder statement exists as **DRAFT unsigned** | **VERIFIED** `FOUNDER_SOURCE_CODE_STATEMENT_DRAFT.md` |
| Counsel warrant/carve-out instruction sheet exists; **no counsel memo** | **VERIFIED** |
| SBOM is pnpm license list, not CycloneDX; dual-license hits need counsel | **VERIFIED** prior `SECURITY/SBOM.md` |
| First-party path inventory exists | **VERIFIED** `SOURCE_CODE_TITLE_INVENTORY.md` |

## Remaining issues (classified)

| Issue | Classification | Why it still matters | Exact next action | Who |
|-------|----------------|----------------------|-------------------|-----|
| Exclusive copyright in first-party source (web, API, `android/`, Capacitor iOS, `lib/` non-generated, `content-engine/` code, `scripts/`, `infra/`) is unproven | **COUNSEL ACTION** | Buyer cannot be warranted exclusive owner from git or Cursor billing | Counsel memo answering questions A–J in `SOURCE_TITLE_COUNSEL_WARRANT_CARVEOUT_DRAFT.md`; then SPA warranty **or** express carve-out | COUNSEL → SELLER signs |
| Founder source-code statement unsigned; “[TO BE CONFIRMED]” boxes open | **OWNER ACTION** | Counsel cannot finish the memo without a signed factual statement | Fill and **sign** `FOUNDER_SOURCE_CODE_STATEMENT_DRAFT.md` (capacity = proprietor of AmyWorld; contractors none **or** attach agreements) | SELLER |
| MIT field vs no LICENSE vs © footer | **COUNSEL ACTION** | Public-repo MIT metadata vs “all rights reserved” is a warranty issue | Address in SPA disclosures; **do not** add LICENSE or delete MIT field without counsel writing | COUNSEL |
| Replit scaffold residual (`90c25805c` / author `agent`) | **COUNSEL ACTION** | Scaffold may carry third-party/template rights | Disclose in SPA; carve if counsel requires | COUNSEL |
| Cursor Agent / `cursor[bot]` / `APPLE` / CI commits | **COUNSEL ACTION** | Tool-generated text is not automatically AmyWorld copyright | Authorship warranty + AI-assisted disclosure in SPA | COUNSEL |
| No employee/contractor IP assignments found | **OWNER ACTION** then **COUNSEL ACTION** | Missing agreements cannot be invented | Written “none exist” on the founder statement **or** produce any that exist | SELLER then COUNSEL |
| npm / Gradle / CocoaPods / Capacitor pods | **NOT MATERIAL** to exclusive-title of first-party code | Licensed in, not assigned | Buyer takes license obligations (SBOM); no assignment of vendor code | COUNSEL notes only |
| OpenAPI generated clients (`lib/*/generated/`) | **COUNSEL ACTION** (disclosure only) | Generated from first-party spec | Schedule as generated; same title as spec if counsel agrees | COUNSEL |
| `artifacts/kidschedule/public/`, `attached_assets/`, screenshots, content-bank binaries | **OWNER ACTION** + **COUNSEL ACTION** | Presence in repo ≠ copyright | See content/media section of remaining-blockers; prefix/provenance note | SELLER + COUNSEL |
| GCS `amynest-audio-storage` objects | **OWNER ACTION** + **COUNSEL ACTION** | Bucket name known; objects/IAM/title unknown | Prefix list (no bulk download); counsel owned vs generated vs third-party | SELLER + COUNSEL |
| JPL / ephemeris third-party data | **COUNSEL ACTION** | `artifacts/ephemeris-daemon` license **UNKNOWN** | Carve or confirm license | COUNSEL |
| User/child personal data in production DB | **COUNSEL ACTION** | DPDP/assignability unreviewed | Opinion: sell vs delete vs consent | COUNSEL |
| Patent 202611059355 | **NOT MATERIAL** to **source** title | Separate INCLUDE stream | Personal assignment + IPO — not this report | SELLER + COUNSEL |
| GitHub possession by `ankur6779` | **NOT MATERIAL** as title proof | Control ≠ copyright | Repo transfer is SB-B01 (buyer/vendor) | — |
| Android/iOS **store** accounts | **NOT MATERIAL** to source title | Different assets | Closing vendor transfers; not this report | — |

No row is **CLOSED** as legal title. Closable **process** items: signed founder statement (OWNER); counsel memo (COUNSEL).

## Minimum evidence pack still required (nothing else)

1. **Signed** founder source-code statement (facts only).  
2. Counsel memo: warrant exclusive first-party title **or** listed carve-outs (MIT/©, Replit, AI-assisted, media/GCS unknown, OSS obligations).  
3. Those carve-outs copied into the executed SPA / assignment schedules.

Until (2) exists, SB-A01 remains **LEGAL REQUIRED**. Do not edit `package.json` license, add LICENSE, or change © footers.
