/**
 * Close row-count gap for a single table by upserting rows with id > target MAX(id).
 */
import {
  countRows,
  poolFor,
  primaryKeyColumns,
  requireEnv,
  resetSerialSequencesForTable,
  verifyConnection,
} from "./pg-utils";

export const HOT_TABLES = [
  "startup_funnel_events",
  "user_devices",
  "family_digital_twin",
  "routine_journey",
  "subscriptions",
  "push_tokens",
  "analytics_events",
] as const;

const DEFAULT_BATCH = 10000;
const DEFAULT_MAX_ROUNDS = 100;

function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

async function upsertBatch(
  table: string,
  target: import("pg").PoolClient,
  pkCols: string[],
  rows: Record<string, unknown>[],
): Promise<void> {
  if (rows.length === 0) return;
  const cols = Object.keys(rows[0]!);
  const colList = cols.map(quoteIdent).join(", ");
  const nonPk = cols.filter((c) => !pkCols.includes(c));
  const conflict = pkCols.map(quoteIdent).join(", ");
  const updateSet = nonPk.map((c) => `${quoteIdent(c)} = EXCLUDED.${quoteIdent(c)}`).join(", ");
  const chunk = 200;
  for (let i = 0; i < rows.length; i += chunk) {
    const slice = rows.slice(i, i + chunk);
    const values: string[] = [];
    const params: unknown[] = [];
    let p = 1;
    for (const row of slice) {
      values.push(`(${cols.map(() => `$${p++}`).join(", ")})`);
      for (const c of cols) params.push(row[c]);
    }
    const sql =
      nonPk.length > 0
        ? `INSERT INTO ${quoteIdent(table)} (${colList}) VALUES ${values.join(", ")} ON CONFLICT (${conflict}) DO UPDATE SET ${updateSet}`
        : `INSERT INTO ${quoteIdent(table)} (${colList}) VALUES ${values.join(", ")} ON CONFLICT (${conflict}) DO NOTHING`;
    await target.query(sql, params);
  }
}

export async function repairTableGap(
  src: import("pg").PoolClient,
  tgt: import("pg").PoolClient,
  table: string,
  opts?: { batchSize?: number; maxRounds?: number; quiet?: boolean },
): Promise<boolean> {
  const batchSize = opts?.batchSize ?? DEFAULT_BATCH;
  const maxRounds = opts?.maxRounds ?? DEFAULT_MAX_ROUNDS;
  const quiet = opts?.quiet ?? false;

  const pkCols = await primaryKeyColumns(src, table);
  if (pkCols.length !== 1 || pkCols[0] !== "id") {
    throw new Error(`Table ${table} needs single-column PK id`);
  }
  const idType = await src.query<{ data_type: string }>(
    `
    SELECT data_type
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = $1 AND column_name = 'id'
    `,
    [table],
  );
  const dtype = idType.rows[0]?.data_type ?? "";
  if (!["integer", "bigint", "smallint"].includes(dtype)) {
    throw new Error(`Table ${table} id column must be integer serial (got ${dtype})`);
  }

  for (let round = 1; round <= maxRounds; round++) {
    const srcCount = await countRows(src, table);
    const tgtCount = await countRows(tgt, table);
    const { rows: maxRow } = await tgt.query<{ m: string }>(
      `SELECT COALESCE(MAX(id), 0)::text AS m FROM ${quoteIdent(table)}`,
    );
    const maxId = Number(maxRow[0]?.m ?? 0);
    if (!quiet) {
      console.log(`  ${table} round ${round}: render=${srcCount} coolify=${tgtCount} maxId=${maxId}`);
    }
    if (srcCount === tgtCount) {
      if (!quiet) console.log(`  MATCH: ${table}`);
      return true;
    }
    const { rows } = await src.query(
      `SELECT * FROM ${quoteIdent(table)} WHERE id > $1 ORDER BY id LIMIT $2`,
      [maxId, batchSize],
    );
    if (rows.length === 0) {
      throw new Error(`${table}: no rows fetched but counts differ (render=${srcCount} coolify=${tgtCount})`);
    }
    await upsertBatch(table, tgt, pkCols, rows as Record<string, unknown>[]);
    await resetSerialSequencesForTable(tgt, table);
  }
  const finalSrc = await countRows(src, table);
  const finalTgt = await countRows(tgt, table);
  return finalSrc === finalTgt;
}

export async function syncSequencesFromRender(
  src: import("pg").PoolClient,
  tgt: import("pg").PoolClient,
): Promise<{ applied: number; snapshot: Array<{ sequencename: string; last_value: string | null }> }> {
  const { rows } = await src.query<{ sequencename: string; last_value: string | null }>(
    `SELECT sequencename, last_value::text FROM pg_sequences WHERE schemaname = 'public' ORDER BY sequencename`,
  );
  for (const row of rows) {
    const regclass = `public.${row.sequencename}`;
    const last = row.last_value;
    if (last == null || last === "") {
      await tgt.query(`SELECT setval($1::regclass, 1, false)`, [regclass]);
    } else {
      await tgt.query(`SELECT setval($1::regclass, $2::bigint, true)`, [regclass, last]);
    }
  }
  return { applied: rows.length, snapshot: rows };
}

async function main(): Promise<void> {
  const table = process.argv[2] ?? "analytics_events";
  const sourceUrl = requireEnv("RENDER_DATABASE_URL");
  const targetUrl = requireEnv("COOLIFY_DATABASE_URL");
  const source = poolFor(sourceUrl);
  const target = poolFor(targetUrl);

  try {
    await verifyConnection(source, "Render");
    await verifyConnection(target, "Coolify");
    const src = await source.connect();
    const tgt = await target.connect();
    try {
      const ok = await repairTableGap(src, tgt, table);
      if (!ok) process.exit(1);
    } finally {
      src.release();
      tgt.release();
    }
  } finally {
    await source.end();
    await target.end();
  }
}

if (process.argv[1]?.includes("repair-table-gap")) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
