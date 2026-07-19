/**
 * Align Coolify sequence last_value with Render for all public sequences.
 */
import { poolFor, requireEnv, verifyConnection } from "./pg-utils";

async function main(): Promise<void> {
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
      const { rows } = await src.query<{ sequencename: string; last_value: string | null }>(
        `SELECT sequencename, last_value::text FROM pg_sequences WHERE schemaname = 'public' ORDER BY sequencename`,
      );
      let applied = 0;
      for (const row of rows) {
        const seq = row.sequencename;
        const last = row.last_value;
        const regclass = `public.${seq}`;
        if (last == null || last === "") {
          await tgt.query(`SELECT setval($1::regclass, 1, false)`, [regclass]);
        } else {
          await tgt.query(`SELECT setval($1::regclass, $2::bigint, true)`, [regclass, last]);
        }
        applied++;
      }
      console.log(`Synced ${applied} sequences from Render`);
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
