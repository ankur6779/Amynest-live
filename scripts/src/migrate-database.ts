/**
 * Copy all public tables from SOURCE_DATABASE_URL → DATABASE_URL (Render Postgres).
 *
 * Usage:
 *   SOURCE_DATABASE_URL="postgresql://..." DATABASE_URL="postgresql://..." \
 *     pnpm run db:migrate
 *
 *   pnpm run db:migrate -- --dry-run       # counts only
 *   pnpm run db:migrate -- --replace       # truncate target, then copy
 *   pnpm run db:migrate -- --push-schema   # optional drizzle push (usually skip)
 *
 * Run from Replit Shell when source is @helium/... (not from Mac).
 */
import pg from "pg";

const { Pool } = pg;

const SOURCE_URL = process.env.SOURCE_DATABASE_URL?.trim();
const TARGET_URL = process.env.DATABASE_URL?.trim();

const dryRun = process.argv.includes("--dry-run");
const replace = process.argv.includes("--replace");
const pushSchemaFlag = process.argv.includes("--push-schema");

/** Render dashboard sometimes shows a short host; external clients need the FQDN + SSL. */
function normalizeDatabaseUrl(url: string): string {
  try {
    const u = new URL(url);
    if (/^dpg-[a-z0-9]+$/i.test(u.hostname) && !u.hostname.includes(".")) {
      u.hostname = `${u.hostname}.singapore-postgres.render.com`;
    }
    if (u.hostname.includes("render.com") && !u.searchParams.has("sslmode")) {
      u.searchParams.set("sslmode", "require");
    }
    return u.toString();
  } catch {
    return url;
  }
}

function poolFor(url: string) {
  const normalized = normalizeDatabaseUrl(url);
  const needsSsl =
    /render\.com|neon\.tech|supabase\.co|sslmode=require/i.test(normalized) ||
    process.env.PGSSLMODE === "require";
  return new Pool({
    connectionString: normalized,
    max: 4,
    ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
  });
}

