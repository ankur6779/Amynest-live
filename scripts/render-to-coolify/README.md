# Render → Coolify PostgreSQL migration

Zero-downtime **preparation** toolkit. Does **not** change DNS, Cloudflare, or stop Render.

## Prerequisites

| Requirement | Notes |
|-------------|-------|
| `postgresql-client` | `pg_dump`, `pg_restore`, `psql` on the machine that runs copy |
| Network | Coolify host must reach Render external Postgres URL |
| Schema on Coolify | Already applied via `drizzle-kit push` (137 tables) |
| Credentials | Copy `env.example` → secure env file (never commit) |

**Run initial copy from the Coolify host** (`188.245.208.126`) so `COOLIFY_DATABASE_URL` can use the internal Docker hostname `tcl9udyxcuq2zu598ebj0pfu`.

## Quick start

```bash
# On Coolify host — load credentials
export RENDER_DATABASE_URL='postgresql://...'
export COOLIFY_DATABASE_URL='postgresql://postgres:...@tcl9udyxcuq2zu598ebj0pfu:5432/postgres'

cd /opt/amynest/Amynest-live   # or your checkout

# Phase 1: initial copy (truncate seed data first)
bash scripts/render-to-coolify/01-initial-copy.sh --replace

# Phase 2: verify (must PASS before cutover)
bash scripts/render-to-coolify/02-verify-replica.sh

# Phase 3: repeat during soak period (Render still live)
bash scripts/render-to-coolify/03-delta-sync.sh

# Phase 4: final sync + verify (minutes before cutover)
bash scripts/render-to-coolify/04-final-sync.sh
```

## Scripts

| Script | Purpose |
|--------|---------|
| `09-data-plane-audit.sh` | **Data plane consistency gate** — must PASS before canary |
| `10-scheduler-presync-render.sh` | Single Active Scheduler — Render owns crons |
| `11-scheduler-cutover-coolify.sh` | Enable Coolify schedulers after cutover |
| `12-scheduler-rollback-render.sh` | Rollback schedulers to Render |
| `01-initial-copy.sh` | `pg_dump` Render → `pg_restore --data-only` Coolify |
| `02-verify-replica.sh` | Full comparison + `audit/render-to-coolify/verify-latest.md` |
| `03-delta-sync.sh` | Copy rows changed since initial snapshot |
| `04-final-sync.sh` | Final delta + `--final` tables + sequences + verify + smoke |
| `05-fix-sequences.sh` | Reset serial sequences after data restore |
| `06-smoke-test.sh` | Automated backend smoke tests (also runs after `02-verify-replica.sh`) |
| `07-canary-monitor.sh` | Live Render vs Coolify monitor + stage advancement |
| `08-dashboard-serve.sh` | Serve migration dashboard HTML |
| `19-ensure-coolify-traefik-https.sh` | **Permanent Traefik HTTPS fix** — regen labels, optional `--redeploy`, verify health |
| `set-canary-percent.sh` | Update Cloudflare `CANARY_PERCENT` in wrangler.toml |
| `rollback-truncate-coolify.sh` | Truncate Coolify data (schema kept) |
| `rollback-restore-coolify-backup.sh` | Restore Coolify from a saved `.dump` |

## pnpm commands

```bash
pnpm run migrate:render-to-coolify:verify
pnpm run migrate:render-to-coolify:delta
pnpm run migrate:render-to-coolify:smoke
pnpm run migrate:render-to-coolify:delta -- --final --dry-run
```

## Outputs

| Path | Content |
|------|---------|
| `audit/render-to-coolify/snapshot.json` | Initial copy timestamp |
| `audit/render-to-coolify/dumps/*.dump` | pg_dump backups |
| `audit/render-to-coolify/verify-latest.json` | Machine-readable verification |
| `audit/render-to-coolify/verify-latest.md` | Human-readable report |
| `audit/render-to-coolify/delta-latest.json` | Delta sync log |
| `audit/render-to-coolify/smoke-latest.json` | Backend smoke test report |
| `audit/render-to-coolify/smoke-latest.md` | Human-readable smoke summary |

## Smoke tests (after every verification)

When `COOLIFY_API_URL` is set, `02-verify-replica.sh` automatically runs `06-smoke-test.sh`.

Checks: `/health`, `/ready` (or readiness surrogate), Firebase auth, parent/child profiles, subscription, RevenueCat webhook validation, GCS, push register, routine endpoint, BullMQ enqueue/process, AI job poll.

See `env.example` for `SMOKE_FIREBASE_ID_TOKEN`, `INTERNAL_HEALTH_SECRET`, `REVENUECAT_WEBHOOK_SECRET`.

## Go / no-go

Cutover is allowed **only** when `verify-latest.json` contains `"passed": true` **and** `smoke-latest.json` contains `"passed": true`.

See:
- `docs/production-stabilization/migrations/render-to-coolify-migration-plan.md`
- `docs/production-stabilization/migrations/render-to-coolify-cutover-checklist.md`
