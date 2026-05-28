import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  attachActivityMetadata,
  getActivityMetadata,
  inferActivityMetadata,
  isHotAfternoonActiveBlock,
  isOutdoorActivity,
  isWeatherSensitiveActivity,
  isCalmAfternoonSuitable,
  isPeakHeatRestricted,
  metadataForPresetId,
  normalizeActivityKey,
} from "./routine-activity-metadata.js";

describe("inferActivityMetadata", () => {
  it("resolves catalog preset by normalized label", () => {
    const meta = inferActivityMetadata({
      time: "16:00",
      activity: "Outdoor play",
      duration: 45,
      category: "play",
    });
    assert.equal(meta.category, "play");
    assert.equal(meta.environment, "outdoor");
    assert.equal(meta.heatRestricted, true);
    assert.equal(meta.intensity, "high");
  });

  it("marks calm reading as suitable for hot afternoon", () => {
    const meta = inferActivityMetadata({
      time: "13:00",
      activity: "Calm reading nook",
      duration: 30,
      category: "rest",
    });
    assert.ok(isCalmAfternoonSuitable(meta));
    assert.equal(isHotAfternoonActiveBlock({
      time: "13:00",
      activity: "Calm reading nook",
      duration: 30,
      category: "rest",
      activityMeta: meta,
    }), false);
  });

  it("flags indoor creative play as heat restricted", () => {
    const item = {
      time: "15:00",
      activity: "Indoor creative play",
      duration: 45,
      category: "play",
    };
    assert.equal(isHotAfternoonActiveBlock(item), true);
    assert.ok(isPeakHeatRestricted(getActivityMetadata(item)));
  });
});

describe("attachActivityMetadata", () => {
  it("preserves explicit override", () => {
    const item = attachActivityMetadata(
      {
        time: "10:00",
        activity: "Custom block",
        duration: 20,
        category: "play",
      },
      {
        intensity: "low",
        heatRestricted: false,
        calmingScore: 8,
      },
    );
    assert.equal(item.activityMeta.intensity, "low");
    assert.equal(item.activityMeta.heatRestricted, false);
  });
});

describe("isOutdoorActivity", () => {
  it("uses metadata environment over legacy category alone", () => {
    assert.equal(
      isOutdoorActivity({
        time: "09:00",
        activity: "Morning walk",
        duration: 30,
        category: "play",
        activityMeta: {
          category: "play",
          intensity: "medium",
          environment: "outdoor",
          ageGroups: ["early_school"],
          weatherSafe: false,
          heatRestricted: true,
          calmingScore: 3,
        },
      }),
      true,
    );
    assert.equal(
      isOutdoorActivity({
        time: "13:00",
        activity: "Quiet puzzles & drawing",
        duration: 25,
        category: "rest",
        activityMeta: metadataForPresetId("quiet_puzzles")!,
      }),
      false,
    );
  });
});

describe("isWeatherSensitiveActivity", () => {
  it("detects movement preset as weather sensitive", () => {
    assert.equal(
      isWeatherSensitiveActivity({
        time: "17:00",
        activity: "Soccer practice",
        duration: 60,
        category: "exercise",
      }),
      true,
    );
  });
});

describe("normalizeActivityKey", () => {
  it("strips session suffixes for catalog lookup", () => {
    assert.equal(
      normalizeActivityKey("Outdoor play (morning session)"),
      "outdoor play",
    );
  });
});
