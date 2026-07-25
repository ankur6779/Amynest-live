/**
 * Opt-in CLI: regenerate current Birth Sky snapshots with the bound EphemerisPort
 * via the bound EphemerisPort (remote daemon). Does NOT mutate historical rows.
 *
 * Usage (requires DATABASE_URL + running ephemeris daemon):
 *   pnpm exec tsx scripts/regenerate-birth-sky-snapshots.ts --profile <uuid>
 *   pnpm exec tsx scripts/regenerate-birth-sky-snapshots.ts --all --limit 50
 */

import { isNull } from "drizzle-orm";
import { db, birthProfilesTable } from "@workspace/db";
import {
  computeAndPersistSnapshot,
  plaintextBirthFields,
} from "../src/services/birth-sky/snapshot-service.js";

async function main() {
  const args = process.argv.slice(2);
  const profileIdx = args.indexOf("--profile");
  const all = args.includes("--all");
  const limitIdx = args.indexOf("--limit");
  const limit = limitIdx >= 0 ? Number(args[limitIdx + 1]) : 50;

  if (!all && profileIdx < 0) {
    console.error("Pass --profile <id> or --all [--limit N]");
    process.exit(1);
  }

  let rows = await db
    .select()
    .from(birthProfilesTable)
    .where(isNull(birthProfilesTable.deletedAt));

  if (profileIdx >= 0) {
    const id = args[profileIdx + 1];
    rows = rows.filter((r) => r.id === id);
  } else {
    rows = rows.slice(0, Number.isFinite(limit) ? limit : 50);
  }

  console.log(`regenerating ${rows.length} profile(s)`);
  for (const row of rows) {
    const plain = plaintextBirthFields(row);
    const snap = await computeAndPersistSnapshot({
      userId: row.userId,
      profileId: row.id,
      birthDate: row.birthDate,
      birthTime: plain.birthTime,
      timePrecision: row.timePrecision as "exact" | "approximate" | "unknown",
      birthPlace: plain.birthPlace,
    });
    console.log(row.id, snap.engineVersion, snap.snapshotVersion);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
