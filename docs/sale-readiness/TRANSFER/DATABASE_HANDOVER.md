# DATABASE HANDOVER

**Date:** 24 September 2026  
**No credentials printed. No production dump or restore was run.**

## What is verified vs not

| Question | Finding | Evidence type |
|----------|---------|---------------|
| Engine | PostgreSQL via Drizzle `lib/db/` | **VERIFIED** |
| Schema | ~136–137 tables documented | **VERIFIED** (schema + July inventories) |
| Production provider **today** | Coolify-attached Postgres **INFERRED** from July 2026 cutover/retirement docs and `x-amynest-backend: coolify` | **INFERRED — NOT VERIFIED 24 Sep** |
| Production `DATABASE_URL` host | **UNKNOWN — OWNER ACTION REQUIRED** | Example only: `.env.production.example` shows placeholder `…@host:5432/amynest_prod` |
| Database name | `amynest_prod` appears as an **example** string only | **NOT VERIFIED** as live name |
| Redis | Required in production for BullMQ (`REDIS_URL`, `WORKER_ENABLED=true`) | **VERIFIED** as config requirement; **host UNKNOWN** |
| Redis historic docs | `docs/hetzner-ai-worker.md` still describes Render Redis — **stale vs** 20 Jul Render-suspend cert | Do not treat Render Redis as live without re-proof |
| Backup mechanism | Runbooks name dumps; no automated schedule evidenced | **UNKNOWN — OWNER ACTION REQUIRED** |
| Restore mechanism | July 2026 migration restore existed; buyer scratch restore **not** certified 24 Sep | Prior restore **historical**; current **FAIL** |
| Encryption at rest | Host-level **UNKNOWN** | Birth Sky field encryption key named (`BIRTH_SKY_FIELD_ENCRYPTION_KEY`) — app-level, **NOT ESCROWED** |
| Credentials dependency | `DATABASE_URL` / `REDIS_URL` in Coolify + GitHub secret name `DATABASE_URL` | **FOUNDER-DEPENDENT** |
| Scheduled jobs | `SCHEDULER_ACTIVE_PLANE=coolify`; `BACKGROUND_TASKS_ENABLED`; admin digest cron | **VERIFIED** as intended plane; live job list **UNKNOWN** |

## Historical replica evidence (do not invent the 436,860 / 50 pair)

This pass again **did not** find a repo artifact stating Render ≈ 436,860 vs Coolify ≈ 50.

| Date | Finding | File |
|------|---------|------|
| Restore incident | Coolify `phonics_content` **50** rows vs Render **131** after bulk restore; later repaired to 131 | `audit/render-to-coolify/database-replica-certification.md` |
| 2026-07-12 | Verify **522,568 = 522,568** PASS at that moment | `audit/render-to-coolify/verify-latest.md` |
| Later July | Coolify total rows **588,151** | `audit/render-to-coolify/data-plane-audit-latest.md` |
| 2026-07-20 | Render API/static documented **suspended**; live header Coolify | `render-retirement-final-certification.md` |

**Do not silently declare migration complete.** Current production host is **UNKNOWN — OWNER ACTION REQUIRED**.

## Transfer operations (not equivalent)

| Layer | Operation |
|-------|-----------|
| **Account transfer** | Buyer receives Coolify (or host) project that owns the Postgres volume **or** a new managed Postgres is provisioned |
| **Credential rotation** | New `DATABASE_URL` / `REDIS_URL` on Coolify + worker; revoke founder URLs |
| **Service migration** | Logical dump → restore on buyer-controlled instance; update API + worker; cut DNS/app |

Child / personal data may be **non-transferable** as a sold asset even if a dump exists. Counsel, not this file.

## Required buyer acceptance test (not performed)

> Fresh backup restored into an isolated scratch environment and the application successfully connects and performs a basic read/write smoke test.

Status: **OPEN — OWNER ACTION REQUIRED**. Prior certification: `BACKUP_RESTORE_CERTIFICATION.md` **FAIL**.
