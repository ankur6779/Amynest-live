#!/usr/bin/env bash
# Full-database migration via pg_dump/pg_restore (faster for large DBs).
# Requires: postgresql client (brew install libpq && brew link --force libpq)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -z "${SOURCE_DATABASE_URL:-}" ]]; then
  echo "Set SOURCE_DATABASE_URL (Replit Database → connection string)."
  exit 1
fi
if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "Set DATABASE_URL (Render → amynest-db → External Database URL)."
  exit 1
fi

DRY_RUN=0
REPLACE=0
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    --replace) REPLACE=1 ;;
  esac
done

if ! command -v pg_dump >/dev/null 2>&1; then
  echo "pg_dump not found. Use: pnpm run db:migrate (Node script) instead."
  exit 1
fi

echo "==> Syncing schema on target..."
DATABASE_URL="$DATABASE_URL" pnpm --filter @workspace/db push

DUMP="$(mktemp -t amynest-migrate.XXXXXX.dump)"
trap 'rm -f "$DUMP"' EXIT

echo "==> Dumping source..."
pg_dump "$SOURCE_DATABASE_URL" --no-owner --no-acl --format=custom --file="$DUMP"

for table in children parent_profiles onboarding_profiles; do
  count="$(psql "$SOURCE_DATABASE_URL" -tAc "SELECT COUNT(*) FROM \"$table\"" 2>/dev/null || echo "?")"
  echo "  source $table: $count"
done

if [[ "$DRY_RUN" == "1" ]]; then
  echo "Dry run — skipping restore."
  exit 0
fi

if [[ "$REPLACE" == "1" ]]; then
  echo "==> Truncating target..."
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
DO $$ DECLARE r RECORD;
BEGIN
  FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
    EXECUTE 'TRUNCATE TABLE ' || quote_ident(r.tablename) || ' CASCADE';
  END LOOP;
END $$;
SQL
fi

echo "==> Restoring data to target..."
pg_restore -d "$DATABASE_URL" --no-owner --no-acl --data-only --disable-triggers "$DUMP" 2>/dev/null || true

for table in children parent_profiles onboarding_profiles; do
  count="$(psql "$DATABASE_URL" -tAc "SELECT COUNT(*) FROM \"$table\"" 2>/dev/null || echo "?")"
  echo "  target $table: $count"
done

echo "Done."
