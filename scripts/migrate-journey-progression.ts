#!/usr/bin/env npx tsx
/**
 * Reading Journey progression migration — documents server-side audit for
 * age-seeded curriculum rows. Does NOT delete progress; UI now ignores
 * age-implied completion when masteryScore is 0 and no activity history.
 *
 * Usage:
 *   DATABASE_URL=postgresql://... npx tsx scripts/migrate-journey-progression.ts
 *   DATABASE_URL=... npx tsx scripts/migrate-journey-progression.ts --dry-run
 */
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { phonicsCurriculumProgressTable } from "@workspace/db";

const DRY_RUN = process.argv.includes("--dry-run");

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }

  const pool = new pg.Pool({ connectionString: url });
  const db = drizzle(pool);

  const rows = await db.select().from(phonicsCurriculumProgressTable);

  let ageSeeded = 0;
  let earned = 0;

  for (const row of rows) {
    const hasEarned =
      row.masteryScore > 0 ||
      row.streak > 0 ||
      row.lastTestAt != null ||
      (Array.isArray(row.weakPhonemes) && row.weakPhonemes.length > 0);

    if (!hasEarned && row.currentLevel > 1) {
      ageSeeded += 1;
      if (!DRY_RUN) {
        // Preserve currentLevel as recommended-start anchor; client UI no longer
        // marks prior stages complete without earned mastery proof.
        console.log(
          `[journey-migration] child=${row.childId} level=${row.currentLevel} mastery=0 → UI review mode (no DB change)`,
        );
      }
    } else {
      earned += 1;
    }
  }

  console.log(
    JSON.stringify(
      {
        dryRun: DRY_RUN,
        totalRows: rows.length,
        ageSeededRecommendedOnly: ageSeeded,
        earnedProgressRows: earned,
        clientMigration: "localStorage amynest:phonics-v2-journey:* bumps progressionModelVersion to 2 on next load",
        note: "No curriculum rows are modified — mastery-based UI reads earned signals only.",
      },
      null,
      2,
    ),
  );

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
