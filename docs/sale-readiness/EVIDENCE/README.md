# EVIDENCE DIRECTORY

**Date:** 24 September 2026  
Put **identifiers, checksums, redacted screenshots, attestations** here.  
**Never** put passwords, private keys, API secrets, keystores, `.p12`, `.p8`, SA JSON, `.env`, auth/EPP codes, seed phrases, or full `DATABASE_URL` in Git.

Folders are placeholders until you add files. Empty folder ≠ closed blocker.

| Folder | Acceptable evidence | NOT sufficient | Secrets in this folder? |
|--------|---------------------|----------------|-------------------------|
| `01-LEGAL/` | Signed Path A/B structure; founder title statement; counsel memo; executed assignment/bill of sale; patent INCLUDE/EXCLUDE signed page; “no contractor agreements” attestation | Unsigned drafts in `docs/sale-readiness/IP/`; this README | No |
| `02-OWNERSHIP/` | GitHub collaborator screenshot; account-email list (no passwords) | “I own GitHub” without screenshot | No |
| `03-ESCROW/` | Escrow ID, date, SHA-256 of **ciphertext**, storage label | Claiming escrow because a ceremony doc exists | **No secret values** |
| `04-DATABASE/` | Hostname only; dump SHA-256; restore log | Full URL; dump file; invented host | **No URL / dump file** |
| `05-ANDROID/` | Keystore ciphertext SHA-256; alias name; Play App Signing screenshot (no keys) | Keystore file; passwords | **No** |
| `06-IOS/` | Cert ciphertext SHA-256; Team ID; “APNs not found” note | `.p12` / `.p8` bytes | **No** |
| `07-DOMAIN/` | Registrar, registrant, renewal, lock, NS screenshots | Auth-code value; DNS change | **No auth-code** |
| `08-CLOUD/` | Coolify/Hetzner/CF/GCP/Firebase login + project/zone screenshots | API tokens; SA JSON | **No** |
| `09-PLAY/` | Legal name, account ID, app, eligibility, App Signing screenshots | Transfer-complete claim without vendor notice | **No** |
| `10-APPLE/` | Entity, Team ID, Account Holder, app, eligibility screenshots | Same | **No** |
| `11-REVENUECAT/` | Org/project screenshot | Secret API key | **No** |
| `12-DEPLOY/` | Coolify git-method screenshot | Green buyer deploy (that goes in `13-BUYER/`) | **No** |
| `13-BUYER/` | Buyer org accepts; buyer Owner; webhook 2xx; buyer AAB/IPA hashes | Founder still sole admin | **No** |
| `14-FOUNDER-EXIT/` | Dated founder-exit re-run showing PASS | This folder existing | **No** |

## Account evidence — four states (do not collapse)

Use this for GitHub, Play, App Store Connect, RevenueCat, Cloudflare, GCP/Firebase/GCS, Hetzner, Coolify, domain registrar, email:

| State | Meaning | Today (authoritative) |
|-------|---------|------------------------|
| **CONTROL TODAY** | You can log in | INFERRED for founder-operated tools; prove with screenshot |
| **LEGAL ACCOUNT TITLE** | Legal name on the account | UNKNOWN except Play/ASC **SELLER-STATED** AMYWORLD |
| **TRANSFER ELIGIBILITY** | Vendor will allow a transfer | UNKNOWN — screenshot the screen if shown |
| **TRANSFER COMPLETED** | Vendor finished move to buyer | **None** |

Control today ≠ title ≠ eligibility ≠ completed.

## Source-title evidence request (SB-A01)

Do **not** treat as title: GitHub ownership, `package.json` `"license": "MIT"`, Ankur authorship, AmyWorld, or AmyNest.

Collect if they exist (do not invent):

- [ ] Git log / contributor export (`ankur6779`, Cursor Agent, Replit Agent, CI)
- [ ] Note: MIT field since Replit scaffold `90c25805c`; **no** LICENSE file; footer “© 2026 AmyNest AI. All rights reserved.”
- [ ] Employment / contractor / contributor / agency agreements **if any** — or written “none”
- [ ] Third-party / generated-code list (OpenAPI clients, vendor SDKs) — SBOM is dependency list only
- [ ] Founder ownership **statement** (attestation, not proof by itself)
- [ ] Counsel memo: warrant exclusive title **or** carve-out

Final legal title conclusion = counsel + founder supported. Not this folder existing.
