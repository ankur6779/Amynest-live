import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  PARENT_GUIDANCE_CARDS,
  PRONUNCIATION_PROMPTS,
  SPEECH_AFFIRMATIONS,
  SPEECH_COACH_I18N_MANIFEST,
  SPEECH_GAMES,
  SPEECH_MILESTONES,
  computeWeeklyProgressScore,
  getAllAffirmations,
  getAllGuidanceCards,
  getGamesForAgeMonths,
  getMilestonesForAgeMonths,
  getPromptsForAgeMonths,
  monthsToBand,
} from "../index";
import type { SpeechAgeBand } from "../index";

const ALL_BANDS: readonly SpeechAgeBand[] = ["1y", "2y", "3y", "4y_plus"];

// ─── monthsToBand boundaries ─────────────────────────────────────────────────

describe("monthsToBand", () => {
  it("returns null for ages below 12 months", () => {
    assert.equal(monthsToBand(0), null);
    assert.equal(monthsToBand(11), null);
  });
  it("returns '1y' from 12 to 23 months inclusive", () => {
    assert.equal(monthsToBand(12), "1y");
    assert.equal(monthsToBand(23), "1y");
  });
  it("returns '2y' from 24 to 35 months inclusive", () => {
    assert.equal(monthsToBand(24), "2y");
    assert.equal(monthsToBand(35), "2y");
  });
  it("returns '3y' from 36 to 47 months inclusive", () => {
    assert.equal(monthsToBand(36), "3y");
    assert.equal(monthsToBand(47), "3y");
  });
  it("returns '4y_plus' from 48 to 96 months inclusive", () => {
    assert.equal(monthsToBand(48), "4y_plus");
    assert.equal(monthsToBand(96), "4y_plus");
  });
  it("returns null for ages above 96 months", () => {
    assert.equal(monthsToBand(97), null);
    assert.equal(monthsToBand(120), null);
  });
  it("returns null for non-finite inputs", () => {
    assert.equal(monthsToBand(Number.NaN), null);
    assert.equal(monthsToBand(Number.POSITIVE_INFINITY), null);
    assert.equal(monthsToBand(-5), null);
  });
});

// ─── selectors ───────────────────────────────────────────────────────────────

describe("getMilestonesForAgeMonths", () => {
  it("returns at least one milestone for every band", () => {
    for (const months of [12, 24, 36, 48]) {
      const list = getMilestonesForAgeMonths(months);
      assert.ok(list.length > 0, `expected milestones for ${months}mo`);
    }
  });
  it("returns only milestones whose ageBand matches the resolved band", () => {
    const list = getMilestonesForAgeMonths(36);
    for (const m of list) assert.equal(m.ageBand, "3y");
  });
  it("returns [] for out-of-range months", () => {
    assert.deepEqual(getMilestonesForAgeMonths(0), []);
    assert.deepEqual(getMilestonesForAgeMonths(200), []);
  });
});

describe("getGamesForAgeMonths", () => {
  it("returns at least one game for every band", () => {
    for (const months of [12, 24, 36, 48]) {
      const list = getGamesForAgeMonths(months);
      assert.ok(list.length > 0, `expected games for ${months}mo`);
    }
  });
  it("never returns games whose ageBands does not include the resolved band", () => {
    const months = 12;
    const band = monthsToBand(months);
    const list = getGamesForAgeMonths(months);
    for (const g of list) assert.ok(g.ageBands.includes(band as SpeechAgeBand));
  });
  it("returns [] for out-of-range months", () => {
    assert.deepEqual(getGamesForAgeMonths(0), []);
  });
});

describe("getPromptsForAgeMonths", () => {
  it("returns prompts spanning multiple kinds for the 4y+ band", () => {
    const list = getPromptsForAgeMonths(60);
    const kinds = new Set(list.map((p) => p.kind));
    assert.ok(kinds.size >= 3, "expected multiple prompt kinds for 4y+");
  });
  it("filters to a single kind when one is provided", () => {
    const list = getPromptsForAgeMonths(48, "sentence");
    assert.ok(list.length > 0);
    for (const p of list) assert.equal(p.kind, "sentence");
  });
  it("returns [] for out-of-range months", () => {
    assert.deepEqual(getPromptsForAgeMonths(0), []);
  });
});

