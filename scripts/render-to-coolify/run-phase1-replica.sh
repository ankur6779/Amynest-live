#!/usr/bin/env bash
# Phase 1 orchestration — run ON Coolify host (188.245.208.126)
# Sources Render URL from worker host; does not touch DNS/Cloudflare/Render uptime.
set -euo pipefail

WORKER_HOST="${WORKER_HOST:-167.233.39.146}"
SSH_KEY="${HETZNER_SSH_KEY:-$HOME/.ssh/id_ed25519_hetzner}"
PG_CONTAINER="${PG_CONTAINER:-tcl9udyxcuq2zu598ebj0pfu}"
MIGRATION_DIR="${MIGRATION_DIR:-/data/coolify/migration}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
DUMP_FILE="$MIGRATION_DIR/dumps/render-prod-${STAMP}.dump"
AUDIT_DIR="$MIGRATION_DIR/audit"

mkdir -p "$MIGRATION_DIR/dumps" "$AUDIT_DIR"

echo "==> Resolving Render DATABASE_URL"
if [[ -n "${RENDER_DATABASE_URL:-}" ]]; then
  echo "  (provided via environment)"
else
  echo "  (fetching from worker host)"
  RENDER_DATABASE_URL="$(ssh -i "$SSH_KEY" -o IdentitiesOnly=yes -o BatchMode=yes "root@$WORKER_HOST" \
    'grep -m1 "^DATABASE_URL=" /opt/amynest/worker.env | cut -d= -f2-')"
fi
if [[ -z "${RENDER_DATABASE_URL:-}" ]]; then
  echo "Failed to resolve RENDER DATABASE_URL."
  exit 1
fi

COOLIFY_PASS="$(python3 -c "import re; print(re.search(r'POSTGRES_PASSWORD=(\S+)', open('/data/coolify/databases/${PG_CONTAINER}/docker-compose.yml').read()).group(1))")"
PG_IP="$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' "$PG_CONTAINER")"
COOLIFY_DATABASE_URL="postgresql://postgres:${COOLIFY_PASS}@${PG_IP}:5432/postgres"

echo "==> Render spot checks"
for table in parent_profiles subscriptions children analytics_events notification_log user_devices; do
  c="$(docker exec "$PG_CONTAINER" psql "$RENDER_DATABASE_URL" -tAc "SELECT COUNT(*) FROM \"$table\"" 2>/dev/null || echo "?")"
  echo "  render $table: $c"
done

echo "==> pg_dump Render (custom format) → $DUMP_FILE"
docker exec "$PG_CONTAINER" rm -f /tmp/render-prod.dump
docker exec "$PG_CONTAINER" pg_dump "$RENDER_DATABASE_URL" \
  --no-owner \
  --no-acl \
  --format=custom \
  --verbose \
  --file=/tmp/render-prod.dump
docker cp "$PG_CONTAINER:/tmp/render-prod.dump" "$DUMP_FILE"
docker exec "$PG_CONTAINER" rm -f /tmp/render-prod.dump

BYTES="$(stat -c%s "$DUMP_FILE" 2>/dev/null || stat -f%z "$DUMP_FILE")"
SHA256="$(sha256sum "$DUMP_FILE" | awk '{print $1}')"
TOC_TABLES="$(docker exec "$PG_CONTAINER" pg_restore -l "$DUMP_FILE" 2>/dev/null | grep -c 'TABLE DATA' || echo 0)"
RENDER_TOTAL="$(docker exec "$PG_CONTAINER" psql "$RENDER_DATABASE_URL" -tAc \
  "SELECT COALESCE(SUM(n_live_tup),0)::bigint FROM pg_stat_user_tables")"

echo "DUMP_BYTES=$BYTES"
echo "DUMP_SHA256=$SHA256"
echo "DUMP_TABLE_DATA_ENTRIES=$TOC_TABLES"
echo "RENDER_ESTIMATED_ROWS=$RENDER_TOTAL"

cat > "$AUDIT_DIR/backup-report.md" <<EOF
# Production backup report — Render PostgreSQL

**Generated:** $(date -u +%Y-%m-%dT%H:%M:%SZ)

## Backup

| Field | Value |
|-------|-------|
| Source | Render \`amynest-db-dykj\` (dpg-d85k80jtqb8s7382m7lg-a) |
| Format | PostgreSQL custom (\`pg_dump -Fc\`) |
| File | \`$DUMP_FILE\` |
| Size (bytes) | $BYTES |
| SHA-256 | \`$SHA256\` |
| TABLE DATA entries in TOC | $TOC_TABLES |
| Render row estimate (pg_stat) | $RENDER_TOTAL |

## Spot checks (Render)

EOF

for table in parent_profiles subscriptions children analytics_events notification_log user_devices speech_coach_v2_sessions billing_audit_events tts_cache routines; do
  c="$(docker exec "$PG_CONTAINER" psql "$RENDER_DATABASE_URL" -tAc "SELECT COUNT(*) FROM \"$table\"" 2>/dev/null || echo "?")"
  echo "- \`$table\`: $c" >> "$AUDIT_DIR/backup-report.md"
done

echo "==> Truncating Coolify public tables (--replace)"
docker exec "$PG_CONTAINER" psql "$COOLIFY_DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
DO $$ DECLARE r RECORD;
BEGIN
  FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
    EXECUTE 'TRUNCATE TABLE ' || quote_ident(r.tablename) || ' CASCADE';
  END LOOP;
END $$;
SQL

echo "==> pg_restore --data-only to Coolify"
docker cp "$DUMP_FILE" "$PG_CONTAINER:/tmp/restore.dump"
docker exec "$PG_CONTAINER" pg_restore \
  -d "$COOLIFY_DATABASE_URL" \
  --no-owner \
  --no-acl \
  --data-only \
  --disable-triggers \
  --verbose \
  /tmp/restore.dump 2>&1 | tail -30 || true
docker exec "$PG_CONTAINER" rm -f /tmp/restore.dump

echo "==> Fix sequences on Coolify"
docker exec "$PG_CONTAINER" psql "$COOLIFY_DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
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

echo "==> Coolify spot checks"
for table in parent_profiles subscriptions children analytics_events notification_log user_devices; do
  c="$(docker exec "$PG_CONTAINER" psql "$COOLIFY_DATABASE_URL" -tAc "SELECT COUNT(*) FROM \"$table\"" 2>/dev/null || echo "?")"
  echo "  coolify $table: $c"
done

cat > "$MIGRATION_DIR/snapshot.json" <<EOF
{
  "version": 1,
  "label": "initial-copy",
  "snapshot_at": "$(date -u +%Y-%m-%dT%H:%M:%S.000Z)",
  "dump_file": "$DUMP_FILE",
  "dump_sha256": "$SHA256",
  "dump_bytes": $BYTES
}
EOF

echo "==> Phase 1 restore complete"
echo "DUMP_FILE=$DUMP_FILE"
echo "COOLIFY_DATABASE_URL_HOST=postgresql://postgres:***@${PG_IP}:5432/postgres"
