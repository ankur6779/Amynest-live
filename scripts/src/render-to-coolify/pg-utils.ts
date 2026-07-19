import pg from "pg";

const { Pool } = pg;

/** Render short hosts need FQDN + sslmode=require; Coolify internal hosts do not. */
export function normalizeDatabaseUrl(url: string): string {
  try {
    const u = new URL(url.trim());
    if (/^dpg-[a-z0-9]+$/i.test(u.hostname) && !u.hostname.includes(".")) {
      u.hostname = `${u.hostname}.singapore-postgres.render.com`;
    }
    if (u.hostname.includes("render.com") && !u.searchParams.has("sslmode")) {
      u.searchParams.set("sslmode", "require");
    }
    return u.toString();
  } catch {
    return url.trim();
  }
}

export function redactDatabaseUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.password) u.password = "***";
    return u.toString();
  } catch {
    return "(invalid url)";
  }
}

export function poolFor(url: string): pg.Pool {
  const normalized = normalizeDatabaseUrl(url);
  const needsSsl =
    /render\.com|neon\.tech|supabase\.co|sslmode=require/i.test(normalized) ||
    process.env.PGSSLMODE === "require";
  return new Pool({
    connectionString: normalized,
    max: 6,
    ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
  });
}

export async function verifyConnection(
  pool: pg.Pool,
  label: string,
  url?: string,
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("SELECT 1");
    const shown = url ? redactDatabaseUrl(url) : label;
    console.log(`✓ ${label} connected (${shown})`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`${label} connection failed: ${msg}`);
  } finally {
    client.release();
  }
}

export async function listPublicTables(client: pg.PoolClient): Promise<string[]> {
  const { rows } = await client.query<{ tablename: string }>(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`,
  );
  return rows.map((r) => r.tablename);
}

export async function countRows(
  client: pg.PoolClient,
  table: string,
): Promise<number> {
  const { rows } = await client.query<{ c: string }>(
    `SELECT COUNT(*)::text AS c FROM "${table}"`,
  );
  return Number(rows[0]?.c ?? 0);
}

export type TableColumn = {
  column_name: string;
  data_type: string;
  is_nullable: string;
};

export async function listTableColumns(
  client: pg.PoolClient,
  table: string,
): Promise<TableColumn[]> {
  const { rows } = await client.query<TableColumn>(
    `
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = $1
    ORDER BY ordinal_position
    `,
    [table],
  );
  return rows;
}

export async function primaryKeyColumns(
  client: pg.PoolClient,
  table: string,
): Promise<string[]> {
  const { rows } = await client.query<{ column_name: string }>(
    `
    SELECT a.attname AS column_name
    FROM pg_index i
    JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
    JOIN pg_class c ON c.oid = i.indrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE i.indisprimary
      AND n.nspname = 'public'
      AND c.relname = $1
    ORDER BY array_position(i.indkey, a.attnum)
    `,
    [table],
  );
  return rows.map((r) => r.column_name);
}

export async function resetSerialSequencesForTable(
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

export async function resetAllSerialSequences(
  client: pg.PoolClient,
  tables: string[],
): Promise<void> {
  for (const table of tables) {
    await resetSerialSequencesForTable(client, table);
  }
}

export type SyncStrategy = "updated_at" | "created_at" | "server_ts" | "full_on_final";

export function detectSyncStrategy(columns: TableColumn[]): SyncStrategy {
  const names = new Set(columns.map((c) => c.column_name));
  if (names.has("updated_at")) return "updated_at";
  if (names.has("created_at")) return "created_at";
  if (names.has("server_ts")) return "server_ts";
  return "full_on_final";
}

export function parseArgs(argv: string[]): Record<string, string | boolean> {
  const out: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      out[key] = true;
    } else {
      out[key] = next;
      i++;
    }
  }
  return out;
}

export function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    console.error(`Missing required env: ${name}`);
    process.exit(1);
  }
  return value;
}
