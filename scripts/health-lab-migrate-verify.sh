#!/usr/bin/env bash
# Amy Health Lab™ — migration + verification script.
# Usage:
#   DATABASE_URL=postgresql://... ./scripts/health-lab-migrate-verify.sh [staging|production]
set -euo pipefail

ENV_LABEL="${1:-unknown}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REPORT="$ROOT/audit/health-lab-migration-log-${ENV_LABEL}-$(date +%Y%m%d-%H%M%S).txt"

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "ERROR: DATABASE_URL is required" >&2
  exit 1
fi

exec > >(tee -a "$REPORT") 2>&1

echo "=== Amy Health Lab Migration ==="
echo "Environment: $ENV_LABEL"
echo "Started: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "Report: $REPORT"
echo ""

echo "--- Step 1: drizzle push ---"
cd "$ROOT"
pnpm db:push
echo "db:push exit: $?"
echo ""

echo "--- Step 2: table exists ---"
node --input-type=module -e "
import pg from 'pg';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.DATABASE_URL.includes('render.com') ? { rejectUnauthorized: false } : undefined });
const table = await pool.query(\"SELECT to_regclass('public.health_lab_progress') IS NOT NULL AS exists\");
console.log('health_lab_progress exists:', table.rows[0]?.exists);
const cols = await pool.query(\"SELECT column_name FROM information_schema.columns WHERE table_name = 'health_lab_progress' ORDER BY ordinal_position\");
console.log('columns:', cols.rows.map(r => r.column_name).join(', '));
await pool.end();
process.exit(table.rows[0]?.exists ? 0 : 1);
"
echo ""

echo "--- Step 3: unique child_id index ---"
node --input-type=module -e "
import pg from 'pg';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.DATABASE_URL.includes('render.com') ? { rejectUnauthorized: false } : undefined });
const idx = await pool.query(\`
  SELECT indexname, indexdef
  FROM pg_indexes
  WHERE tablename = 'health_lab_progress'
  ORDER BY indexname
\`);
for (const row of idx.rows) console.log(row.indexname + ':', row.indexdef);
const hasChildUq = idx.rows.some(r => r.indexname === 'health_lab_progress_child_uq');
console.log('unique child_id index present:', hasChildUq);
await pool.end();
process.exit(hasChildUq ? 0 : 1);
"
echo ""

echo "--- Step 4: duplicate child rows ---"
node --input-type=module -e "
import pg from 'pg';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.DATABASE_URL.includes('render.com') ? { rejectUnauthorized: false } : undefined });
const dup = await pool.query('SELECT child_id, COUNT(*) AS n FROM health_lab_progress GROUP BY child_id HAVING COUNT(*) > 1');
console.log('duplicate child rows:', dup.rowCount);
await pool.end();
process.exit(dup.rowCount === 0 ? 0 : 1);
"
echo ""

echo "--- Step 5: db-verify critical table list ---"
grep -q 'health_lab_progress' "$ROOT/artifacts/api-server/src/lib/db-verify.ts" && echo "db-verify.ts includes health_lab_progress: OK"
echo ""

echo "=== Migration verification PASSED ==="
echo "Finished: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
