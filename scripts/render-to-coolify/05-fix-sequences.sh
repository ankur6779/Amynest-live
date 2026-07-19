#!/usr/bin/env bash
# Reset serial sequences on Coolify after pg_restore --data-only.
set -euo pipefail

if [[ -z "${COOLIFY_DATABASE_URL:-}" ]]; then
  echo "Set COOLIFY_DATABASE_URL."
  exit 1
fi

psql "$COOLIFY_DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
DO $$
DECLARE
  r RECORD;
  seq_name text;
  col_name text;
  max_val bigint;
BEGIN
  FOR r IN
    SELECT c.relname AS table_name, a.attname AS column_name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_attribute a ON a.attrelid = c.oid
    JOIN pg_attrdef d ON d.adrelid = c.oid AND d.adnum = a.attnum
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND pg_get_expr(d.adbin, d.adrelid) LIKE 'nextval%'
  LOOP
    seq_name := pg_get_serial_sequence(format('%I', r.table_name), r.column_name);
    IF seq_name IS NULL THEN
      CONTINUE;
    END IF;
    EXECUTE format(
      'SELECT COALESCE(MAX(%I), 0) FROM %I',
      r.column_name,
      r.table_name
    ) INTO max_val;
    IF max_val > 0 THEN
      EXECUTE format('SELECT setval(%L, %s, true)', seq_name, max_val);
    ELSE
      EXECUTE format('SELECT setval(%L, 1, false)', seq_name);
    END IF;
  END LOOP;
END $$;
SQL

echo "Sequences reset on Coolify."