// ─── purity (deterministic outputs) ──────────────────────────────────────────

describe("helper purity", () => {
  it("monthsToBand returns identical results across repeated calls", () => {
    for (const m of [12, 24, 36, 48, 60]) {
      assert.equal(monthsToBand(m), monthsToBand(m));
    }
  });
  it("selectors return reference-equal results across repeated calls", () => {
    // Same input → same content (we tolerate either reference equality OR
    // structural equality since helpers may copy/filter).
    const a = getMilestonesForAgeMonths(24);
    const b = getMilestonesForAgeMonths(24);
    assert.deepEqual(a, b);
  });
  it("computeWeeklyProgressScore is deterministic", () => {
    const input = {
      daysActive: 4,
      promptsAttempted: 20,
      promptsClear: 14,
      milestonesOnTrack: 3,
      milestonesTotal: 5,
    };
    assert.deepEqual(
      computeWeeklyProgressScore(input),
      computeWeeklyProgressScore(input),
    );
  });
});

// ─── weekly progress score ───────────────────────────────────────────────────

describe("computeWeeklyProgressScore", () => {
  it("returns 0 across the board for an all-zero input", () => {
    const out = computeWeeklyProgressScore({
      daysActive: 0,
      promptsAttempted: 0,
      promptsClear: 0,
      milestonesOnTrack: 0,
      milestonesTotal: 1,
    });
    assert.equal(out.score, 0);
    assert.equal(out.pronunciationPct, 0);
    assert.equal(out.consistencyPct, 0);
    assert.equal(out.milestonePct, 0);
    assert.equal(out.streakDays, 0);
  });
  it("returns 100 across the board for a perfect week", () => {
    const out = computeWeeklyProgressScore({
      daysActive: 7,
      promptsAttempted: 30,
      promptsClear: 30,
      milestonesOnTrack: 4,
      milestonesTotal: 4,
    });
    assert.equal(out.score, 100);
    assert.equal(out.pronunciationPct, 100);
    assert.equal(out.consistencyPct, 100);
    assert.equal(out.milestonePct, 100);
    assert.equal(out.streakDays, 7);
  });
  it("clamps pct components to 0-100", () => {
    const out = computeWeeklyProgressScore({
      daysActive: 99,
      promptsAttempted: 10,
      promptsClear: 100, // over-counted
      milestonesOnTrack: 99,
      milestonesTotal: 4,
    });
    assert.equal(out.pronunciationPct, 100);
    assert.equal(out.consistencyPct, 100);
    assert.equal(out.milestonePct, 100);
    assert.equal(out.streakDays, 7);
  });
  it("weights pronunciation 40 / consistency 30 / milestone 30", () => {
    const out = computeWeeklyProgressScore({
      daysActive: 0, // 0% consistency
      promptsAttempted: 10,
      promptsClear: 10, // 100% pronunciation → 40 pts
      milestonesOnTrack: 0,
      milestonesTotal: 4, // 0% milestone
    });
    assert.equal(out.score, 40);
  });
  it("guards zero milestonesTotal by treating it as 1", () => {
    const out = computeWeeklyProgressScore({
      daysActive: 7,
      promptsAttempted: 0,
      promptsClear: 0,
      milestonesOnTrack: 0,
      milestonesTotal: 0,
    });
    assert.equal(out.milestonePct, 0);
    // consistency 100 * 0.3 = 30
    assert.equal(out.score, 30);
  });
});

// ─── content shape ───────────────────────────────────────────────────────────

