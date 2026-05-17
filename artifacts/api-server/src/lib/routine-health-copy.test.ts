import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  aqiOutdoorLimitNote,
  deriveRoutineConfidence,
  humanizeEnvironmentReason,
} from "./routine-health-copy.js";
import { buildRoutineContext } from "./routine-context-builder.js";
import { deriveBehavioralState } from "./routine-context-engine.js";

describe("aqiOutdoorLimitNote", () => {
  it("uses human language instead of AQI codes", () => {
    const note = aqiOutdoorLimitNote(180, 18);
    assert.match(note!, /moderate|limit outdoor/i);
    assert.doesNotMatch(note!, /AQI 180/);
  });

  it("suggests staying in when cap is below minimum outdoor time", () => {
    const note = aqiOutdoorLimitNote(180, 18);
    assert.match(note!, /indoors|safer/i);
  });
});

describe("humanizeEnvironmentReason", () => {
  it("rewrites technical AQI capped strings", () => {
    const out = humanizeEnvironmentReason(
      "Outdoor restricted due to high AQI — capped at 18min",
    );
    assert.match(out, /moderate|limit outdoor|indoor/i);
    assert.match(out, /moderate|limit outdoor/i);
    assert.doesNotMatch(out, /capped at 18/i);
  });
});

describe("deriveRoutineConfidence", () => {
  it("medium confidence when India metro advisory balances fair weather and high AQI", () => {
    const ctx = buildRoutineContext({
      country: "IN",
      weatherOutdoor: "yes",
      environment: { AQI: 280 },
    });
    const state = deriveBehavioralState(ctx, { ageGroup: "early_school" });
    assert.equal(state.aqiMetroAdvisoryMode, true);
    assert.equal(deriveRoutineConfidence(ctx, state, "IN"), "medium");
  });
});
