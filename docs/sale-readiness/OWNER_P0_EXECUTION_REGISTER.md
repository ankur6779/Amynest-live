# OWNER P0 EXECUTION REGISTER

**Date:** 24 September 2026  
**Not a rescore.** Score **55/100**. Cap **69**. Independence **FAIL**.  
Source: `FINAL_SALE_BLOCKER_REGISTER.md` (15 P0s; SB-P01 is aggregate — not a separate row).

Closure statuses only: **OPEN** · **IN PROGRESS** · **READY TO CLOSE** · **CLOSED** · **BLOCKED**  
**CLOSED** requires independently verifiable evidence. Checklists are not evidence.

---

### SB-C01 — Path A elected; signed structure missing
- **Issue:** Commercial seller is AmyWorld (sole prop of Ankur). Instrument not signed.
- **Current status (register):** OWNER-CONFIRMED election; **OPEN** instrument
- **Why it matters:** No executable SPA without a signed structure that also schedules personal assets (domain, CF, patent).
- **Exact owner action:** Counsel drafts **SIGNED / FINAL TRANSACTION STRUCTURE** naming AmyWorld sole prop. Schedule Ankur-held domain, Cloudflare, patent.
- **Exact evidence required:** Signed structure PDF.
- **Evidence location:** `EVIDENCE/01-LEGAL/`
- **Who:** OWNER + LEGAL
- **Can owner perform before buyer?** PARTIAL (election done; signing LEGAL)
- **Dependency:** Election done. Gates SB-A02. Path B inbound **not** required.
- **Closure test:** Signed structure exists. Election alone is **not** CLOSED.
- **Current closure status:** **OPEN**

### SB-A01 — Source-code legal title UNKNOWN
- **Issue:** No proven exclusive copyright in first-party code.
- **Current status:** LEGAL REQUIRED / UNKNOWN
- **Why it matters:** Buyer cannot take **legal** control of the repo.
- **Exact owner action:** Collect the evidence request in `EVIDENCE/01-LEGAL/` (do **not** invent agreements). Brief counsel. Do **not** add LICENSE, remove MIT, or change ©.
- **Exact evidence required:** Founder statement + git/contributor export + Replit/Cursor note + agreements **if they exist** + counsel memo that warrants **or** carves title.
- **Evidence location:** `EVIDENCE/01-LEGAL/`
- **Who:** OWNER then LEGAL
- **Can owner perform before buyer?** PARTIAL (collection YES; title conclusion LEGAL)
- **Dependency:** None to collect. SB-A02 needs this or an express carve-out.
- **Closure test:** Counsel warrants title or SPA carves it. GitHub login ≠ title. MIT field ≠ title. AmyWorld/AmyNest ≠ owner.
- **Current closure status:** **OPEN**

### SB-A02 — Assignment / bill of sale NOT EXECUTED
- **Issue:** Drafts only; no signatures.
- **Current status:** LEGAL REQUIRED
- **Why it matters:** Nothing transfers the business.
- **Exact owner action:** After Path A/B + title position, sign counsel instruments. Buyer counter-signs.
- **Exact evidence required:** Executed assignment + bill of sale naming assets A–E.
- **Evidence location:** `EVIDENCE/01-LEGAL/` (signed PDFs). Drafts in `IP/` are **not** enough.
- **Who:** OWNER + LEGAL + BUYER (counter-sign)
- **Can owner perform before buyer?** PARTIAL (owner can sign; close needs buyer)
- **Dependency:** SB-C01 elected; SB-A01 position; Path B inbound **if** Path B.
- **Closure test:** Wet/e-signed instruments exist.
- **Current closure status:** **OPEN**

### SB-E01 — Production secrets NOT ESCROWED
- **Issue:** No encrypted archive identifier in the data room.
- **Current status:** OWNER ACTION REQUIRED
- **Why it matters:** Buyer cannot authenticate to production.
- **Exact owner action:** Follow `TRANSFER/OWNER_ESCROW_EXECUTION.md`. Inventory categories. Encrypt **offline**. Record identifier + SHA-256 of the **ciphertext** only.
- **Exact evidence required:** Escrow ID + SHA-256 + date + storage location **label** (not the archive).
- **Evidence location:** `EVIDENCE/03-ESCROW/escrow-identifier.md` (git). Archive **outside Git**.
- **Who:** OWNER (handover: BUYER under SPA)
- **Can owner perform before buyer?** YES
- **Dependency:** None. Include Birth Sky if set (SB-E02).
- **Closure test:** Identifier on file **and** owner can decrypt offline. Buyer test is later.
- **Current closure status:** **OPEN**

