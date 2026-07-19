#!/usr/bin/env bash
# Repair Coolify replica without full re-copy — run on Coolify host.
set -euo pipefail

PG_CONTAINER="${PG_CONTAINER:-tcl9udyxcuq2zu598ebj0pfu}"
DUMP_FILE="${DUMP_FILE:-/data/coolify/migration/dumps/render-prod-20260711T184856Z.dump}"
SNAPSHOT_AT="${SNAPSHOT_AT:-2026-07-11T18:52:00.000Z}"
AUDIT_DIR="${AUDIT_DIR:-/data/coolify/migration/audit}"

mkdir -p "$AUDIT_DIR"

if [[ -z "${RENDER_DATABASE_URL:-}" ]]; then
  echo "Set RENDER_DATABASE_URL"
  exit 1
fi

COOLIFY_PASS="$(python3 -c "import re; print(re.search(r'POSTGRES_PASSWORD=(\S+)', open('/data/coolify/databases/${PG_CONTAINER}/docker-compose.yml').read()).group(1))")"
PG_IP="$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' "$PG_CONTAINER")"
COOLIFY_DATABASE_URL="postgresql://postgres:${COOLIFY_PASS}@${PG_IP}:5432/postgres"

psql_c() { docker exec "$PG_CONTAINER" psql "$COOLIFY_DATABASE_URL" -v ON_ERROR_STOP=1 "$@"; }
psql_r() { docker exec "$PG_CONTAINER" psql "$RENDER_DATABASE_URL" -v ON_ERROR_STOP=1 "$@"; }

echo "==> STEP 1: Investigate pg_restore error (phonics_content reproduce)"
docker cp "$DUMP_FILE" "$PG_CONTAINER:/tmp/repair.dump"
psql_c -c "TRUNCATE TABLE phonics_content CASCADE" >/dev/null
set +e
RESTORE_ERR="$(docker exec "$PG_CONTAINER" pg_restore \
  -d "$COOLIFY_DATABASE_URL" \
  --no-owner --no-acl --data-only --exit-on-error \
  -t phonics_content \
  /tmp/repair.dump 2>&1)"
RC=$?
set -e
echo "$RESTORE_ERR" | tee "$AUDIT_DIR/pgrestore-phonics_content-error.log"
echo "PHONICS_RESTORE_RC=$RC"
psql_c -tAc "SELECT COUNT(*) FROM phonics_content" | awk '{print "phonics_after_test_restore="$1}'

echo "==> STEP 2: Export Render index DDL for missing objects"
psql_r -tAc "
SELECT indexdef FROM pg_indexes
WHERE schemaname='public'
  AND indexname IN (
    'speech_coach_v2_monthly_cost_usage_user_id_child_id_month_key',
    'speech_coach_v2_session_token_usage_session_id_key'
  )
ORDER BY indexname;
" | tee "$AUDIT_DIR/render-missing-index-ddl.sql"

echo "==> STEP 2b: Apply missing indexes on Coolify (idempotent)"
while IFS= read -r ddl; do
  [[ -z "$ddl" ]] && continue
  echo "Applying: $ddl"
  psql_c -c "$ddl" || true
done < "$AUDIT_DIR/render-missing-index-ddl.sql"

echo "==> STEP 2c: Drop Coolify-only indexes not on Render"
for idx in growth_os_state_updated_idx speech_coach_v2_session_token_usage_session_id_unique; do
  on_render="$(psql_r -tAc "SELECT 1 FROM pg_indexes WHERE indexname='$idx'" || true)"
  if [[ -z "$on_render" ]]; then
    echo "Dropping Coolify-only index: $idx"
    psql_c -c "DROP INDEX IF EXISTS \"$idx\"" || true
  fi
done

echo "==> STEP 3: Repair mismatched tables (table-level truncate + copy from Render)"
repair_table() {
  local table="$1"
  echo "--- repair $table ---"
  psql_c -c "TRUNCATE TABLE \"$table\" CASCADE"
  docker exec "$PG_CONTAINER" pg_dump "$RENDER_DATABASE_URL" \
    --no-owner --no-acl --format=plain --data-only --table="public.$table" \
    > "/tmp/${table}-data.sql"
  docker cp "/tmp/${table}-data.sql" "$PG_CONTAINER:/tmp/${table}-data.sql"
  psql_c -f "/tmp/${table}-data.sql" 2>&1 | tail -5 || true
  src="$(psql_r -tAc "SELECT COUNT(*) FROM \"$table\"")"
  tgt="$(psql_c -tAc "SELECT COUNT(*) FROM \"$table\"")"
  echo "$table render=$src coolify=$tgt"
}

repair_table phonics_content
repair_table startup_funnel_events

echo "==> STEP 3b: analytics_events delta since snapshot (upsert missing rows)"
psql_c <<SQL
INSERT INTO analytics_events
SELECT s.*
FROM dblink(
  '$RENDER_DATABASE_URL',
  'SELECT * FROM analytics_events WHERE created_at >= ''$SNAPSHOT_AT'''
) AS s(analytics_events)
ON CONFLICT (id) DO NOTHING;
SQL
