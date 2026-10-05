# OWNER ACTION REQUIRED

**Date:** 24 September 2026 (owner-closure pass)  
**Not execution. Documentation ≠ closed.** Deduplicated.  
Dashboard: `TRANSFER/OWNER_CLOSURE_DASHBOARD.md`.

---

### CAN DO NOW

Owner can collect these without buyer, vendor, legal execution, or production change. **None are complete.**

| ACTION | WHY | EVIDENCE REQUIRED | STATUS | NEXT STEP |
|--------|-----|-------------------|--------|-----------|
| Capture domain registrar / DNS screenshots | Registrar of `amynest.in` is UNKNOWN | Offline pack per `TRANSFER/DOMAIN_OWNERSHIP_EVIDENCE_CHECKLIST.md` (no auth-code in git) | OPEN | Owner exports registrar + NS screenshots |
| Capture Play + ASC enrollment screenshots | AMYWORLD enrollment is SELLER-STATED only | `TRANSFER/STORE_ACCOUNT_EVIDENCE_CHECKLIST.md` | OPEN | Owner screenshots legal name, IDs, eligibility screens |
| Capture Coolify / Hetzner / CF / GCP / Firebase login screenshots | Account titles UNKNOWN | `TRANSFER/INFRASTRUCTURE_OWNER_EVIDENCE_CHECKLIST.md` | OPEN | Owner screenshots email + linkage fields only |
| Identify production DB host + Redis host | Hosts UNKNOWN; dump blocked until known | Hostname only; never full URL in git | OPEN | Owner reads Coolify/panel; records hostnames offline |
| Confirm live vs unused services | Sentry, Slack, KIE, YouTube, ElevenLabs, Render leftover | Tick `TRANSFER/SERVICE_USAGE_CONFIRMATION.md` from consoles | OPEN | Owner confirms; **do not delete** |
| Fill owner emails / account titles in `TRANSFER/ACCOUNT_TRANSFER_MATRIX.md` | Matrix still AWAITING OWNER | Offline redacted copy or data-room note | OPEN | Owner fills names/emails, not secrets |
| Optional Razorpay export | Unused is seller statement only | Zero-txn export **or** keep statement | OPEN | Owner exports if proving unused |
| Remaining finance CSVs (Sep Play; ASC window) | Recon still partial | Play Sep when Google generates; any missing ASC | OPEN | Owner downloads when available |
| COGS invoices (90 days) if missing | Unit economics incomplete | PDFs offline | OPEN | Owner files invoices in data room |
| Confirm `demo@amynest.in` production admin policy | Admin surface risk | Written policy (keep / rotate / disable) | OPEN | Owner writes policy; no prod change this pass |

---

### PREPARE NOW

Procedures exist. Execution is owner-offline or later close. **Not performed.**

| ACTION | WHY | EVIDENCE REQUIRED | STATUS | NEXT STEP |
|--------|-----|-------------------|--------|-----------|
| Run secret escrow ceremony | ALL production secrets NOT ESCROWED | Encrypted archive **outside Git**; identifier only in data room | NOT ESCROWED — PROCEDURE READY | `TRANSFER/SECRET_ESCROW_CEREMONY.md` |
| Escrow Android upload keystore | Signed AAB / Play continuity | Encrypted keystore; no passwords in git | NOT ESCROWED | `TRANSFER/ANDROID_KEY_ESCROW_CHECKLIST.md` |
| Escrow iOS certs / profiles / APNs | Signed IPA / push | Encrypted exports | NOT ESCROWED | `TRANSFER/IOS_SIGNING_ESCROW_CHECKLIST.md` |
| Encrypted production DB dump + scratch restore | Backup FAIL; host UNKNOWN | Dump + checksum + restore log (scratch only) | DATABASE HOST UNKNOWN; BACKUP NOT CREATED; RESTORE NOT VERIFIED | `TRANSFER/DATABASE_OWNER_PREPARATION.md` after host known |
| GCS prefix inventory (`amynest-audio-storage`) | Objects unlisted; title UNKNOWN | Prefix list screenshot; no bulk download | OPEN | `TRANSFER/GCS_CONTENT_OWNER_CHECKLIST.md` |
| Collect source-title evidence pack | Legal title UNKNOWN | Agreements if any; founder statement; counsel review | OPEN | `IP/SOURCE_TITLE_OWNER_ACTION_PACKAGE.md` — do not invent agreements |
| Branch-protection note already filed | Main unprotected | Enabling protection is a later owner GitHub action | PREPARABLE (docs) | Do not enable in this pass unless owner chooses |