### SB-H01 — Android upload keystore NOT ESCROWED
- **Issue:** Keystore not in git (correct) and not escrowed.
- **Current status:** OWNER ACTION REQUIRED
- **Why it matters:** Buyer cannot ship Play updates.
- **Exact owner action:** Encrypt `.jks`/`.keystore` + passwords **offline**. Do not paste into chat or git.
- **Exact evidence required:** Ciphertext SHA-256 + alias **name** + package `com.amynest.app`. No passwords in git.
- **Evidence location:** `EVIDENCE/05-ANDROID/` (checksum/attestation). Keystore **outside Git**.
- **Who:** OWNER (buyer signs AAB later)
- **Can owner perform before buyer?** YES (escrow). Full store control: PARTIAL.
- **Dependency:** None for escrow. Play transfer is SB-H02.
- **Closure test (this P0):** Encrypted keystore exists; SHA-256 recorded. Buyer `bundleRelease` is Phase 4.
- **Current closure status:** **OPEN**

### SB-I01 — iOS signing / APNs NOT ESCROWED
- **Issue:** Certs/profiles not in git and not escrowed. APNs file UNKNOWN.
- **Current status:** OWNER ACTION REQUIRED
- **Why it matters:** Buyer cannot ship App Store / TestFlight.
- **Exact owner action:** Encrypt distribution cert + profiles + APNs `.p8` if it exists. Confirm unused if no `.p8`.
- **Exact evidence required:** Ciphertext SHA-256 + bundle `com.amynest.app` + Team ID **when known**. No `.p12`/`.p8` in git.
- **Evidence location:** `EVIDENCE/06-IOS/` (checksum). Materials **outside Git**.
- **Who:** OWNER
- **Can owner perform before buyer?** YES (escrow)
- **Dependency:** None for escrow. ASC transfer is SB-I02.
- **Closure test (this P0):** Encrypted materials exist; SHA-256 recorded.
- **Current closure status:** **OPEN**

### SB-G01 — Production DB host UNKNOWN
- **Issue:** No hostname in the data room.
- **Current status:** UNKNOWN
- **Why it matters:** Dump and handover cannot start.
- **Exact owner action:** Open Coolify/DB panel. Write **hostname only** (no user/password/URL).
- **Exact evidence required:** Hostname string + screenshot of host field (redact password).
- **Evidence location:** `EVIDENCE/04-DATABASE/hostname.txt` (hostname only)
- **Who:** OWNER
- **Can owner perform before buyer?** YES
- **Dependency:** None. Blocks SB-G02.
- **Closure test:** Hostname on file; not a full `DATABASE_URL`.
- **Current closure status:** **OPEN**

### SB-G02 — Encrypted dump NOT CREATED; restore NOT VERIFIED
- **Issue:** No dump, no checksum, no scratch restore.
- **Current status:** OWNER ACTION REQUIRED
- **Why it matters:** Data plane unrecoverable if founder access ends.
- **Exact owner action:** `TRANSFER/OWNER_DB_CLOSURE_RUNBOOK.md` after SB-G01.
- **Exact evidence required:** Encrypted dump **outside Git** + SHA-256 + scratch restore log (schema + R/W).
- **Evidence location:** `EVIDENCE/04-DATABASE/` (checksum + log). Dump **outside Git**.
- **Who:** OWNER (buyer restore on buyer infra is extra)
- **Can owner perform before buyer?** YES (owner scratch)
- **Dependency:** SB-G01
- **Closure test:** Scratch R/W smoke recorded.
- **Current closure status:** **OPEN**

### SB-F01 — Cloud titles mixed; evidence pending
- **Issue:** Hetzner **AmyWorld** (owner-confirmed). Cloudflare **Ankur personally** (owner-confirmed). Coolify/GCP/Firebase still unknown.
- **Current status:** OWNER-CONFIRMED / EVIDENCE PENDING (Hetzner, CF); UNKNOWN (others)
- **Why it matters:** Cannot invite or transfer production. CF must not be scheduled as AmyWorld.
- **Exact owner action:** Screenshot Hetzner entity/billing/live IP; CF identity; Coolify/GCP/Firebase. No tokens.
- **Exact evidence required:** One screenshot set per provider (`EVIDENCE/08-CLOUD/`).
- **Evidence location:** `EVIDENCE/08-CLOUD/`
- **Who:** OWNER (transfer: VENDOR + BUYER later)
- **Can owner perform before buyer?** YES (evidence). Transfer: NO.
- **Dependency:** None for screenshots. Transfer needs buyer.
- **Closure test (owner half):** Documentary titles. Full P0 close = buyer admin.
- **Current closure status:** **OPEN**

### SB-J01 — Domain Ankur personally; evidence pending
- **Issue:** Owner-confirmed holder is Ankur Raman. Registrar pack missing. **Not AmyWorld.**
- **Current status:** OWNER-CONFIRMED / EVIDENCE PENDING
- **Why it matters:** Buyer cannot take the live hostname without proof + transfer.
- **Exact owner action:** Registrar screenshots: account, registrant, renewal, lock, NS, eligibility. **Do not** put auth-code in git. Do not change DNS.
- **Exact evidence required:** Screenshot pack. Auth-code existence noted as yes/no only.
- **Evidence location:** `EVIDENCE/07-DOMAIN/`
- **Who:** OWNER (transfer: VENDOR + BUYER)
- **Can owner perform before buyer?** YES (evidence). Transfer: NO.
- **Dependency:** Schedule as Ankur personal asset on Path A SPA.
- **Closure test (owner half):** Registrar + registrant match Ankur (or mismatch disclosed). Full close = buyer zone control.
- **Current closure status:** **OPEN**

