#!/usr/bin/env bash
# Repair Coolify replica in-place (no full database truncate).
set -euo pipefail

PG_CONTAINER="${PG_CONTAINER:-tcl9udyxcuq2zu598ebj0pfu}"
DUMP_HOST="${DUMP_HOST:-/data/coolify/migration/dumps/render-prod-20260711T184856Z.dump}"
AUDIT_DIR="${AUDIT_DIR:-/data/coolify/migration/audit}"
mkdir -p "$AUDIT_DIR"

: "${RENDER_DATABASE_URL:?Set RENDER_DATABASE_URL}"

COOLIFY_PASS="$(python3 -c "import re; print(re.search(r'POSTGRES_PASSWORD=(\S+)', open('/data/coolify/databases/${PG_CONTAINER}/docker-compose.yml').read()).group(1))")"
PG_IP="$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' "$PG_CONTAINER")"
COOLIFY_DATABASE_URL="postgresql://postgres:${COOLIFY_PASS}@${PG_IP}:5432/postgres"

psql_c() { docker exec "$PG_CONTAINER" psql "$COOLIFY_DATABASE_URL" -v ON_ERROR_STOP=1 "$@"; }
psql_r() { docker exec "$PG_CONTAINER" psql "$RENDER_DATABASE_URL" -v ON_ERROR_STOP=1 "$@"; }

copy_table_from_render() {
  local table="$1"
  echo "==> Copy table $table from Render"
  psql_c -c "TRUNCATE TABLE \"$table\" CASCADE"
  docker exec "$PG_CONTAINER" pg_dump "$RENDER_DATABASE_URL" \
    --no-owner --no-acl --format=plain --data-only --table="public.$table" \
    | docker exec -i "$PG_CONTAINER" psql "$COOLIFY_DATABASE_URL" -v ON_ERROR_STOP=1 -q
  local src tgt
  src="$(psql_r -tAc "SELECT COUNT(*) FROM \"$table\"")"
  tgt="$(psql_c -tAc "SELECT COUNT(*) FROM \"$table\"")"
  echo "  $table render=$src coolify=$tgt"
  if [[ "$src" != "$tgt" ]]; then
    echo "  ERROR: row count mismatch on $table"
    return 1
  fi
}

echo "==> STEP 2: Schema drift repair (indexes)"
psql_r -tAc "
SELECT indexdef FROM pg_indexes
WHERE schemaname='public'
  AND indexname IN (
    'speech_coach_v2_monthly_cost_usage_user_id_child_id_month_key',
    'speech_coach_v2_session_token_usage_session_id_key'
  )
ORDER BY indexname
" | while IFS= read -r ddl; do
  [[ -z "$ddl" ]] && continue
  echo "  apply: ${ddl:0:80}..."
  psql_c -c "$ddl" 2>/dev/null || psql_c -c "$ddl"
done

for idx in growth_os_state_updated_idx speech_coach_v2_session_token_usage_session_id_unique; do
  on_r="$(psql_r -tAc "SELECT 1 FROM pg_indexes WHERE indexname='$idx'" 2>/dev/null || true)"
  if [[ -z "$on_r" ]]; then
    echo "  drop coolify-only index $idx"
    psql_c -c "DROP INDEX IF EXISTS \"$idx\"" || true
  fi
done

echo "==> STEP 3: Repair mismatched tables"
copy_table_from_render startup_funnel_events
# phonics_content may already be 131 from investigation; ensure exact match
copy_table_from_render phonics_content

echo "==> STEP 4: Fix all sequences from MAX(id)"
psql_c <<'SQL'
DO $$
DECLARE
  r RECORD;
  seq_name text;
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
    IF seq_name IS NULL THEN CONTINUE; END IF;
    EXECUTE format('SELECT COALESCE(MAX(%I), 0) FROM %I', r.column_name, r.table_name) INTO max_val;
    IF max_val > 0 THEN
      EXECUTE format('SELECT setval(%L, %s, true)', seq_name, max_val);
    ELSE
      EXECUTE format('SELECT setval(%L, 1, false)', seq_name);
    END IF;
  END LOOP;
END $$;
SQL

echo "==> Spot checks"
for t in analytics_events phonics_content startup_funnel_events parent_profiles subscriptions; do
  r="$(psql_r -tAc "SELECT COUNT(*) FROM \"$t\"")"
  c="$(psql_c -tAc "SELECT COUNT(*) FROM \"$t\"")"
  echo "  $t render=$r coolify=$c"
done

echo "REPAIR_PHASE1_OK"