---

### OWNER DECISION

Unchecked. Do not elect for the owner.

| ACTION | WHY | EVIDENCE REQUIRED | STATUS | NEXT STEP |
|--------|-----|-------------------|--------|-----------|
| Sign Path A transaction structure | Election done: AmyWorld sole prop | **SIGNED / FINAL TRANSACTION STRUCTURE** | PATH A **OWNER-CONFIRMED**; instrument **OPEN** | Counsel + owner sign; schedule domain/CF/patent as Ankur personal |
| Execute patent assignment + IPO recordal | Scope **INCLUDE**; transfer outstanding | Executed assignment + IPO evidence | INCLUDE locked; assignment **NO** | Counsel; buyer named; do not file this pass |
| Ads keep vs pause campaign `23986249354` | Spend / handover timing | Written decision | OPEN | `ROUND4_ADS_OWNER_DECISION.md` — **do not change Ads** |
| Form 9 publication (optional) | Not a transfer | Portal receipt if filed | OPEN | Owner/counsel only if publication desired |

---

### LEGAL

| ACTION | WHY | EVIDENCE REQUIRED | STATUS | NEXT STEP |
|--------|-----|-------------------|--------|-----------|
| Counsel opinion on source-code title | Title UNKNOWN | Written opinion | OPEN | Counsel; do not add LICENSE / remove MIT |
| Counsel on MIT field vs no LICENSE vs © footer | Conflicted public signals | Same opinion | OPEN | `IP/SOURCE_TITLE_AND_LICENSE_ISSUE.md` |
| Draft/execute assignment + bill of sale | No executed transfer instrument | Signed documents | DRAFT ONLY / NOT EXECUTED | Counsel; drafts exist as drafts only |
| Patent IPO assignment / prosecution transfer | Required **only if INCLUDE** | IPO-effective assignment | NOT STARTED | After INCLUDE election |
| Path B inbound Ankur → AMYWORLD assignment | **Not selected** (Path A locked) | — | N/A | Do not execute unless election reversed |
| Child-data transfer opinion | Personal data in sale | Counsel memo | OPEN | Counsel |
| Content / GCS copyright opinion | Media title UNKNOWN | Counsel + inventory | OPEN | After GCS list |

---

### BUYER REQUIRED

| ACTION | WHY | EVIDENCE REQUIRED | STATUS | NEXT STEP |
|--------|-----|-------------------|--------|-----------|
| Buyer GitHub org + accept repo transfer | Founder is sole admin `ankur6779` | Buyer org exists; transfer accepted | BLOCKED | Buyer creates org |
| Buyer Play + Apple Developer accounts | Store transfers | Enrolled buyer accounts | BLOCKED | Buyer enrolls |
| Buyer GCP / Cloudflare / RevenueCat / Ads / mailbox | Operate after close | Buyer logins | BLOCKED | Buyer creates |
| Buyer accepts every vendor transfer | Vendors will not move without dest | Accept emails | BLOCKED | After owner initiates (later) |
| Scratch restore + smokes on buyer infra | Independence test | Restore log | BLOCKED | After dump exists |
| Buyer signed AAB / IPA | Signing independence | Artifacts | BLOCKED | After escrow or new keys |
| Buyer new AI keys + TOS | Vendor TOS / child policy | New keys on buyer org | BLOCKED | Buyer |

---

### VENDOR REQUIRED

