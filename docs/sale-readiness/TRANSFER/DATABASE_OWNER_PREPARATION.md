# DATABASE OWNER PREPARATION

**Date:** 24 September 2026  
Do **not** connect to production using discovered credentials.  
Do **not** dump production in this pass.

Companion: `DATABASE_RECOVERY_RUNBOOK.md`, `DATABASE_HANDOVER.md`.

## Current status

| Fact | State |
|------|-------|
| Production DATABASE_URL **host** | **UNKNOWN** |
| Database provider / account | **UNKNOWN** (Coolify-hosted **INFERRED**, not proven) |
| Encrypted dump | **BACKUP NOT CREATED** |
| Restore to scratch | **RESTORE NOT VERIFIED** |
| Historic row-count notes | Exist in older certs; **do not** treat as current backup evidence |

## Owner procedure (all unchecked)

1. [ ] Confirm production DB host (hostname only; never paste full URL into git).
2. [ ] Confirm database provider / account title.
3. [ ] Create encrypted dump **offline** (outside Git).
4. [ ] Verify dump integrity (tool exit 0 / size / header).
5. [ ] Store securely outside Git (second copy).
6. [ ] Record checksum of the **encrypted** archive in the data room.
7. [ ] Restore to an isolated scratch DB (not production).
8. [ ] Run schema validation.
9. [ ] Run read smoke test.
10. [ ] Run write smoke test (scratch only).
11. [ ] Record results (pass/fail, date) — not dump contents.
12. [ ] Preserve backup for buyer handover under transaction terms.

No step is complete. No checksum exists.
