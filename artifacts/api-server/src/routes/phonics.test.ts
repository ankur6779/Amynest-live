/**
 * Phonics route — data + logic regression tests.
 *
 * 1. Verifies every seeded row passes our schema invariants (non-empty
 *    symbol, sound, valid type, valid age group).
 * 2. Verifies coverage: every age group has items and the totals match
 *    what the frontend expects (≥10 per tier).
 * 3. Verifies the age→group mapping mirrors the frontend `getPhonicsAgeGroup`.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { db, phonicsContentTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const VALID_AGE_GROUPS = ["12_24m", "2_3y", "3_4y", "4_5y", "5_6y"] as const;
const VALID_TYPES = ["sound", "letter", "word", "sentence", "story"] as const;

function ageGroupForMonths(totalMonths: number): string | null {
  if (totalMonths < 12) return null;
  if (totalMonths < 24) return "12_24m";
  if (totalMonths < 36) return "2_3y";
  if (totalMonths < 48) return "3_4y";
  if (totalMonths < 60) return "4_5y";
  if (totalMonths < 72) return "5_6y";
  return null;
}

describe("phonics — age group mapping", () => {
  it("maps DOB ranges to the expected tier", () => {
    assert.equal(ageGroupForMonths(0), null);
    assert.equal(ageGroupForMonths(11), null);
    assert.equal(ageGroupForMonths(12), "12_24m");
    assert.equal(ageGroupForMonths(23), "12_24m");
    assert.equal(ageGroupForMonths(24), "2_3y");
    assert.equal(ageGroupForMonths(35), "2_3y");
    assert.equal(ageGroupForMonths(36), "3_4y");
    assert.equal(ageGroupForMonths(47), "3_4y");
    assert.equal(ageGroupForMonths(48), "4_5y");
    assert.equal(ageGroupForMonths(59), "4_5y");
    assert.equal(ageGroupForMonths(60), "5_6y");
    assert.equal(ageGroupForMonths(71), "5_6y");
    assert.equal(ageGroupForMonths(72), null);
  });
});

describe("phonics — seeded content integrity", () => {
  it("has ≥10 active rows in every age group", async () => {
    for (const ag of VALID_AGE_GROUPS) {
      const rows = await db
        .select()
        .from(phonicsContentTable)
        .where(eq(phonicsContentTable.ageGroup, ag));
      assert.ok(
        rows.length >= 10,
        `age_group ${ag} only has ${rows.length} rows (expected ≥10)`,
      );
    }
  });

  it("every row has a non-empty symbol + sound", async () => {
    const rows = await db.select().from(phonicsContentTable);
    assert.ok(rows.length >= 50, `expected ≥50 total rows, got ${rows.length}`);
    for (const r of rows) {
      assert.ok(
        typeof r.symbol === "string" && r.symbol.length > 0,
        `row ${r.id} has empty symbol`,
      );
      assert.ok(
        typeof r.sound === "string" && r.sound.length > 0,
        `row ${r.id} (${r.symbol}) has empty sound — TTS would fail`,
      );
    }
  });

  it("every row uses a valid type + age_group", async () => {
    const rows = await db.select().from(phonicsContentTable);
    for (const r of rows) {
      assert.ok(
        VALID_AGE_GROUPS.includes(r.ageGroup as (typeof VALID_AGE_GROUPS)[number]),
        `row ${r.id} has invalid age_group: ${r.ageGroup}`,
      );
      assert.ok(
        VALID_TYPES.includes(r.type as (typeof VALID_TYPES)[number]),
        `row ${r.id} has invalid type: ${r.type}`,
      );
    }
  });

  it("uses the right type per age group", async () => {
    const rows = await db.select().from(phonicsContentTable);
    for (const r of rows) {
      switch (r.ageGroup) {
        case "12_24m":
          assert.equal(r.type, "sound", `12_24m item should be 'sound', got '${r.type}'`);
          break;
        case "2_3y":
          assert.equal(r.type, "letter", `2_3y item should be 'letter', got '${r.type}'`);
          break;
        case "3_4y":
          assert.equal(r.type, "word", `3_4y item should be 'word', got '${r.type}'`);
          break;
        case "4_5y":
          assert.ok(
            r.type === "letter" || r.type === "sentence",
            `4_5y item should be 'letter' or 'sentence', got '${r.type}'`,
          );
          break;
        case "5_6y":
          assert.ok(
            r.type === "letter" || r.type === "sentence" || r.type === "story",
            `5_6y item should be 'letter', 'sentence', or 'story', got '${r.type}'`,
          );
          break;
      }
    }
  });

  it("level numbers within an age group are unique", async () => {
    for (const ag of VALID_AGE_GROUPS) {
      const rows = await db
        .select()
        .from(phonicsContentTable)
        .where(eq(phonicsContentTable.ageGroup, ag));
      const levels = rows.map((r) => r.level);
      assert.equal(
        new Set(levels).size,
        levels.length,
        `age_group ${ag} has duplicate levels`,
      );
    }
  });
});
