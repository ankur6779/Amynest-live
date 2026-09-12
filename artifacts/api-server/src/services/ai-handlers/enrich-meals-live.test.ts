import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import type { ScheduleItem } from "../../lib/routine-templates.js";
import {
  mealEnrichmentNotesChanged,
  mergeOptionsNotesOntoLiveItems,
} from "./enrich-meals-live.js";

const dir = dirname(fileURLToPath(import.meta.url));

function item(
  partial: Partial<ScheduleItem> & Pick<ScheduleItem, "time" | "activity">,
): ScheduleItem {
  return {
    category: "meal",
    status: "pending",
    ...partial,
  } as ScheduleItem;
}

describe("mergeOptionsNotesOntoLiveItems", () => {
  it("preserves live completions while applying Options notes from enrichment", () => {
    const live: ScheduleItem[] = [
      item({
        time: "08:00",
        activity: "Breakfast",
        category: "meal",
        status: "completed",
        notes: undefined,
      }),
      item({
        time: "09:00",
        activity: "Brush teeth",
        category: "hygiene",
        status: "completed",
      }),
    ];
    const enriched: ScheduleItem[] = [
      item({
        time: "08:00",
        activity: "Breakfast",
        category: "meal",
        status: "pending",
        notes: "Options: Idli | Poha | Eggs | Paratha",
      }),
      item({
        time: "09:00",
        activity: "Brush teeth",
        category: "hygiene",
        status: "pending",
      }),
    ];

    const merged = mergeOptionsNotesOntoLiveItems(live, enriched);
    assert.equal(merged[0]?.status, "completed");
    assert.equal(merged[0]?.notes, "Options: Idli | Poha | Eggs | Paratha");
    assert.equal(merged[1]?.status, "completed");
    assert.equal(merged[1]?.notes, undefined);
    assert.equal(mealEnrichmentNotesChanged(live, merged), true);
  });

  it("does not overwrite a live slot that already has valid Options", () => {
    const live: ScheduleItem[] = [
      item({
        time: "08:00",
        activity: "Breakfast",
        notes: "Options: A | B | C | D",
        status: "completed",
      }),
    ];
    const enriched: ScheduleItem[] = [
      item({
        time: "08:00",
        activity: "Breakfast",
        notes: "Options: W | X | Y | Z",
        status: "pending",
      }),
    ];
    const merged = mergeOptionsNotesOntoLiveItems(live, enriched);
    assert.equal(merged[0]?.notes, "Options: A | B | C | D");
    assert.equal(merged[0]?.status, "completed");
    assert.equal(mealEnrichmentNotesChanged(live, merged), false);
  });

  it("matches by slot key when index alignment breaks after parent edits", () => {
    const live: ScheduleItem[] = [
      item({
        time: "07:30",
        activity: "Wake up",
        category: "routine",
        status: "completed",
      }),
      item({
        time: "08:00",
        activity: "Breakfast",
        category: "meal",
        status: "skipped",
      }),
    ];
    // Enrichment snapshot from before the wake-up row was inserted — breakfast at idx 0.
    const enriched: ScheduleItem[] = [
      item({
        time: "08:00",
        activity: "Breakfast",
        category: "meal",
        status: "pending",
        notes: "Options: Upma | Oats | Toast | Smoothie",
      }),
    ];
    const merged = mergeOptionsNotesOntoLiveItems(live, enriched);
    assert.equal(merged[0]?.status, "completed");
    assert.equal(merged[1]?.status, "skipped");
    assert.equal(merged[1]?.notes, "Options: Upma | Oats | Toast | Smoothie");
  });

  it("ignores stale enrichment that would replace the whole live array shape", () => {
    const live: ScheduleItem[] = [
      item({
        time: "08:00",
        activity: "Breakfast",
        status: "completed",
        notes: undefined,
      }),
      item({
        time: "12:00",
        activity: "Parent-added picnic",
        category: "outdoor",
        status: "pending",
      }),
    ];
    const staleEnriched: ScheduleItem[] = [
      item({
        time: "08:00",
        activity: "Breakfast",
        status: "pending",
        notes: "Options: A | B | C | D",
      }),
      item({
        time: "12:00",
        activity: "Lunch",
        category: "meal",
        status: "pending",
        notes: "Options: E | F | G | H",
      }),
    ];
    const merged = mergeOptionsNotesOntoLiveItems(live, staleEnriched);
    assert.equal(merged.length, 2);
    assert.equal(merged[0]?.notes, "Options: A | B | C | D");
    assert.equal(merged[0]?.status, "completed");
    assert.equal(merged[1]?.activity, "Parent-added picnic");
    assert.equal(merged[1]?.category, "outdoor");
  });
});

describe("routines.enrich_meals handler contract", () => {
  it("re-reads live items and merges Options instead of writing the enqueue snapshot", () => {
    const src = readFileSync(join(dir, "index.ts"), "utf8");
    const enrichCase = src.slice(src.indexOf('case "routines.enrich_meals"'));
    const block = enrichCase.slice(0, enrichCase.indexOf("case \"spelling.ai_generate\""));
    assert.match(block, /mergeOptionsNotesOntoLiveItems/);
    assert.match(block, /select\(\{ items: routinesTable\.items \}\)/);
    assert.doesNotMatch(
      block,
      /enrichMealOptionsWithAi\(p\.items/,
    );
    assert.doesNotMatch(
      block,
      /\.set\(\{\s*items:\s*enriched\s*\}/,
    );
  });
});
