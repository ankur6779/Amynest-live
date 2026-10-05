# OWNER CLOSURE DASHBOARD

**Date:** 24 September 2026  
**Score not recalculated.** Buyer independence remains **FAIL**.  
Master list: `../OWNER_ACTION_REQUIRED.md`.

Allowed statuses: **OPEN** · **READY TO EXECUTE** · **OWNER INPUT NEEDED** · **BUYER REQUIRED** · **VENDOR REQUIRED** · **LEGAL REQUIRED** · **PRODUCTION REQUIRED** · **UNKNOWN**

`READY TO EXECUTE` is reserved for an action whose **procedure is ready and the owner may perform it offline now** without buyer/vendor/legal/production change. It does **not** mean the underlying issue is closed.

## Working matrix (A–H)

A = CAN COMPLETE NOW (owner, safe, no third party)  
B = CAN PREPARE NOW — EXECUTION LATER  
C = OWNER INPUT REQUIRED  
D = BUYER REQUIRED  
E = VENDOR REQUIRED  
F = LEGAL REQUIRED  
G = PRODUCTION CHANGE REQUIRED  
H = UNKNOWN

| OWNER ACTION | Cat | CAN SAFELY COMPLETE NOW? | OWNER INPUT? | BUYER? | VENDOR? | LEGAL? | EVIDENCE REQUIRED | CURRENT STATUS | NEXT ACTION |
|--------------|-----|--------------------------|--------------|--------|---------|--------|-------------------|----------------|-------------|
| Domain registrar screenshots | A | Yes (screenshots) | Yes | No | No | No | Registrar pack | **OWNER INPUT NEEDED** | `DOMAIN_OWNERSHIP_EVIDENCE_CHECKLIST.md` |
| Play + ASC enrollment screenshots | A | Yes (screenshots) | Yes | No | No | No | Console pack | **OWNER INPUT NEEDED** | `STORE_ACCOUNT_EVIDENCE_CHECKLIST.md` |
| Cloud account title screenshots | A | Yes (screenshots) | Yes | No | No | No | Login + linkage | **OWNER INPUT NEEDED** | `INFRASTRUCTURE_OWNER_EVIDENCE_CHECKLIST.md` |
| Identify DB + Redis hosts | A | Yes (hostnames only) | Yes | No | No | No | Hostnames offline | **UNKNOWN** | Coolify/panel |
| Confirm unused services | A | Yes (look, don’t delete) | Yes | No | No | No | Ticks on confirmation | **OWNER INPUT NEEDED** | `SERVICE_USAGE_CONFIRMATION.md` |
| Fill account-matrix emails | A | Yes | Yes | No | No | No | Emails, not secrets | **OWNER INPUT NEEDED** | `ACCOUNT_TRANSFER_MATRIX.md` |
| Optional Razorpay / finance / COGS / demo@ policy | A | Yes if owner has files | Yes | No | No | No | Exports / invoices / note | **OPEN** | Owner files |
| Secret escrow ceremony | B | Procedure yes; values no | Yes | Receive later | No | Terms later | Encrypted archive ID | **READY TO EXECUTE** (procedure) | `SECRET_ESCROW_CEREMONY.md` |
| Android keystore escrow | B | Procedure yes | Yes | Verify later | No | No | Encrypted keystore | **READY TO EXECUTE** (procedure) | `ANDROID_KEY_ESCROW_CHECKLIST.md` |
| iOS signing escrow | B | Procedure yes | Yes | Verify later | No | No | Encrypted certs | **READY TO EXECUTE** (procedure) | `IOS_SIGNING_ESCROW_CHECKLIST.md` |
| Encrypted DB dump + scratch restore | B | After host known | Yes | Restore later | No | No | Dump + checksum + log | **UNKNOWN** (host) | `DATABASE_OWNER_PREPARATION.md` |
| GCS prefix inventory | B | List only; no migrate | Yes | No | No | Title later | Prefix screenshots | **OPEN** | `GCS_CONTENT_OWNER_CHECKLIST.md` |
| Source-title evidence collection | B | Collect if exists | Yes | No | No | Review | Agreements if any | **LEGAL REQUIRED** | `SOURCE_TITLE_OWNER_ACTION_PACKAGE.md` |
| Path A elected; sign structure | C | Instrument only | Yes | Counter-sign | No | Yes | Signed structure | **OPEN** (not CLOSED) | `IP/SELLER_STRUCTURE_DECISION.md` |
| INCLUDE / EXCLUDE patent | C | Decision only | Yes | No | No | Include needs legal | Checked box | **OWNER INPUT NEEDED** | `IP/PATENT_OWNER_DECISION.md` |
| Ads keep / pause decision | C | Decision only | Yes | Later if transfer | No | No | Written choice | **OWNER INPUT NEEDED** | Do not edit campaign |
| Optional Form 9 | C | Owner/counsel | Yes | No | IPO | Yes | Receipt | **OPEN** | Not a transfer |
| Source title + MIT/© opinion | F | No | Counsel | No | No | Yes | Opinion | **LEGAL REQUIRED** | Do not edit LICENSE/MIT/footer |
| Assignment / bill of sale execution | F | No | Sign | Buyer signs | No | Yes | Executed docs | **LEGAL REQUIRED** | Drafts only |
| Patent IPO assignment | F | No — only if INCLUDE | Sign | Assignee | IPO | Yes | IPO record | **LEGAL REQUIRED** | After INCLUDE |
| Path B inbound assignment | F | No — only if Path B | Sign | No | No | Yes | Executed inbound | **LEGAL REQUIRED** | After Path B |
| Child-data sale opinion | F | No | Counsel | No | No | Yes | Memo | **LEGAL REQUIRED** | Counsel |
| Content/GCS copyright opinion | F | No | Counsel | No | No | Yes | Memo + inventory | **LEGAL REQUIRED** | After list |
| Buyer orgs + accept transfers | D | No | Coordinate | Yes | Yes | SPA | Buyer accounts | **BUYER REQUIRED** | Buyer |
| Scratch restore / buyer AAB-IPA / new AI keys | D | No | Escrow first | Yes | Vendors | TOS | Buyer logs | **BUYER REQUIRED** | After escrow |
| GitHub / Play / Apple / CF / GCP / Hetzner / RC / Ads / domain transfers | E | No | Initiate later | Yes | Yes | SPA | Vendor complete | **VENDOR REQUIRED** | Not this pass |
| Deploy live legal copy; rotate secrets; revoke founder; DNS; Ads change; Render revoke | G | No | Authorize | Some | Some | Some | Prod evidence | **PRODUCTION REQUIRED** | Not this pass |
| Registrar, account titles, live IP, DB/Redis host, Coolify git method, Vite/GA4 store, mailbox, unused-service live, GCS inventory, Birth Sky location, source title | H | Evidence only | Yes | No | No | Title | Screenshots / counsel | **UNKNOWN** | Checklists |

