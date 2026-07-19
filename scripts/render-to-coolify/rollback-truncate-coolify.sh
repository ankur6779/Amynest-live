#!/usr/bin/env bash
# Rollback A — Reset Coolify Postgres to empty schema (keeps tables/indexes).
# Use when re-running initial copy or abandoning a bad restore.
# Does NOT affect Render production.
set -euo pipefail

if [[ -z "${COOLIFY_DATABASE_URL:-}" ]]; then
  echo "Set COOLIFY_DATABASE_URL."
  exit 1
fi

read -r -p "Truncate ALL public tables on Coolify? [y/N] " confirm
if [[ "${MIGRATION_CONFIRM:-}" == "yes" ]]; then confirm="y"; fi
if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
  echo "Aborted."
  exit 0
fi

psql "$COOLIFY_DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
DO $$ DECLARE r RECORD;
BEGIN
  FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
    EXECUTE 'TRUNCATE TABLE ' || quote_ident(r.tablename) || ' CASCADE';
  END LOOP;
END $$;
SQL

echo "Coolify public tables truncated. Schema preserved."
echo "Re-run: bash scripts/render-to-coolify/01-initial-copy.sh --replace"
