# FINAL DATABASE CLOSURE PLAN

**Date:** 24 September 2026  
Do **not** execute against production in this pass. Do **not** claim completion.

Companions: `TRANSFER/DATABASE_OWNER_PREPARATION.md`, `TRANSFER/DATABASE_RECOVERY_RUNBOOK.md`.

## Current state

| Fact | State |
|------|-------|
| Production DB host | **UNKNOWN** |
| Production database identity | **UNKNOWN** (Coolify-hosted **INFERRED**) |
| Encrypted production dump | **NOT CREATED** |
| Checksum | **NONE** |
| Restore | **NOT VERIFIED** |
| Historic row counts | Exist in older certs — **not** current backup evidence. Do **not** repeat an unsupported Render 436,860 vs Coolify 50 pair. |

## Required closure sequence (all unchecked)

1. [ ] Identify production DB host (hostname only; never paste full `DATABASE_URL` into git).
2. [ ] Confirm production database (name + provider account).
3. [ ] Create encrypted backup **offline** (outside Git).
4. [ ] Verify checksum of the **encrypted** archive.
5. [ ] Restore into isolated scratch environment (not production).
6. [ ] Run schema validation.
7. [ ] Run read smoke test.
8. [ ] Run write smoke test (scratch only).
9. [ ] Validate background jobs (scratch Redis + worker).
10. [ ] Validate storage dependencies (GCS audio probe on scratch/staging keys).
11. [ ] Record evidence (pass/fail, date, checksum — not dump contents).

**Blocker IDs:** SB-G01, SB-G02, SB-G03.  
**Status:** OPEN / UNKNOWN host.
