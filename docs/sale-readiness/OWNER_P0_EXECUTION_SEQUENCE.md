# OWNER P0 EXECUTION SEQUENCE

**Date:** 24 September 2026  
Order is **dependency**, not ID number.  
SB-A03 (patent INCLUDE/EXCLUDE) is **P1** in the blocker register but sits in Phase 0 because Phase 1 patent assignment cannot start without it.

```
SB-C01 Path A/B
    ├─► SB-A02 assignment/bill of sale
    │       └─► Path B inbound assignment (only if Path B)
    └─► store legal-name mismatch disclosure (SB-H02 / SB-I02)

SB-A03 INCLUDE/EXCLUDE  (P1 decision)
    └─► patent IPO assignment (only if INCLUDE) — after SB-A02

SB-A01 title evidence ──► counsel position ──► SB-A02 warranties

SB-G01 hostname ──► SB-G02 dump + scratch restore

SB-E01 / SB-H01 / SB-I01 escrow (parallel; no mutual dependency)

SB-F01 / SB-J01 / SB-H02 / SB-I02 / SB-L01  evidence (parallel)
    └─► vendor transfers need buyer destination (Phase 4)

SB-B01 + SB-E01 + SB-F01 ──► SB-F02 buyer deploy
SB-H01 + SB-H02 + buyer Play ──► buyer-signed AAB
SB-I01 + SB-I02 + buyer ASC ──► buyer-signed IPA
all P0s ──► founder-exit PASS
```

## PHASE 0 — DECISIONS

| # | Item | ID | Why this position |
|---|------|----|-------------------|
| 1 | Seller structure Path A/B | SB-C01 | Names the seller. Blocks a signed SPA. |
| 2 | Patent INCLUDE/EXCLUDE | SB-A03 (P1) | Does not block operating the app. Blocks patent assignment work. |
| 3 | Source-title / legal position | SB-A01 | Collect now; counsel conclusion before you warrant exclusive title. |

## PHASE 1 — LEGAL CONTROL

| # | Item | ID | Why this position |
|---|------|----|-------------------|
| 4 | Assignment / bill of sale | SB-A02 | Needs Phase 0 elections + title position. Needs buyer counter-sign to **finish**. |
| 5 | Inbound Ankur → AMYWORLD assignment | (conditional) | **Only if Path B.** Does not exist today. |
| 6 | Patent IPO assignment | (conditional) | **Only if INCLUDE.** Applicant is Ankur; not AmyWorld. |

Do **not** file assignments in this documentation pass.

## PHASE 2 — OWNER ESCROW

| # | Item | ID | Why this position |
|---|------|----|-------------------|
| 7 | Production secrets | SB-E01 | No dependency. Owner-only. |
| 8 | Android signing | SB-H01 | Parallel with 7. |
| 9 | iOS signing | SB-I01 | Parallel with 7–8. Include APNs if a `.p8` exists. |
| 10 | Database dump | SB-G02 | **After** SB-G01 hostname. |
| 11 | DB scratch restore | SB-G02 | After dump + checksum. Owner scratch is enough to close G02; buyer scratch is Phase 4 extra. |

Birth Sky key: inventory inside SB-E01. If unset, write “unset” — do not invent a key.

## PHASE 3 — ACCOUNT OWNERSHIP / TRANSFER **PREPARATION**

Evidence only. **Do not transfer.**

| # | Item | ID | Why this position |
|---|------|----|-------------------|
| 12 | GitHub | SB-B01 | Screenshot collaborators. Transfer waits for buyer org. |
| 13 | Cloud accounts | SB-F01 | Titles unknown until screenshots. |
| 14 | Domain | SB-J01 | Registrar unknown until screenshots. No DNS change. |
| 15 | Play | SB-H02 | Eligibility ≠ control today. Do not start transfer. |
| 16 | Apple | SB-I02 | Same. |
| 17 | RevenueCat | SB-L01 | Org screenshot. Invite after buyer exists. |

These can run **in parallel with Phase 2**. They sit after decisions only so store legal names can be compared to Path A/B.

## PHASE 4 — BUYER HANDOVER

Cannot start without a buyer destination.

| # | Item | Maps to |
|---|------|---------|
| 18 | Buyer accounts | SB-B01, F01, H02, I02, J01, L01 |
| 19 | Buyer deploy | SB-F02 |
| 20 | Buyer-signed AAB | SB-H01 + H02 |
| 21 | Buyer-signed IPA | SB-I01 + I02 |
| 22 | Buyer billing / webhook | SB-L01 |
| 23 | Founder-exit test | SB-P01 aggregate |

## What this graph is not

- Not a reason to deploy, rotate, or transfer now.
- Not a claim that Phase 2 escrow is already done.
- Not a preferred Path A or INCLUDE.
