# Render → Coolify PostgreSQL migration plan

**Status:** Preparation only — Render stays live; no DNS/Cloudflare changes.

**Goal:** Prove Coolify PostgreSQL is an **exact replica** of Render before any production cutover.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  PHASE 0–4 (this document) — Render LIVE, users unaffected      │
├─────────────────────────────────────────────────────────────────┤
│  Render Postgres (source of truth)                              │
│       │ pg_dump / delta sync                                    │
│       ▼                                                         │
│  Coolify Postgres (replica)  ← verify must PASS               │
└─────────────────────────────────────────────────────────────────┘

Cutover (separate checklist) — only after verify-latest.json passed: true
```

| Host | Role | ID / hostname |
|------|------|---------------|
| Render | Production DB | `amynest-db-dykj` / `dpg-d85k80jtqb8s7382m7lg-a` |
| Coolify | Target replica | `tcl9udyxcuq2zu598ebj0pfu` on `188.245.208.126` |

---

## Phase 0 — Preconditions

- [ ] Coolify schema exists (137 tables, 413 indexes) — `drizzle-kit push` already run
- [ ] `postgresql-client` installed on Coolify host
- [ ] Render external `DATABASE_URL` available (SSL, FQDN)
- [ ] Coolify internal Postgres URL available from Coolify host
- [ ] Render **not** stopped; no DNS changes

**Current gap (2026-07-11 audit):** Coolify has schema only (~50 seed rows). Phase 1 required.

---

## Phase 1 — Initial copy (`pg_dump` / `pg_restore`)

**Script:** `scripts/render-to-coolify/01-initial-copy.sh --replace`

**Run from:** Coolify host (`188.245.208.126`)

```bash
export RENDER_DATABASE_URL='...'    # Render external URL
export COOLIFY_DATABASE_URL='...'   # tcl9udyxcuq2zu598ebj0pfu internal

bash scripts/render-to-coolify/01-initial-copy.sh --replace
```

**What it does:**

1. Records `snapshot_at` in `audit/render-to-coolify/snapshot.json`
2. `pg_dump` Render → `audit/render-to-coolify/dumps/render-prod-<timestamp>.dump`
3. Truncates Coolify public tables (`--replace`)
4. `pg_restore --data-only --disable-triggers` into Coolify
5. Resets serial sequences (`05-fix-sequences.sh`)

**Render impact:** Read-only queries during dump. No downtime.

**Expected duration:** ~5–15 min depending on ~437k rows + indexes.

---

## Phase 2 — Verification (automatic report)

**Script:** `scripts/render-to-coolify/02-verify-replica.sh`

**Checks:**

| Category | Comparison |
|----------|------------|
| Tables | Names present on both sides |
| Row counts | Per-table COUNT(*) |
| Indexes | 413 index names |
| Constraints | PK, FK, UNIQUE, CHECK names |
| Sequences | `pg_sequences.last_value` (target ≥ source) |
| Extensions | `pg_extension` list |

**Outputs:**

- `audit/render-to-coolify/verify-latest.json`
- `audit/render-to-coolify/verify-latest.md`

**Gate:** `passed: true` required before any cutover discussion.

```bash
export COOLIFY_API_URL='https://...'
export SMOKE_FIREBASE_ID_TOKEN='...'   # see env.example
bash scripts/render-to-coolify/02-verify-replica.sh
# Runs DB verify + backend smoke; writes verify-latest.* and smoke-latest.*
# Exit code 1 = mismatch — do not proceed
```

---

## Phase 3 — Incremental sync (soak period)

While Render remains live, new rows accumulate on Render. Sync them periodically:

**Script:** `scripts/render-to-coolify/03-delta-sync.sh`

**Strategy per table:**

| Table has | Action |
|-----------|--------|
| `updated_at` | UPSERT rows where `updated_at >= snapshot_at` |
| `created_at` only | UPSERT rows where `created_at >= snapshot_at` |
| Neither | Deferred to `--final` pass |

**Recommended cadence:** Every 6–24 hours during soak, plus after any prod schema push.

```bash
bash scripts/render-to-coolify/03-delta-sync.sh
bash scripts/render-to-coolify/02-verify-replica.sh   # spot-check
```

---

## Phase 4 — Final synchronization (pre-cutover)

**Script:** `scripts/render-to-coolify/04-final-sync.sh`

Run in a **low-traffic window** minutes before cutover (Render still live):

1. Incremental delta since `snapshot.json`
2. `--final` pass: full re-copy of tables without timestamp columns
3. Fix sequences
4. Full verification (must PASS)

```bash
bash scripts/render-to-coolify/04-final-sync.sh
```

**Optional last-second step:** Run `03-delta-sync.sh` once more immediately before DNS/proxy change.

---

## Rollback (preparation phase)

These scripts only affect **Coolify**. Render is untouched.

| Scenario | Script |
|----------|--------|
| Bad restore, retry | `rollback-truncate-coolify.sh` then `01-initial-copy.sh --replace` |
| Restore from known-good dump | `rollback-restore-coolify-backup.sh <dump>` |

---

## What this plan does NOT do

- Does **not** change Cloudflare `BACKEND_ORIGIN`
- Does **not** change DNS
- Does **not** stop Render backend or Postgres
- Does **not** migrate Redis (separate runbook)
- Does **not** authorize production cutover by itself

Cutover steps: `render-to-coolify-cutover-checklist.md`

---

## Success criteria

| Metric | Target |
|--------|--------|
| Table count | 137 = 137 |
| Index count | 413 = 413 |
| Row mismatches | 0 |
| Constraint mismatches | 0 |
| Sequence issues | 0 |
| `parent_profiles` | Match Render |
| `subscriptions` | Match Render |
| `analytics_events` | Match Render |
| `verify-latest.json` | `"passed": true` |

---

## Tooling reference

| Command | Purpose |
|---------|---------|
| `pnpm run migrate:render-to-coolify:verify` | Generate verification report |
| `pnpm run migrate:render-to-coolify:delta` | Incremental row sync |
| `pnpm run migrate:render-to-coolify:delta -- --final` | Include no-timestamp tables |

See `scripts/render-to-coolify/README.md` for full usage.
