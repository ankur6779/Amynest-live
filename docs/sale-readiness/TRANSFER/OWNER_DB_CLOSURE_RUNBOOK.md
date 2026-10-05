# OWNER DB CLOSURE RUNBOOK

**Date:** 25 September 2026  
Do **not** commit `DATABASE_URL` or any password.

## Verified state (this pass)

| Fact | State | Evidence |
|------|-------|----------|
| Production DB host | `tcl9udyxcuq2zu598ebj0pfu` | `EVIDENCE/04-DATABASE/PRODUCTION_DB_IDENTITY.md` |
| Provider | Coolify PostgreSQL on Hetzner `188.245.208.126` | Same |
| Engine | PostgreSQL | Same (live minor version not confirmed) |
| Production vs other | Current Coolify export is production; older Render-style host is retired | Same |
| Redis | Separate host `g7jotufnm43n4au4e8n6x946` | `EVIDENCE/04-DATABASE/redis-hostname.txt` |
| Encrypted dump | **NOT CREATED** | `EVIDENCE/04-DATABASE/DB_RESTORE_VERIFICATION.md` |
| Scratch restore | **NOT VERIFIED** | Same |
| SB-G01 | **CLOSED** | Hostname positively identified |
| SB-G02 | **OPEN** | Dump/restore gates failed (no off-host access) |

## Completed (G01)

1. Identified production DB host from the current Coolify backend export (host only).
2. Corroborated with live API health on the Coolify sslip.io origin and `www.amynest.in/api/health`.
3. Recorded hostname in `EVIDENCE/04-DATABASE/hostname.txt`.
4. Confirmed Redis is a **separate** Coolify service.

## Remaining (G02) — authorized access required

25 Sep control-plane check: Coolify UI `:8000` is up; `/api/v1/*` returns **401** without a token; no `COOLIFY_TOKEN` on this machine. Worker SSH is insufficient. Details: `EVIDENCE/04-DATABASE/DB_ACCESS_DEPENDENCY.md`.

These were **attempted from this laptop and failed** (internal DNS; 5432 closed; Coolify SSH denied; Coolify API unauthenticated). Do them on `188.245.208.126` **after** the owner grants SSH or a Coolify API/UI session:

1. Confirm on-host client can reach `tcl9udyxcuq2zu598ebj0pfu:5432` (do not paste the URL into git).
2. `pg_dump` (custom or plain) → encrypt outside Git (same pattern as SB-E01).
3. Record SHA-256 of the **encrypted** file in `EVIDENCE/04-DATABASE/dump-checksum.txt`.
4. Restore into isolated **scratch** Postgres (local `127.0.0.1` is fine). **Not** production.
5. Schema + read smoke + write smoke on scratch only.
6. Update `EVIDENCE/04-DATABASE/DB_RESTORE_VERIFICATION.md` to PASS.
7. Mark SB-G02 CLOSED only when those artifacts exist and show pass.

Production must stay untouched. SB-E01 remains CLOSED and is not part of this dump.
