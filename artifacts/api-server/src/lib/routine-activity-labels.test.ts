import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  clarifyAmbiguousPlayLabels,
  fixMisleadingSessionLabels,
  formatSplitSessionName,
  relabelPlayForIndoorSafety,
  sessionLabelFromClock,
} from "./routine-activity-labels.js";

describe("sessionLabelFromClock", () => {
  it("never returns morning after noon", () => {
    assert.equal(sessionLabelFromClock(17 * 60 + 30), "evening");
    assert.equal(sessionLabelFromClock(14 * 60), "afternoon");
    assert.equal(sessionLabelFromClock(9 * 60), "morning");
  });
});

describe("formatSplitSessionName", () => {
  it("labels 17:30 sports as evening session", () => {
    const name = formatSplitSessionName("Sports practice", 17 * 60 + 30);
    assert.match(name, /evening session/i);
    assert.doesNotMatch(name, /morning/i);
  });
});

describe("relabelPlayForIndoorSafety", () => {
  it("renames play when AQI blocks outdoor", () => {
    const out = relabelPlayForIndoorSafety(
      [
        {
          time: "18:00",
          activity: "Evening play with parent",
          category: "play",
          duration: 30,
        },
      ],
      {
        outdoorBlockedByAqi: true,
        replaceOutdoorNotShorten: true,
        dayPlanningMode: "indoor_day",
        aqiMetroAdvisoryMode: false,
      },
    );
    assert.match(out[0]!.activity, /Indoor play/i);
  });
});

describe("clarifyAmbiguousPlayLabels", () => {
  it("renames evening play to indoor when no outdoor block", () => {
    const out = clarifyAmbiguousPlayLabels([
      {
        time: "18:00",
        activity: "Evening play with parent",
        category: "play",
        duration: 30,
      },
    ]);
    assert.match(out[0]!.activity, /Indoor play with parent/i);
  });

  it("renames to outdoor play when outdoor block exists", () => {
    const out = clarifyAmbiguousPlayLabels([
      {
        time: "19:00",
        activity: "Outdoor play (limited)",
        category: "outdoor",
        duration: 15,
      },
      {
        time: "18:00",
        activity: "Evening play with parent",
        category: "play",
        duration: 30,
      },
    ]);
    assert.match(out[1]!.activity, /Indoor play with parent/i);
  });
});

describe("fixMisleadingSessionLabels", () => {
  it("fixes afternoon blocks mislabeled morning", () => {
    const out = fixMisleadingSessionLabels([
      {
        time: "17:30",
        activity: "Sports practice (morning session)",
        duration: 30,
        category: "exercise",
      },
    ]);
    assert.match(out[0]!.activity, /evening session/i);
  });
});