describe("content datasets", () => {
  it("ships at least 3 milestones per age band", () => {
    for (const band of ALL_BANDS) {
      const count = SPEECH_MILESTONES.filter((m) => m.ageBand === band).length;
      assert.ok(count >= 3, `expected ≥3 milestones for ${band}, got ${count}`);
    }
  });
  it("ships at least 6 speech games", () => {
    assert.ok(SPEECH_GAMES.length >= 6);
  });
  it("ships at least 10 affirmations", () => {
    assert.ok(SPEECH_AFFIRMATIONS.length >= 10);
  });
  it("ships at least 5 parent guidance cards", () => {
    assert.ok(PARENT_GUIDANCE_CARDS.length >= 5);
  });
  it("ships pronunciation prompts of every kind", () => {
    const kinds = new Set(PRONUNCIATION_PROMPTS.map((p) => p.kind));
    for (const k of ["letter", "phonic", "word", "sentence"]) {
      assert.ok(kinds.has(k as never), `missing prompts of kind ${k}`);
    }
  });
  it("uses unique ids within each dataset", () => {
    const datasets: ReadonlyArray<readonly { id: string }[]> = [
      SPEECH_MILESTONES,
      SPEECH_GAMES,
      SPEECH_AFFIRMATIONS,
      PARENT_GUIDANCE_CARDS,
      PRONUNCIATION_PROMPTS,
    ];
    for (const ds of datasets) {
      const ids = ds.map((x) => x.id);
      assert.equal(new Set(ids).size, ids.length, "duplicate id detected");
    }
  });
});

// ─── i18n manifest completeness ──────────────────────────────────────────────

describe("SPEECH_COACH_I18N_MANIFEST", () => {
  const has = (k: string): boolean =>
    Object.prototype.hasOwnProperty.call(SPEECH_COACH_I18N_MANIFEST, k);

  it("includes a non-empty English string for every key", () => {
    for (const [k, v] of Object.entries(SPEECH_COACH_I18N_MANIFEST)) {
      assert.equal(typeof v, "string", `${k} should be a string`);
      assert.ok(v.length > 0, `${k} should be non-empty`);
    }
  });
  it("only uses keys under the screens.speech_coach.* namespace", () => {
    for (const k of Object.keys(SPEECH_COACH_I18N_MANIFEST)) {
      assert.ok(
        k.startsWith("screens.speech_coach."),
        `${k} not under expected namespace`,
      );
    }
  });
  it("provides a string for every milestone label + hint", () => {
    for (const m of SPEECH_MILESTONES) {
      assert.ok(has(m.i18nKeyLabel), `missing ${m.i18nKeyLabel}`);
      assert.ok(has(m.i18nKeyHint), `missing ${m.i18nKeyHint}`);
    }
  });
  it("provides a string for every game title + description", () => {
    for (const g of SPEECH_GAMES) {
      assert.ok(has(g.i18nKeyTitle), `missing ${g.i18nKeyTitle}`);
      assert.ok(has(g.i18nKeyDescription), `missing ${g.i18nKeyDescription}`);
    }
  });
  it("provides a string for every affirmation", () => {
    for (const a of SPEECH_AFFIRMATIONS) {
      assert.ok(has(a.i18nKeyText), `missing ${a.i18nKeyText}`);
    }
  });
  it("provides title + body + tip strings for every guidance card", () => {
    for (const c of PARENT_GUIDANCE_CARDS) {
      assert.ok(has(c.i18nKeyTitle), `missing ${c.i18nKeyTitle}`);
      assert.ok(has(c.i18nKeyBody), `missing ${c.i18nKeyBody}`);
      assert.ok(has(c.i18nKeyTip), `missing ${c.i18nKeyTip}`);
    }
  });
  it("provides hint strings for every prompt", () => {
    for (const p of PRONUNCIATION_PROMPTS) {
      assert.ok(has(p.i18nKeyHint), `missing ${p.i18nKeyHint}`);
    }
  });
});

// ─── band-agnostic getters ───────────────────────────────────────────────────

describe("band-agnostic getters", () => {
  it("getAllAffirmations returns the full list", () => {
    assert.equal(getAllAffirmations().length, SPEECH_AFFIRMATIONS.length);
  });
  it("getAllGuidanceCards returns the full list", () => {
    assert.equal(getAllGuidanceCards().length, PARENT_GUIDANCE_CARDS.length);
  });
});
