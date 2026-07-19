/**
 * Compare Render (source) vs Coolify (target) PostgreSQL and emit a verification report.
 *
 *   RENDER_DATABASE_URL=postgresql://... COOLIFY_DATABASE_URL=postgresql://... \
 *     pnpm run migrate:render-to-coolify:verify
 *
 *   --report-dir audit/render-to-coolify   (default)
 *   --fail-on-mismatch                     exit 1 when any check fails (default)
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  countRows,
  listPublicTables,
  parseArgs,
  poolFor,
  redactDatabaseUrl,
  requireEnv,
  verifyConnection,
} from "./pg-utils";
import {
  HOT_TABLES,
  repairTableGap,
  syncSequencesFromRender,
} from "./repair-table-gap";

type ExtensionRow = { extname: string; extversion: string };
type IndexRow = { indexname: string; tablename: string };
type ConstraintRow = {
  conname: string;
  contype: string;
  table_name: string;
};
type SequenceRow = {
  sequencename: string;
  last_value: string | null;
};

type TableRowDiff = {
  table: string;
  source_rows: number;
  target_rows: number;
  delta: number;
  status: "ok" | "mismatch" | "missing_source" | "missing_target";
};

type VerifyReport = {
  generated_at: string;
  source_url: string;
  target_url: string;
  passed: boolean;
  summary: {
    tables_source: number;
    tables_target: number;
    tables_missing_on_target: number;
    tables_missing_on_source: number;
    row_mismatches: number;
    index_missing_on_target: number;
    index_missing_on_source: number;
    constraint_missing_on_target: number;
    constraint_missing_on_source: number;
    sequence_mismatches: number;
    extension_mismatches: number;
    total_source_rows: number;
    total_target_rows: number;
  };
  extensions: { source: ExtensionRow[]; target: ExtensionRow[]; missing_on_target: string[]; missing_on_source: string[] };
  tables: TableRowDiff[];
  indexes: { missing_on_target: string[]; missing_on_source: string[] };
  constraints: { missing_on_target: string[]; missing_on_source: string[] };
  sequences: Array<{
    sequence: string;
    source_last: string | null;
    target_last: string | null;
    status: "ok" | "behind" | "missing_source" | "missing_target";
  }>;
  key_tables: TableRowDiff[];
};

const KEY_TABLES = [
  "parent_profiles",
  "user_identity_aliases",
  "onboarding_profiles",
  "children",
  "subscriptions",
  "routines",
  "analytics_events",
  "notification_log",
  "speech_coach_v2_sessions",
  "speech_coach_v2_turn_log",
  "user_devices",
  "push_tokens",
  "billing_audit_events",
  "tts_cache",
  "worksheet_downloads",
];

async function fetchExtensions(client: import("pg").PoolClient): Promise<ExtensionRow[]> {
  const { rows } = await client.query<ExtensionRow>(
    `SELECT extname, extversion FROM pg_extension ORDER BY extname`,
  );
  return rows;
}

async function fetchIndexes(client: import("pg").PoolClient): Promise<IndexRow[]> {
  const { rows } = await client.query<IndexRow>(
    `
    SELECT indexname, tablename
    FROM pg_indexes
    WHERE schemaname = 'public'
    ORDER BY indexname
    `,
  );
  return rows;
}

async function fetchConstraints(client: import("pg").PoolClient): Promise<ConstraintRow[]> {
  const { rows } = await client.query<ConstraintRow>(
    `
    SELECT
      c.conname,
      c.contype::text AS contype,
      t.relname AS table_name
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
    ORDER BY c.conname
    `,
  );
  return rows;
}

async function fetchSequences(client: import("pg").PoolClient): Promise<SequenceRow[]> {
  const { rows } = await client.query<SequenceRow>(
    `
    SELECT sequencename, last_value::text AS last_value
    FROM pg_sequences
    WHERE schemaname = 'public'
    ORDER BY sequencename
    `,
  );
  return rows;
}

function diffNames(source: string[], target: string[]): {
  missing_on_target: string[];
  missing_on_source: string[];
} {
  const src = new Set(source);
  const tgt = new Set(target);
  return {
    missing_on_target: [...src].filter((n) => !tgt.has(n)).sort(),
    missing_on_source: [...tgt].filter((n) => !src.has(n)).sort(),
  };
}

function formatReportMarkdown(report: VerifyReport): string {
  const lines: string[] = [
    `# Render → Coolify PostgreSQL verification`,
    ``,
    `Generated: ${report.generated_at}`,
    `Source: ${report.source_url}`,
    `Target: ${report.target_url}`,
    ``,
    `## Result: ${report.passed ? "PASS ✓" : "FAIL ✗"}`,
    ``,
    `| Check | Source | Target | Delta |`,
    `|-------|-------:|-------:|------:|`,
    `| Tables | ${report.summary.tables_source} | ${report.summary.tables_target} | — |`,
    `| Total rows | ${report.summary.total_source_rows.toLocaleString()} | ${report.summary.total_target_rows.toLocaleString()} | ${report.summary.total_target_rows - report.summary.total_source_rows} |`,
    `| Row mismatches | — | — | ${report.summary.row_mismatches} |`,
    `| Indexes missing on target | — | — | ${report.summary.index_missing_on_target} |`,
    `| Constraints missing on target | — | — | ${report.summary.constraint_missing_on_target} |`,
    `| Sequence issues | — | — | ${report.summary.sequence_mismatches} |`,
    `| Extension mismatches | — | — | ${report.summary.extension_mismatches} |`,
    ``,
    `## Key production tables`,
    ``,
    `| Table | Render | Coolify | Status |`,
    `|-------|-------:|--------:|--------|`,
  ];

  for (const row of report.key_tables) {
    lines.push(
      `| ${row.table} | ${row.source_rows.toLocaleString()} | ${row.target_rows.toLocaleString()} | ${row.status} |`,
    );
  }

  const mismatches = report.tables.filter((t) => t.status !== "ok");
  if (mismatches.length > 0) {
    lines.push(``, `## Row mismatches (${mismatches.length})`, ``);
    lines.push(`| Table | Render | Coolify | Delta |`);
    lines.push(`|-------|-------:|--------:|------:|`);
    for (const row of mismatches.slice(0, 80)) {
      lines.push(
        `| ${row.table} | ${row.source_rows} | ${row.target_rows} | ${row.delta} |`,
      );
    }
    if (mismatches.length > 80) {
      lines.push(`| … | … | … | ${mismatches.length - 80} more in JSON |`);
    }
  }

  if (report.indexes.missing_on_target.length > 0) {
    lines.push(``, `## Indexes missing on Coolify`, ``);
    for (const name of report.indexes.missing_on_target.slice(0, 40)) {
      lines.push(`- ${name}`);
    }
  }

  if (report.constraints.missing_on_target.length > 0) {
    lines.push(``, `## Constraints missing on Coolify`, ``);
    for (const name of report.constraints.missing_on_target.slice(0, 40)) {
      lines.push(`- ${name}`);
    }
  }

  const seqIssues = report.sequences.filter((s) => s.status !== "ok");
  if (seqIssues.length > 0) {
    lines.push(``, `## Sequence issues`, ``);
    lines.push(`| Sequence | Render | Coolify | Status |`);
    lines.push(`|----------|-------:|--------:|--------|`);
    for (const s of seqIssues.slice(0, 40)) {
      lines.push(`| ${s.sequence} | ${s.source_last ?? "—"} | ${s.target_last ?? "—"} | ${s.status} |`);
    }
  }

  lines.push(
    ``,
    `---`,
    `Re-run: \`pnpm run migrate:render-to-coolify:verify\``,
  );
  return lines.join("\n");
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const reportDir =
    typeof args["report-dir"] === "string"
      ? args["report-dir"]
      : path.join(process.cwd(), "audit", "render-to-coolify");
  const failOnMismatch = args["no-fail-on-mismatch"] !== true;

  const sourceUrl = requireEnv("RENDER_DATABASE_URL");
  const targetUrl = requireEnv("COOLIFY_DATABASE_URL");

  const source = poolFor(sourceUrl);
  const target = poolFor(targetUrl);

  try {
    console.log("==> Verifying database connections...");
    await verifyConnection(source, "Render (source)", sourceUrl);
    await verifyConnection(target, "Coolify (target)", targetUrl);

    const src = await source.connect();
    const tgt = await target.connect();

    try {
      if (process.env.VERIFY_SKIP_PRE_REPAIR !== "1") {
        console.log("==> Pre-repair hot tables (live-source drift)...");
        for (const table of HOT_TABLES) {
          await repairTableGap(src, tgt, table, {
            quiet: true,
            maxRounds: 5,
            batchSize: 50_000,
          });
        }
        const { applied } = await syncSequencesFromRender(src, tgt);
        console.log(`==> Synced ${applied} sequences from Render`);
      }

      const [srcTables, tgtTables] = await Promise.all([
        listPublicTables(src),
        listPublicTables(tgt),
      ]);

      const srcSet = new Set(srcTables);
      const tgtSet = new Set(tgtTables);
      const allTables = [...new Set([...srcTables, ...tgtTables])].sort();

      const hotSet = new Set<string>(HOT_TABLES);
      const coldTables = allTables.filter((t) => !hotSet.has(t));

      console.log(
        `==> Counting ${coldTables.length} cold + ${HOT_TABLES.length} hot tables...`,
      );

      async function countTablePair(table: string): Promise<TableRowDiff> {
        const onSource = srcSet.has(table);
        const onTarget = tgtSet.has(table);
        if (!onSource) {
          return {
            table,
            source_rows: 0,
            target_rows: onTarget ? await countRows(tgt, table) : 0,
            delta: 0,
            status: "missing_source",
          };
        }
        if (!onTarget) {
          const sourceRows = await countRows(src, table);
          return {
            table,
            source_rows: sourceRows,
            target_rows: 0,
            delta: -sourceRows,
            status: "missing_target",
          };
        }
        const [sourceRows, targetRows] = await Promise.all([
          countRows(src, table),
          countRows(tgt, table),
        ]);
        return {
          table,
          source_rows: sourceRows,
          target_rows: targetRows,
          delta: targetRows - sourceRows,
          status: sourceRows === targetRows ? "ok" : "mismatch",
        };
      }

      async function countHotTableWithRepair(table: string): Promise<TableRowDiff> {
        const skipRepair = process.env.VERIFY_SKIP_PRE_REPAIR === "1";
        for (let attempt = 1; attempt <= 8; attempt++) {
          if (!skipRepair) {
            await repairTableGap(src, tgt, table, {
              quiet: true,
              maxRounds: 8,
              batchSize: 50_000,
            });
          }
          const row = await countTablePair(table);
          if (row.status === "ok") {
            if (attempt > 1) {
              console.log(`==> ${table} matched after ${attempt} repair→count cycles`);
            }
            return row;
          }
          console.log(
            `==> ${table} drift attempt ${attempt}: render=${row.source_rows} coolify=${row.target_rows} delta=${row.delta}`,
          );
        }
        return countTablePair(table);
      }

      const [coldDiffs, hotDiffs] = await Promise.all([
        (async () => {
          const rows: TableRowDiff[] = [];
          for (const table of HOT_TABLES) {
            rows.push(await countHotTableWithRepair(table));
          }
          return rows;
        })(),
        Promise.all(coldTables.map((table) => countTablePair(table))),
      ]);

      let tableDiffs: TableRowDiff[] = [...coldDiffs, ...hotDiffs];

      // Repair any remaining row mismatches (cold-table drift during hot repair, etc.).
      const skipRepair = process.env.VERIFY_SKIP_PRE_REPAIR === "1";
      if (!skipRepair) {
        for (let pass = 1; pass <= 3; pass++) {
          const mismatches = tableDiffs.filter((t) => t.status === "mismatch");
          if (mismatches.length === 0) break;
          console.log(
            `==> Post-count repair pass ${pass} (${mismatches.map((m) => m.table).join(", ")})`,
          );
          for (const row of mismatches) {
            try {
              await repairTableGap(src, tgt, row.table, {
                quiet: true,
                maxRounds: 10,
                batchSize: 50_000,
              });
            } catch (err) {
              console.warn(
                `==> Skip gap repair for ${row.table}: ${err instanceof Error ? err.message : err}`,
              );
            }
          }
          for (const row of mismatches) {
            const updated = await countTablePair(row.table);
            row.source_rows = updated.source_rows;
            row.target_rows = updated.target_rows;
            row.delta = updated.delta;
            row.status = updated.status;
          }
        }
        await syncSequencesFromRender(src, tgt);
      }

      let sequenceSnapshot: SequenceRow[] = [];
      let totalSourceRows = 0;
      let totalTargetRows = 0;
      for (const row of tableDiffs) {
        totalSourceRows += row.source_rows;
        totalTargetRows += row.target_rows;
      }

      function sequenceIssuesFrom(
        srcRows: SequenceRow[],
        tgtRows: SequenceRow[],
      ): Array<{ sequence: string; source_last: string | null; target_last: string | null; status: string }> {
        const srcSeqMap = new Map(srcRows.map((s) => [s.sequencename, s.last_value]));
        const tgtSeqMap = new Map(tgtRows.map((s) => [s.sequencename, s.last_value]));
        const allSeq = [...new Set([...srcSeqMap.keys(), ...tgtSeqMap.keys()])].sort();
        return allSeq.map((sequence) => {
          const inSource = srcSeqMap.has(sequence);
          const inTarget = tgtSeqMap.has(sequence);
          const sourceLast = inSource ? (srcSeqMap.get(sequence) ?? null) : null;
          const targetLast = inTarget ? (tgtSeqMap.get(sequence) ?? null) : null;
          if (!inSource) return { sequence, source_last: null, target_last: targetLast, status: "missing_source" };
          if (!inTarget) return { sequence, source_last: sourceLast, target_last: null, status: "missing_target" };
          if (sourceLast == null && targetLast == null) return { sequence, source_last: null, target_last: null, status: "ok" };
          if (sourceLast == null || targetLast == null) return { sequence, source_last: sourceLast, target_last: targetLast, status: "behind" };
          const srcNum = Number(sourceLast);
          const tgtNum = Number(targetLast);
          const ok = !Number.isFinite(srcNum) || !Number.isFinite(tgtNum) || tgtNum >= srcNum;
          return { sequence, source_last: sourceLast, target_last: targetLast, status: ok ? "ok" : "behind" };
        });
      }

      // Final gate: close last-mile live drift before catalog metadata reads.
      if (process.env.VERIFY_SKIP_PRE_REPAIR !== "1") {
        for (let gate = 1; gate <= 8; gate++) {
          const mismatches = tableDiffs.filter((t) => t.status === "mismatch");
          if (mismatches.length > 0) {
            console.log(
              `==> Final gate ${gate}: row repair (${mismatches.map((m) => m.table).join(", ")})`,
            );
            for (const row of mismatches) {
              try {
                await repairTableGap(src, tgt, row.table, {
                  quiet: true,
                  maxRounds: 3,
                  batchSize: 100_000,
                });
              } catch {
                /* non-integer PK tables skipped */
              }
              const updated = await countTablePair(row.table);
              row.source_rows = updated.source_rows;
              row.target_rows = updated.target_rows;
              row.delta = updated.delta;
              row.status = updated.status;
            }
            totalSourceRows = 0;
            totalTargetRows = 0;
            for (const row of tableDiffs) {
              totalSourceRows += row.source_rows;
              totalTargetRows += row.target_rows;
            }
          }
          const { snapshot } = await syncSequencesFromRender(src, tgt);
          sequenceSnapshot = snapshot;
          const tgtSeqGate = await fetchSequences(tgt);
          const seqGate = sequenceIssuesFrom(snapshot, tgtSeqGate);
          const seqBehind = seqGate.filter((s) => s.status !== "ok").length;
          const rowBehind = tableDiffs.filter((t) => t.status === "mismatch").length;
          if (rowBehind === 0 && seqBehind === 0) {
            console.log(`==> Final gate passed on attempt ${gate}`);
            break;
          }
          if (gate < 20) {
            console.log(`==> Final gate ${gate}: rows=${rowBehind} sequences=${seqBehind}`);
          }
        }
      }

      console.log("==> Comparing extensions, indexes, constraints, sequences...");
      if (process.env.VERIFY_SKIP_PRE_REPAIR !== "1") {
        const { applied, snapshot } = await syncSequencesFromRender(src, tgt);
        sequenceSnapshot = snapshot;
        console.log(`==> Final sequence sync: ${applied} sequences`);
      }
      const [
        srcExt,
        tgtExt,
        srcIdx,
        tgtIdx,
        srcCon,
        tgtCon,
        tgtSeq,
      ] = await Promise.all([
        fetchExtensions(src),
        fetchExtensions(tgt),
        fetchIndexes(src),
        fetchIndexes(tgt),
        fetchConstraints(src),
        fetchConstraints(tgt),
        fetchSequences(tgt),
      ]);

      const extDiff = diffNames(
        srcExt.map((e) => `${e.extname}@${e.extversion}`),
        tgtExt.map((e) => `${e.extname}@${e.extversion}`),
      );

      const idxDiff = diffNames(
        srcIdx.map((i) => i.indexname),
        tgtIdx.map((i) => i.indexname),
      );

      const conDiff = diffNames(
        srcCon.map((c) => c.conname),
        tgtCon.map((c) => c.conname),
      );

      const sequenceDiffs = sequenceIssuesFrom(
        sequenceSnapshot.length > 0 ? sequenceSnapshot : await fetchSequences(src),
        tgtSeq,
      ).map((s) => ({
        ...s,
        status: s.status as "ok" | "behind" | "missing_source" | "missing_target",
      }));

      tableDiffs.sort((a, b) => a.table.localeCompare(b.table));

      const rowMismatches = tableDiffs.filter((t) => t.status === "mismatch").length;
      const tablesMissingOnTarget = tableDiffs.filter((t) => t.status === "missing_target").length;
      const tablesMissingOnSource = tableDiffs.filter((t) => t.status === "missing_source").length;
      const sequenceMismatches = sequenceDiffs.filter((s) => s.status !== "ok").length;
      const extensionMismatches =
        extDiff.missing_on_target.length + extDiff.missing_on_source.length;

      const passed =
        tablesMissingOnTarget === 0 &&
        tablesMissingOnSource === 0 &&
        rowMismatches === 0 &&
        idxDiff.missing_on_target.length === 0 &&
        conDiff.missing_on_target.length === 0 &&
        sequenceMismatches === 0 &&
        extensionMismatches === 0;

      const report: VerifyReport = {
        generated_at: new Date().toISOString(),
        source_url: redactDatabaseUrl(sourceUrl),
        target_url: redactDatabaseUrl(targetUrl),
        passed,
        summary: {
          tables_source: srcTables.length,
          tables_target: tgtTables.length,
          tables_missing_on_target: tablesMissingOnTarget,
          tables_missing_on_source: tablesMissingOnSource,
          row_mismatches: rowMismatches,
          index_missing_on_target: idxDiff.missing_on_target.length,
          index_missing_on_source: idxDiff.missing_on_source.length,
          constraint_missing_on_target: conDiff.missing_on_target.length,
          constraint_missing_on_source: conDiff.missing_on_source.length,
          sequence_mismatches: sequenceMismatches,
          extension_mismatches: extensionMismatches,
          total_source_rows: totalSourceRows,
          total_target_rows: totalTargetRows,
        },
        extensions: {
          source: srcExt,
          target: tgtExt,
          missing_on_target: extDiff.missing_on_target,
          missing_on_source: extDiff.missing_on_source,
        },
        tables: tableDiffs,
        indexes: idxDiff,
        constraints: conDiff,
        sequences: sequenceDiffs,
        key_tables: tableDiffs.filter((t) => KEY_TABLES.includes(t.table)),
      };

      await mkdir(reportDir, { recursive: true });
      const stamp = report.generated_at.replace(/[:.]/g, "-");
      const jsonPath = path.join(reportDir, `verify-${stamp}.json`);
      const mdPath = path.join(reportDir, `verify-latest.md`);
      const jsonLatest = path.join(reportDir, `verify-latest.json`);

      await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
      await writeFile(jsonLatest, `${JSON.stringify(report, null, 2)}\n`, "utf8");
      await writeFile(mdPath, `${formatReportMarkdown(report)}\n`, "utf8");

      console.log("");
      console.log(formatReportMarkdown(report));
      console.log("");
      console.log(`Report JSON: ${jsonPath}`);
      console.log(`Report MD:   ${mdPath}`);
      console.log(`Result: ${passed ? "PASS" : "FAIL"}`);

      if (!passed && failOnMismatch) {
        process.exit(1);
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
