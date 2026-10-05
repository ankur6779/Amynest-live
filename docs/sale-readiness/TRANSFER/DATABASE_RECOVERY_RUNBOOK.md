# DATABASE RECOVERY RUNBOOK

**Date:** 24 September 2026  
**Not executed against production. Not a certified restore.**

## Current state (evidence only)

| Item | State |
|------|-------|
| Engine | PostgreSQL + Drizzle `lib/db/` **VERIFIED** |
| Schema | Repo schema + historical ~136–137 tables **VERIFIED** |
| Migrations | `docs/production-stabilization/migrations/`; `pnpm db:migrate`; `pnpm db:push` |
| Seeds | Various scripts (`seed:audio-pack`, content-engine seeds) — **not** a full prod clone |
| Backup scripts | July 2026 migration dumps referenced under Coolify paths — **not** a standing buyer escrow |
| Restore scripts | Historic `pg_restore` in render-to-coolify audit | 
| Redis | Required in prod; host **UNKNOWN** |
| Object storage | GCS `amynest-audio-storage` **name VERIFIED** |
| **CURRENT PRODUCTION DB HOST** | **UNKNOWN** |
| Render ≈ 436,860 vs Coolify ≈ 50 | **Not found** in repo. Do not repeat. Known: `phonics_content` 50 vs 131; later 522,568 match; later Coolify 588,151; Render suspended 20 Jul 2026 |

## Local scratch (no production credentials)

Safe on a buyer laptop:

1. Install PostgreSQL locally.
2. Create empty DB `amynest_dev` (docs default).
3. `cp .env.development.example .env.development` and set **local** `DATABASE_URL` only.
4. `pnpm install` && `pnpm db:push` to apply **schema**, not production data.
5. `pnpm run dev:api` and `curl localhost:5000/api/healthz`.

This proves schema apply. It is **not** production recovery.

---

## Owner: create encrypted backup (DO NOT run here)

1. Identify live `DATABASE_URL` **offline** (Coolify). Host still **UNKNOWN** in git.
2. `pg_dump -Fc --no-owner --no-acl` to a file (custom format).
3. Record `pg_dump --schema-only` separately.
4. Encrypt with a tool the buyer agrees (e.g. age/gpg). Store passphrase out-of-band.
5. Checksum (SHA-256) the ciphertext.
6. Store ciphertext in buyer-controlled offline storage + one seller escrow copy until acceptance.
7. Dump Redis only if durable data exists (usually ephemeral — **UNKNOWN**).
8. Export GCS inventory (`gsutil ls` / console) as a **manifest**, not necessarily all bytes.

## Where to store

Not git. Not Slack. Encrypted object the buyer names (offline disk or buyer bucket).

## How buyer receives it

In-person or split-key channel at closing. Seller does **not** email plaintext dumps.

## How buyer restores

1. Provision isolated Postgres (not production).
2. Decrypt dump on the restore host.
3. `pg_restore --clean --if-exists` (or create-empty then restore).
4. Compare table count to schema inventory.
5. Point a **scratch** API `DATABASE_URL` at the restore.
6. Do not expose restore on `www.amynest.in`.

## Schema validation

`pnpm db:push` is **not** for production restore. Use dump schema vs `lib/db` diff. Historic pitfall: `phonics_content` partial COPY (50 vs 131).

## Application connect

Set `DATABASE_URL` on Coolify API **and** worker. Boot fails without it (`assertCriticalEnvAtBoot`).

## Smoke tests (scratch only)

8. **Read:** `GET /api/healthz` 200; optional authenticated read of a non-sensitive count.  
9. **Write:** create a disposable test parent on scratch; delete after. **Not** on production.  
10. **Background job:** enqueue a no-op/AI dry job on scratch Redis; worker completes.  
11. **Storage:** `GET /api/healthz/audio` against buyer GCS or documented fallback.

## Rollback

Keep seller production **untouched** until buyer signs acceptance. Restore mistakes stay on scratch. If a mistaken prod write occurs (must not), stop and restore from the pre-cut dump — **no prod cut in this pass**.

**Recovery tested? NO.**