| ACTION | WHY | EVIDENCE REQUIRED | STATUS | NEXT STEP |
|--------|-----|-------------------|--------|-----------|
| GitHub repository transfer | Personal repo | GitHub transfer complete | NOT STARTED | Owner+buyer+GitHub later |
| Google Play app transfer | `com.amynest.app` | Play transfer complete | NOT STARTED | After enrollment evidence |
| Apple app transfer | `6767664343` | ASC transfer complete | NOT STARTED | After eligibility evidence |
| Cloudflare zone / Pages transfer | Live edge | CF transfer | NOT STARTED | After account title known |
| GCP / Firebase / GCS project move | Media + auth | GCP move | NOT STARTED | After title known |
| Hetzner project / server move | Worker | Hetzner transfer | NOT STARTED | After live IP known |
| RevenueCat collaborator / org | Billing operate | Invite accepted | NOT STARTED | Owner invites later |
| Google Ads MCC / admin | Campaign `23986249354` | Buyer admin | NOT STARTED | Do not edit campaign now |
| `.in` domain transfer | Site identity | Registrar transfer | NOT STARTED | After registrar known |

---

### PRODUCTION REQUIRED

Do **not** do these in this pass.

| ACTION | WHY | EVIDENCE REQUIRED | STATUS | NEXT STEP |
|--------|-----|-------------------|--------|-----------|
| Deploy repo legal / patent-pending live copy | Live pages may lag repo | Production deploy of agreed copy | NOT STARTED | Owner authorize later (`ROUND4_LIVE_COPY_DEPLOYMENT_PLAN.md`) |
| Rewrite live legal pages to buyer | Post-close identity | Deploy | NOT STARTED | After close |
| Rotate all production secrets | Founder-held keys | Rotation log | NOT STARTED | After G1–G16 |
| Revoke founder access | Independence | Access removed | NOT STARTED | After buyer confirmed |
| Enable GitHub branch protection | Main unprotected | Settings screenshot | NOT STARTED | Owner later |
| Change Google Ads | Spend control | Ads UI | NOT STARTED | After keep/pause decision |
| DNS / nameserver changes | Domain move | Registrar/CF | NOT STARTED | After registrar known |
| Revoke `RENDER_API_KEY` if unused | Leftover | Confirm unused first | NOT STARTED | After service confirmation |

---

### UNKNOWN

Facts still missing. Checklists prepared; no new evidence this pass.

| ACTION | WHY | EVIDENCE REQUIRED | STATUS | NEXT STEP |
|--------|-----|-------------------|--------|-----------|
| Source-code legal title | Hard-cap issue | Counsel + agreements if any | UNKNOWN | Evidence pack |
| Domain registrant / registrar | Cannot transfer blind | Registrar screenshots | UNKNOWN | Domain checklist |
| Play / ASC legal entity (console) | AMYWORLD unproven | Store screenshots | SELLER-STATED / EVIDENCE PENDING | Store checklist |
| Coolify / Hetzner / CF / GCP / Firebase account title | Cannot assign accounts | Infra screenshots | UNKNOWN | Infra checklist |
| Current live Hetzner IP | Two IPs documented | Console IP = worker in use | UNKNOWN | Infra checklist |
| Production DATABASE_URL host | Dump blocked | Hostname | UNKNOWN | DB prep |
| Redis host | Queue handover | Hostname | UNKNOWN | DB prep |
| Coolify git deploy method | Deploy handover | Settings screenshot | UNKNOWN | Infra checklist |
| Where Vite / GA4 secrets live | Not on `gh secret list` | Owner locates store | UNKNOWN | Infra / CI note |
| `support@` mailbox provider | Email handover | MX + inbox screenshot | UNKNOWN | Domain checklist |
| Sentry / Slack / KIE / YouTube / ElevenLabs live | Surprise bills / silent deps | Console confirm | LIVE USE UNKNOWN | Service confirmation |
| GCS object inventory + media title | Content schedule | Prefix list + counsel | UNKNOWN | GCS checklist |
| Birth Sky key location | Feature decrypt | Confirm if set in prod | UNKNOWN | Escrow if required |