## Dashboard

| Action | Category | Status | Can owner complete without buyer? | Evidence needed | File/location | Blocking what? | Next action |
|--------|----------|--------|-----------------------------------|-----------------|---------------|----------------|-------------|
| Domain ownership evidence | A | OWNER INPUT NEEDED | Yes (screenshots) | Registrar, registrant, lock, NS, CF, SSL, mail | `DOMAIN_OWNERSHIP_EVIDENCE_CHECKLIST.md` | Domain transfer; G-domain gates | Owner screenshot pack |
| Store account evidence | A | OWNER INPUT NEEDED | Yes (screenshots) | Play/ASC legal name, IDs, eligibility | `STORE_ACCOUNT_EVIDENCE_CHECKLIST.md` | Play/Apple transfer | Owner screenshot pack |
| Infra account evidence | A | OWNER INPUT NEEDED | Yes (screenshots) | Coolify/Hetzner/CF/GCP/Firebase title + linkage | `INFRASTRUCTURE_OWNER_EVIDENCE_CHECKLIST.md` | Cloud transfer; live IP | Owner screenshot pack |
| DB/Redis host identify | A | UNKNOWN | Yes (hostname only) | Hostname | `DATABASE_OWNER_PREPARATION.md` | Dump; restore; independence | Owner reads panel |
| Service live-use confirm | A | OWNER INPUT NEEDED | Yes | Live vs unused ticks | `SERVICE_USAGE_CONFIRMATION.md` | Surprise deps / leftover keys | Owner confirms; no delete |
| Account matrix emails | A | OWNER INPUT NEEDED | Yes | Emails | `ACCOUNT_TRANSFER_MATRIX.md` | Handover contacts | Owner fills |
| Finance leftovers / COGS / Razorpay / demo@ | A | OPEN | Yes | CSVs / invoices / policy | `FINANCE/`; this list | Diligence completeness | Owner files |
| Secret escrow | B | READY TO EXECUTE | Yes (offline) | Encrypted archive ID | `SECRET_ESCROW_CEREMONY.md` | Buyer independence; signing | Owner runs ceremony |
| Android keystore escrow | B | READY TO EXECUTE | Yes (offline) | Encrypted keystore | `ANDROID_KEY_ESCROW_CHECKLIST.md` | Signed AAB; Play continuity | Owner escrows |
| iOS signing escrow | B | READY TO EXECUTE | Yes (offline) | Encrypted certs/APNs | `IOS_SIGNING_ESCROW_CHECKLIST.md` | Signed IPA; push | Owner escrows |
| DB dump + restore | B | UNKNOWN | After host known | Dump, checksum, scratch log | `DATABASE_OWNER_PREPARATION.md` | Backup FAIL; G-DB gates | Identify host first |
| GCS inventory | B | OPEN | List only | Prefix list | `GCS_CONTENT_OWNER_CHECKLIST.md` | Content schedule | Owner lists prefixes |
| Source-title pack | B/F | LEGAL REQUIRED | Collect only | Agreements if any; counsel | `SOURCE_TITLE_OWNER_ACTION_PACKAGE.md` | Hard cap; title | Collect; counsel |
| Path A / signed structure | C | OPEN | Election done; signing LEGAL | Signed PDF | `IP/SELLER_STRUCTURE_DECISION.md` | SPA seller | Counsel + owner sign |
| Patent include / exclude | C | OWNER INPUT NEEDED | Decision only | Checked box | `IP/PATENT_OWNER_DECISION.md` | Assignment scope | Owner elects |
| Ads keep/pause | C | OWNER INPUT NEEDED | Decision only | Written choice | `ROUND4_ADS_OWNER_DECISION.md` | Spend / Ads handover | Decide; do not edit |
| Title + MIT/© opinion | F | LEGAL REQUIRED | No | Counsel opinion | `SOURCE_TITLE_AND_LICENSE_ISSUE.md` | Hard cap 69 | Counsel |
| Assignment / bill of sale | F | LEGAL REQUIRED | No | Executed docs | `IP/ASSIGNMENT_STATUS.md` | Close | Counsel |
| Patent assignment | F | LEGAL REQUIRED | No | IPO assignment if INCLUDE | `PATENT_OWNER_DECISION.md` | Patent in deal | After INCLUDE |
| Child-data opinion | F | LEGAL REQUIRED | No | Memo | Legal file | Close | Counsel |
| Buyer accounts + accepts | D | BUYER REQUIRED | No | Buyer orgs | `MASTER_BUYER_HANDOVER_MATRIX.md` | Independence FAIL | Buyer |
| Vendor transfers | E | VENDOR REQUIRED | No | Vendor complete | Transfer runbooks | Operate after close | Later |
| Prod deploy / rotate / DNS / Ads / revoke | G | PRODUCTION REQUIRED | No | Prod evidence | Live-copy / closing sequence | Live identity; independence | Not this pass |

## Still unresolved (must not be marked closed)

Source-code legal title · MIT/title conflict · patent include/exclude · assignment · Android keystore escrow · iOS signing escrow · production DB backup · DB restore · domain ownership · Play transfer · Apple transfer · cloud account ownership · GCP ownership · Firebase ownership · GCS ownership · production secrets · buyer independence.

## This pass closed

**No operational owner-action was closed.** New files are **preparation only**.
