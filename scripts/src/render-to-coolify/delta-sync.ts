/**
 * Incremental sync: copy rows created/updated on Render after the initial snapshot.
 *
 *   RENDER_DATABASE_URL=postgresql://... COOLIFY_DATABASE_URL=postgresql://... \
 *     pnpm run migrate:render-to-coolify:delta
 *
 * Flags:
 *   --final          Also re-copy tables with no timestamp column (full table replace)
 *   --dry-run        Print planned work only
 *   --since ISO8601  Override snapshot time (default: audit/render-to-coolify/snapshot.json)
 */
import { writeFile } from "node:fs/promises";
import path from "node:path";
import {
  countRows,
  detectSyncStrategy,
  listPublicTables,
  listTableColumns,
  parseArgs,
  poolFor,
  primaryKeyColumns,
  resetSerialSequencesForTable,
  requireEnv,
  verifyConnection,
  type SyncStrategy,
} from "./pg-utils";
import { readSnapshot } from "./snapshot";

type SyncPlan = {
  table: string;
  strategy: SyncStrategy;
  source_rows: number;
  changed_rows: number;
  action: "upsert" | "full_replace" | "skip";
};

function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

async function upsertRows(
  source: import("pg").PoolClient,
  target: import("pg").PoolClient,
  table: string,
  pkCols: string[],
  whereSql: string,
  params: unknown[],
): Promise<number> {
  const { rows } = await source.query(`SELECT * FROM ${quoteIdent(table)} WHERE ${whereSql}`, params);
  if (rows.length === 0) return 0;

  const cols = Object.keys(rows[0] as Record<string, unknown>);
  const colList = cols.map(quoteIdent).join(", ");
  const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
  const nonPk = cols.filter((c) => !pkCols.includes(c));
  const updateSet = nonPk.map((c) => `${quoteIdent(c)} = EXCLUDED.${quoteIdent(c)}`).join(", ");
  const conflict = pkCols.map(quoteIdent).join(", ");

  const sql =
    nonPk.length > 0
      ? `
        INSERT INTO ${quoteIdent(table)} (${colList})
        VALUES (${placeholders})
        ON CONFLICT (${conflict}) DO UPDATE SET ${updateSet}
      `
      : `
        INSERT INTO ${quoteIdent(table)} (${colList})
        VALUES (${placeholders})
        ON CONFLICT (${conflict}) DO NOTHING
      `;

  let applied = 0;
  for (const row of rows as Record<string, unknown>[]) {
    const values = cols.map((c) => row[c]);
    await target.query(sql, values);
    applied++;
  }
  await resetSerialSequencesForTable(target, table);
  return applied;
}

