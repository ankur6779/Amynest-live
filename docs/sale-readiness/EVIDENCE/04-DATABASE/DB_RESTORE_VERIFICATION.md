# DATABASE RESTORE VERIFICATION (SB-G02)

**Date:** 25 September 2026  
**SB-G02:** CLOSED  
No credentials are recorded.

| Field | Value |
|-------|--------|
| Production DB identifier | `tcl9udyxcuq2zu598ebj0pfu` |
| Coolify backup identifier | `pg-dump-postgres-1790354446.dmp` |
| Backup timestamp | Coolify dump id `1790354446` |
| Backup size | 331.75 MB (347,862,499 bytes) |
| Encrypted artifact identifier | `AMYNEST-DB-ESCROW-2026-09-25-006374fd` |
| SHA-256 | `d94e4ab4db85a1771e4ac08813254524d5e0c58413af38d7a8a82256fa53ae6a` |
| Scratch engine | Isolated PostgreSQL **18.6** on loopback socket port **55432** (not 5432; not Coolify) |
| Scratch DB name | `amynest_sb_g02_scratch` (dropped after tests) |
| Restore result | **PASS** (`pg_restore` exit 0; restored from decrypted ciphertext) |
| Schema verification | **PASS** — 143 public base tables |
| Read test | **PASS** — counts only: `children`=164, `routines`=85, `subscriptions`=456 |
| Write test | **PASS** — create/insert/select on `sb_g02_write_probe`, then **DROP** (table absent after) |
| Cleanup result | **PASS** — scratch DB dropped; isolated PG18 stopped; scratch data dir shredded; plaintext dumps shredded |
| Production untouched | **YES** — no Coolify/Postgres production connection; local PG16 on 5432 left running and unused for this restore |

Local Homebrew `pg_restore` 16 cannot read this archive (format 1.16). Scratch used PostgreSQL 18.6 only, then removed.
