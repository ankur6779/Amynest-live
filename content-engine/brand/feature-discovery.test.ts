import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  discoverAmyNestFeatures,
  selectFeatureForTopic,
} from "./feature-discovery.js";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

describe("AmyNest feature discovery", () => {
  it("discovers real modules/pages and seeds content pillars", () => {
    const features = discoverAmyNestFeatures({ repoRoot, maxFeatures: 120 });
    assert.ok(features.length >= 8);
    assert.ok(features.some((f) => f.id === "learning-zone"));
    assert.ok(features.some((f) => f.sourceKind === "feature-module" || f.sourceKind === "page"));
    for (const feature of features) {
      assert.ok(feature.preferredCharacter);
      assert.ok(feature.pillar);
    }
  });

  it("selects a feature for a speech topic", () => {
    const features = discoverAmyNestFeatures({ repoRoot, maxFeatures: 120 });
    const selected = selectFeatureForTopic(features, {
      id: "speech-001",
      title: "Speech Practice for Confidence",
      category: "Speech",
      keywords: ["speech", "voice"],
    });
    assert.ok(selected);
    assert.ok(
      selected!.pillar === "speech" ||
        /speech|voice|coach/i.test(selected!.title + selected!.id),
    );
  });
});