async function fullReplaceTable(
  source: import("pg").PoolClient,
  target: import("pg").PoolClient,
  table: string,
): Promise<number> {
  await target.query(`TRUNCATE TABLE ${quoteIdent(table)} CASCADE`);
  const { rows } = await source.query(`SELECT * FROM ${quoteIdent(table)}`);
  if (rows.length === 0) return 0;

  const cols = Object.keys(rows[0] as Record<string, unknown>);
  const colList = cols.map(quoteIdent).join(", ");
  const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
  const insertSql = `INSERT INTO ${quoteIdent(table)} (${colList}) VALUES (${placeholders})`;

  for (const row of rows as Record<string, unknown>[]) {
    await target.query(insertSql, cols.map((c) => row[c]));
  }
  await resetSerialSequencesForTable(target, table);
  return rows.length;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const dryRun = args["dry-run"] === true;
  const finalPass = args.final === true;
  const sinceArg = typeof args.since === "string" ? args.since : null;

  const sourceUrl = requireEnv("RENDER_DATABASE_URL");
  const targetUrl = requireEnv("COOLIFY_DATABASE_URL");

  const snapshot = await readSnapshot();
  const since = sinceArg ?? snapshot.snapshot_at;
  const sinceDate = new Date(since);
  if (Number.isNaN(sinceDate.getTime())) {
    console.error(`Invalid snapshot time: ${since}`);
    process.exit(1);
  }

  const source = poolFor(sourceUrl);
  const target = poolFor(targetUrl);

  try {
    console.log(`==> Delta sync since ${since}`);
    await verifyConnection(source, "Render (source)", sourceUrl);
    await verifyConnection(target, "Coolify (target)", targetUrl);

    const src = await source.connect();
    const tgt = await target.connect();

    try {
      const tables = await listPublicTables(src);
      const plans: SyncPlan[] = [];
      let totalApplied = 0;

      for (const table of tables) {
        const columns = await listTableColumns(src, table);
        const strategy = detectSyncStrategy(columns);
        const pkCols = await primaryKeyColumns(src, table);
        const sourceRows = await countRows(src, table);

        if (sourceRows === 0) {
          plans.push({ table, strategy, source_rows: 0, changed_rows: 0, action: "skip" });
          continue;
        }

        if (pkCols.length === 0) {
          if (!finalPass) {
            plans.push({
              table,
              strategy,
              source_rows: sourceRows,
              changed_rows: 0,
              action: "skip",
            });
            continue;
          }
          plans.push({
            table,
            strategy: "full_on_final",
            source_rows: sourceRows,
            changed_rows: sourceRows,
            action: "full_replace",
          });
          if (!dryRun) {
            const n = await fullReplaceTable(src, tgt, table);
            totalApplied += n;
            console.log(`  ${table}: full replace (${n} rows)`);
          }
          continue;
        }

        if (strategy === "full_on_final" && !finalPass) {
          plans.push({
            table,
            strategy,
            source_rows: sourceRows,
            changed_rows: 0,
            action: "skip",
          });
          continue;
        }

        if (strategy === "full_on_final" && finalPass) {
          plans.push({
            table,
            strategy,
            source_rows: sourceRows,
            changed_rows: sourceRows,
            action: "full_replace",
          });
          if (!dryRun) {
            const n = await fullReplaceTable(src, tgt, table);
            totalApplied += n;
            console.log(`  ${table}: full replace (${n} rows)`);
          }
          continue;
        }

        const tsCol =
          strategy === "updated_at"
            ? "updated_at"
            : strategy === "server_ts"
              ? "server_ts"
              : "created_at";
        const { rows: countRowsResult } = await src.query<{ c: string }>(
          `SELECT COUNT(*)::text AS c FROM ${quoteIdent(table)} WHERE ${quoteIdent(tsCol)} >= $1`,
          [sinceDate],
        );
        const changed = Number(countRowsResult[0]?.c ?? 0);

        plans.push({
          table,
          strategy,
          source_rows: sourceRows,
          changed_rows: changed,
          action: changed > 0 ? "upsert" : "skip",
        });

        if (changed > 0 && !dryRun) {
          const n = await upsertRows(
            src,
            tgt,
            table,
            pkCols,
            `${quoteIdent(tsCol)} >= $1`,
            [sinceDate],
          );
          totalApplied += n;
          console.log(`  ${table}: upsert ${n} rows (${strategy})`);
        }
      }

      const report = {
        generated_at: new Date().toISOString(),
        since,
        final_pass: finalPass,
        dry_run: dryRun,
        tables_processed: plans.length,
        rows_applied: totalApplied,
        plans,
      };

      const reportDir = path.join(process.cwd(), "audit", "render-to-coolify");
      const stamp = report.generated_at.replace(/[:.]/g, "-");
      await writeFile(
        path.join(reportDir, `delta-${stamp}.json`),
        `${JSON.stringify(report, null, 2)}\n`,
        "utf8",
      );
      await writeFile(
        path.join(reportDir, "delta-latest.json"),
        `${JSON.stringify(report, null, 2)}\n`,
        "utf8",
      );

      const pending = plans.filter((p) => p.action === "skip" && p.strategy === "full_on_final");
      console.log("");
      console.log(`Delta sync complete. Rows applied: ${totalApplied}`);
      if (pending.length > 0 && !finalPass) {
        console.log(
          `${pending.length} tables without timestamps will sync on --final pass.`,
        );
      }
      if (dryRun) {
        console.log("Dry run — no writes performed.");
      }
    } finally {
      src.release();
      tgt.release();
    }
  } finally {
    await source.end();
    await target.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
