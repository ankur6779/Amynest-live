#!/usr/bin/env bash
# Phase 1 — Initial full data copy: Render PostgreSQL → Coolify PostgreSQL
#
# Run from the Coolify host (188.245.208.126) so the target URL can use the
# internal Docker hostname (tcl9udyxcuq2zu598ebj0pfu). Render stays live.
#
#   export RENDER_DATABASE_URL='postgresql://...@dpg-....singapore-postgres.render.com/amynest_db_jnen?sslmode=require'
#   export COOLIFY_DATABASE_URL='postgresql://postgres:PASS@tcl9udyxcuq2zu598ebj0pfu:5432/postgres'
#   bash scripts/render-to-coolify/01-initial-copy.sh
#
# Options:
#   --dry-run     Dump only; skip restore
#   --replace     Truncate Coolify public tables before restore
#   --skip-schema Skip drizzle push on target (default when schema already exists)
#   --push-schema Run pnpm db:push on Coolify target before restore
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

DRY_RUN=0
REPLACE=0
PUSH_SCHEMA=0
SKIP_SCHEMA=1
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    --replace) REPLACE=1 ;;
    --push-schema) PUSH_SCHEMA=1; SKIP_SCHEMA=0 ;;
    --skip-schema) SKIP_SCHEMA=1 ;;
  esac
done

if [[ -z "${RENDER_DATABASE_URL:-}" ]]; then
  echo "Set RENDER_DATABASE_URL (Render amynest-db external URL)."
  exit 1
fi
if [[ -z "${COOLIFY_DATABASE_URL:-}" ]]; then
  echo "Set COOLIFY_DATABASE_URL (Coolify Postgres — use internal hostname from Coolify host)."
  exit 1
fi

for cmd in pg_dump pg_restore psql; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "Missing $cmd. Install postgresql client (apt install postgresql-client)."
    exit 1
  fi
done

AUDIT_DIR="$ROOT/audit/render-to-coolify"
DUMP_DIR="$AUDIT_DIR/dumps"
mkdir -p "$DUMP_DIR"

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
DUMP_FILE="$DUMP_DIR/render-prod-${STAMP}.dump"
SNAPSHOT_AT="$(date -u +%Y-%m-%dT%H:%M:%S.000Z)"

echo "==> Migration snapshot: $SNAPSHOT_AT"
echo "==> Dump file: $DUMP_FILE"

if [[ "$PUSH_SCHEMA" == "1" ]]; then
  echo "==> Syncing schema on Coolify (drizzle push)..."
  DATABASE_URL="$COOLIFY_DATABASE_URL" pnpm --filter @workspace/db push
elif [[ "$SKIP_SCHEMA" == "1" ]]; then
  echo "==> Skipping schema push (Coolify schema must already match Render)."
fi

echo "==> Dumping Render (schema + data, custom format)..."
pg_dump "$RENDER_DATABASE_URL" \
  --no-owner \
  --no-acl \
  --format=custom \
  --verbose \
  --file="$DUMP_FILE"

echo "==> Source spot checks..."
for table in parent_profiles subscriptions children analytics_events; do
  count="$(psql "$RENDER_DATABASE_URL" -tAc "SELECT COUNT(*) FROM \"$table\"" 2>/dev/null || echo "?")"
  echo "  render $table: $count"
done

if [[ "$DRY_RUN" == "1" ]]; then
  echo "Dry run — dump created, restore skipped."
  exit 0
fi

if [[ "$REPLACE" == "1" ]]; then
  echo "==> Truncating Coolify public tables..."
  psql "$COOLIFY_DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
DO $$ DECLARE r RECORD;
BEGIN
  FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
    EXECUTE 'TRUNCATE TABLE ' || quote_ident(r.tablename) || ' CASCADE';
  END LOOP;
END $$;
SQL
fi

echo "==> Restoring data to Coolify (--data-only)..."
# Schema already exists from drizzle push; copy data only.
pg_restore \
  -d "$COOLIFY_DATABASE_URL" \
  --no-owner \
  --no-acl \
  --data-only \
  --disable-triggers \
  --verbose \
  "$DUMP_FILE" 2>&1 | tail -50 || true

echo "==> Fixing sequences on Coolify..."
bash "$(dirname "$0")/05-fix-sequences.sh"

echo "==> Writing snapshot metadata..."
node - <<'NODE' "$SNAPSHOT_AT" "$DUMP_FILE"
const fs = require("node:fs");
const path = require("node:path");
const [,, snapshotAt, dumpFile] = process.argv;
const dir = path.join(process.cwd(), "audit", "render-to-coolify");
fs.mkdirSync(dir, { recursive: true });
const snapshot = {
  version: 1,
  label: "initial-copy",
  snapshot_at: snapshotAt,
  source_host: (process.env.RENDER_DATABASE_URL || "").replace(/:\/\/[^@]+@/, "://***@"),
  target_host: (process.env.COOLIFY_DATABASE_URL || "").replace(/:\/\/[^@]+@/, "://***@"),
  dump_file: dumpFile,
  tables: [],
};
fs.writeFileSync(path.join(dir, "snapshot.json"), JSON.stringify(snapshot, null, 2) + "\n");
console.log("Wrote", path.join(dir, "snapshot.json"));
NODE

echo "==> Target spot checks..."
for table in parent_profiles subscriptions children analytics_events; do
  count="$(psql "$COOLIFY_DATABASE_URL" -tAc "SELECT COUNT(*) FROM \"$table\"" 2>/dev/null || echo "?")"
  echo "  coolify $table: $count"
done

echo ""
echo "==> Run verification:"
echo "  RENDER_DATABASE_URL=... COOLIFY_DATABASE_URL=... pnpm run migrate:render-to-coolify:verify"
echo ""
echo "Done. Render was NOT stopped. No DNS changes."
