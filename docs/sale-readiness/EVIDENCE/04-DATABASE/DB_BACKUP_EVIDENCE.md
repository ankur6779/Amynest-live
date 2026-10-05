# DATABASE BACKUP EVIDENCE (SB-G02)

**Date:** 25 September 2026  
**SB-G02:** CLOSED (with restore evidence)  
No passwords, `DATABASE_URL`, cookies, or tokens are recorded.

| Field | Value |
|-------|--------|
| Production DB identifier | Coolify `tcl9udyxcuq2zu598ebj0pfu` (database `postgres`) |
| Coolify backup identifier | `pg-dump-postgres-1790354446.dmp` |
| Coolify status | Success (owner UI) |
| Availability | Local Storage (Coolify) |
| Backup size | 347,862,499 bytes (**331.75 MB**) — matches Coolify 331.75 MB |
| Format | PostgreSQL custom (`PGDMP`) |
| Encrypted artifact identifier | `AMYNEST-DB-ESCROW-2026-09-25-006374fd` |
| Ciphertext filename | `AMYNEST-DB-ESCROW-2026-09-25-006374fd.enc` |
| Encryption method | OpenSSL AES-256-CBC, PBKDF2, 200000 iterations, SHA-256, salted |
| SHA-256 of ciphertext | `d94e4ab4db85a1771e4ac08813254524d5e0c58413af38d7a8a82256fa53ae6a` |
| Encrypted size | 347,862,528 bytes |
| Decrypt roundtrip | **PASS** |
| Storage | Owner-local directory **outside Git** (matching `.key` alongside; path not recorded) |
| Plaintext after encrypt | **WIPED** (escrow copy + Downloads duplicate) |

No second production backup was taken. Production was not modified.