async function listTables(client: pg.PoolClient): Promise<string[]> {
  const { rows } = await client.query<{ tablename: string }>(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`,
  );
  return rows.map((r) => r.tablename);
}

async function countRows(
  client: pg.PoolClient,
  table: string,
): Promise<number> {
  const { rows } = await client.query<{ c: string }>(
    `SELECT COUNT(*)::text AS c FROM "${table}"`,
  );
  return Number(rows[0]?.c ?? 0);
}

async function truncateAll(client: pg.PoolClient): Promise<void> {
  await client.query(`
    DO $$ DECLARE r RECORD;
    BEGIN
      FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'TRUNCATE TABLE ' || quote_ident(r.tablename) || ' CASCADE';
      END LOOP;
    END $$;
  `);
}

async function resetSerialSequences(
  client: pg.PoolClient,
  table: string,
): Promise<void> {
  const { rows } = await client.query<{ column_name: string }>(
    `
    SELECT a.attname AS column_name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_attribute a ON a.attrelid = c.oid
    JOIN pg_attrdef d ON d.adrelid = c.oid AND d.adnum = a.attnum
    WHERE n.nspname = 'public'
      AND c.relname = $1
      AND pg_get_expr(d.adbin, d.adrelid) LIKE 'nextval%'
    `,
    [table],
  );
  for (const { column_name } of rows) {
    await client.query(
      `
      SELECT setval(
        pg_get_serial_sequence($1, $2),
        COALESCE((SELECT MAX("${column_name}") FROM "${table}"), 1),
        (SELECT COUNT(*) > 0 FROM "${table}")
      )
      `,
      [table, column_name],
    );
  }
}

async function copyTable(
  source: pg.PoolClient,
  target: pg.PoolClient,
  table: string,
): Promise<number> {
  const { rows } = await source.query(`SELECT * FROM "${table}"`);
  if (rows.length === 0) return 0;

  const cols = Object.keys(rows[0] as Record<string, unknown>);
  const colList = cols.map((c) => `"${c}"`).join(", ");
  const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
  const insertSql = `INSERT INTO "${table}" (${colList}) VALUES (${placeholders})`;

  const chunk = 50;
  for (let i = 0; i < rows.length; i += chunk) {
    const batch = rows.slice(i, i + chunk) as Record<string, unknown>[];
    for (const row of batch) {
      const values = cols.map((c) => row[c]);
      await target.query(insertSql, values);
    }
  }
  await resetSerialSequences(target, table);
  return rows.length;
}

async function verifyPool(pool: pg.Pool, label: string): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("SELECT 1");
    console.log(`✓ ${label} connected`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (label === "Source" && /@helium\b|ENOTFOUND helium/i.test(`${SOURCE_URL} ${msg}`)) {
      console.error(
        "\nSource URL uses @helium — that host only works inside Replit.\n" +
          "Open your Replit project → Shell, then run the same migrate command there.\n",
      );
    }
    throw new Error(`${label} connection failed: ${msg}`);
  } finally {
    client.release();
  }
}

async function pushSchema(): Promise<boolean> {
  const { execSync } = await import("node:child_process");
  const dbUrl = normalizeDatabaseUrl(TARGET_URL!);
  try {
    execSync("pnpm --filter @workspace/db push", {
      stdio: "inherit",
      env: { ...process.env, DATABASE_URL: dbUrl },
    });
    return true;
  } catch {
    console.warn(
      "\n⚠ drizzle-kit push failed (common from local Mac / strict SSL).\n" +
        "  Schema on Render is usually already synced by API deploy — continuing data copy.\n" +
        "  To retry schema sync from Replit: pnpm run db:migrate -- --push-schema\n",
    );
    return false;
  }
}

async function main(): Promise<void> {
  if (!SOURCE_URL) {
    console.error(
      "Missing SOURCE_DATABASE_URL (Replit/old Postgres connection string).",
    );
    process.exit(1);
  }
  if (!TARGET_URL) {
    console.error(
      "Missing DATABASE_URL (Render Postgres — copy from dashboard → amynest-db).",
    );
    process.exit(1);
  }

  const source = poolFor(SOURCE_URL);
  const target = poolFor(TARGET_URL);

  try {
    console.log("==> Checking database connections...");
    await verifyPool(source, "Source (Replit)");
    await verifyPool(target, "Target (Render)");

    if (!dryRun && pushSchemaFlag) {
      console.log("\n==> Syncing schema on target (drizzle push)...");
      await pushSchema();
    } else if (!dryRun) {
      console.log(
        "\n==> Skipping schema push (Render API deploy already runs drizzle push).\n" +
          "    Add --push-schema only if tables are missing on Render.\n",
      );
    }

    const srcClient = await source.connect();
    const tgtClient = await target.connect();

    try {
      const tables = await listTables(srcClient);
      console.log(`Found ${tables.length} tables on source.\n`);

      const keyTables = [
        "children",
        "parent_profiles",
        "onboarding_profiles",
        "routines",
        "subscriptions",
      ];

      console.log("Source row counts (key tables):");
      for (const t of keyTables) {
        if (!tables.includes(t)) continue;
        console.log(`  ${t}: ${await countRows(srcClient, t)}`);
      }
      console.log("");

      if (dryRun) {
        console.log("Dry run — no data copied. Re-run without --dry-run to migrate.");
        return;
      }

      if (replace) {
        console.log("==> Truncating all tables on target (--replace)...");
        await truncateAll(tgtClient);
      }

      console.log("==> Copying tables...");
      let copied = 0;
      for (const table of tables) {
        const n = await countRows(srcClient, table);
        if (n === 0) continue;
        process.stdout.write(`  ${table} (${n})... `);
        try {
          const inserted = await copyTable(srcClient, tgtClient, table);
          console.log(`ok (${inserted} rows)`);
          copied += inserted;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          if (!replace && /duplicate key|unique constraint/i.test(msg)) {
            console.log(`skip (conflict — use --replace to overwrite)`);
          } else {
            throw err;
          }
        }
      }

      console.log(`\nCopied ${copied} rows total.\n`);
      console.log("Target row counts (key tables):");
      const tgtTables = await listTables(tgtClient);
      for (const t of keyTables) {
        if (!tgtTables.includes(t)) continue;
        console.log(`  ${t}: ${await countRows(tgtClient, t)}`);
      }
      console.log("\nDone.");
    } finally {
      srcClient.release();
      tgtClient.release();
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