### SB-H02 — Play transfer eligibility UNKNOWN
- **Issue:** Package VERIFIED; eligibility UNKNOWN; AMYWORLD SELLER-STATED.
- **Current status:** UNKNOWN
- **Why it matters:** Android listing may be untransferable.
- **Exact owner action:** Screenshot developer legal name, account ID, app `com.amynest.app`, Play App Signing page, transfer-eligibility screen **if shown**. Do **not** start transfer.
- **Exact evidence required:** Those screenshots. Eligibility ≠ transfer completed.
- **Evidence location:** `EVIDENCE/09-PLAY/`
- **Who:** OWNER then VENDOR + BUYER
- **Can owner perform before buyer?** PARTIAL (screenshots YES; transfer NO)
- **Dependency:** Align legal name with Path A/B (disclose mismatch).
- **Closure test (owner half):** Eligibility captured or vendor refuse recorded. Full close = buyer is Play owner.
- **Current closure status:** **OPEN**

### SB-I02 — Apple transfer eligibility UNKNOWN
- **Issue:** App ID VERIFIED; eligibility UNKNOWN; AMYWORLD SELLER-STATED.
- **Current status:** UNKNOWN
- **Why it matters:** iOS listing may be untransferable.
- **Exact owner action:** Screenshot legal entity, Team ID, Account Holder, app `6767664343`, transfer eligibility **if shown**. Do **not** start transfer.
- **Exact evidence required:** Those screenshots.
- **Evidence location:** `EVIDENCE/10-APPLE/`
- **Who:** OWNER then VENDOR + BUYER
- **Can owner perform before buyer?** PARTIAL
- **Dependency:** Align with Path A/B (disclose mismatch).
- **Closure test (owner half):** Eligibility captured or refuse recorded. Full close = buyer is ASC owner.
- **Current closure status:** **OPEN**

### SB-B01 — GitHub sole admin `ankur6779`
- **Issue:** Public personal repo; buyer is not Owner.
- **Current status:** BUYER + VENDOR
- **Why it matters:** Buyer cannot control source.
- **Exact owner action now:** Screenshot Settings → Collaborators (only you). Do **not** transfer yet. Do **not** delete repo.
- **Exact evidence required now:** Collaborator screenshot. Close: buyer Owner after GitHub transfer.
- **Evidence location:** `EVIDENCE/02-OWNERSHIP/` then `EVIDENCE/13-BUYER/`
- **Who:** OWNER (prep) + BUYER + VENDOR
- **Can owner perform before buyer?** PARTIAL
- **Dependency:** Buyer org. Title via SB-A01/A02.
- **Closure test:** Buyer push/workflow without `ankur6779`.
- **Current closure status:** **BLOCKED** (buyer org)

### SB-F02 — Deploy plane founder-dependent
- **Issue:** Actions secrets + Coolify hook + CF/Hetzner keys on founder; workflow hard-codes `ankur6779/Amynest-live`.
- **Current status:** BLOCKED
- **Why it matters:** Buyer cannot ship web/API/worker.
- **Exact owner action now:** Screenshot Coolify git source method (App / webhook / poll). Do not rotate tokens. Do not deploy.
- **Exact evidence required now:** Method screenshot. Close: green Actions on **buyer** secrets + Coolify from buyer push.
- **Evidence location:** `EVIDENCE/12-DEPLOY/`
- **Who:** OWNER (disclose) + BUYER + VENDOR
- **Can owner perform before buyer?** PARTIAL
- **Dependency:** SB-B01, SB-E01, SB-F01
- **Closure test:** Buyer deploys Pages + Worker + API.
- **Current closure status:** **BLOCKED**

### SB-L01 — RevenueCat / billing founder-dependent
- **Issue:** RC org title UNKNOWN; webhook on founder Coolify.
- **Current status:** OWNER + BUYER
- **Why it matters:** Buyer cannot operate paid entitlements.
- **Exact owner action now:** Screenshot RC project/org (no secret keys). Do not invite until buyer exists. Do not change products.
- **Exact evidence required now:** Org/project screenshot. Close: buyer admin + webhook 2xx + buyer edits offering.
- **Evidence location:** `EVIDENCE/11-REVENUECAT/`
- **Who:** OWNER then BUYER + VENDOR
- **Can owner perform before buyer?** PARTIAL
- **Dependency:** Buyer RC account. Store consoles need SB-H02/I02.
- **Closure test:** Buyer edits offering; webhook 2xx.
- **Current closure status:** **OPEN** (evidence) / full close **BLOCKED**

---

**P0 CLOSED = 0.** No escrow ID, hostname, signed structure, or transfer evidence exists in the data room.
