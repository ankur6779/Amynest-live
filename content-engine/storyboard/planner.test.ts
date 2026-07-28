import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { loadDefaultConfig } from "../config/index.js";
import { InMemoryTelemetrySink } from "../telemetry/index.js";
import { assertTimelineIntegrity } from "../timeline/index.js";
import { makeContentPackage } from "./test-fixtures.js";
import { StoryboardPlanner } from "./planner.js";

describe("StoryboardPlanner", () => {
  it("transforms ContentPackage into a complete StoryboardPackage", () => {
    const telemetry = new InMemoryTelemetrySink();
    const planner = new StoryboardPlanner({
      config: loadDefaultConfig(),
      telemetry,
    });
    const { package: sb, telemetry: event } = planner.planFromContentPackage(
      makeContentPackage(),
      30,
    );

    assert.equal(sb.version, "3.0.0");
    assert.equal(sb.totalDuration, 30);
    assert.equal(sb.aspectRatio, "9:16");
    assert.equal(sb.fps, 30);
    assert.equal(sb.resolution, "1080x1920");
    assert.ok(sb.scenes.length >= 5);
    assert.deepEqual(assertTimelineIntegrity(sb.timeline), []);
    assert.ok(sb.assets.length >= sb.scenes.length);
    assert.ok(sb.musicPlan.segments.length === 3);
    assert.ok(sb.voicePlan.items.length === sb.scenes.length);
    assert.ok(sb.captionPlan.items.length >= 1);
    assert.ok(sb.transitionPlan.length === sb.scenes.length - 1);
    assert.ok(sb.cameraPlan.length === sb.scenes.length);
    assert.ok(sb.overlayPlan.length >= sb.scenes.length);
    assert.ok(sb.animationPlan.length >= sb.scenes.length);
    assert.equal(sb.branding.channelName, "AmyNest AI");
    assert.ok(sb.branding.qrPlaceholder);
    assert.ok(sb.branding.playStorePlaceholder);
    assert.equal(sb.validation.ok, true);
    assert.equal(event.name, "storyboard.plan");
    assert.equal(telemetry.list().length, 1);
    assert.equal(event.metadata?.sceneCount, sb.scenes.length);
  });

  it("keeps captions synchronized inside the timeline", () => {
    const { package: sb } = new StoryboardPlanner({
      config: loadDefaultConfig(),
    }).planFromContentPackage(makeContentPackage({ estimatedDuration: 20 }), 20);

    for (const caption of sb.captionPlan.items) {
      assert.ok(caption.start >= 0);
      assert.ok(caption.end <= sb.totalDuration + 0.001);
      assert.ok(caption.end > caption.start);
      assert.ok(sb.scenes.some((s) => s.sceneId === caption.sceneId));
    }

    for (const voice of sb.voicePlan.items) {
      assert.ok(voice.end > voice.start);
      assert.ok(voice.end <= sb.totalDuration + 0.001);
    }
  });

  it("is deterministic for identical inputs", () => {
    const config = loadDefaultConfig();
    const pkg = makeContentPackage();
    const a = new StoryboardPlanner({ config }).planFromContentPackage(pkg, 15);
    const b = new StoryboardPlanner({ config }).planFromContentPackage(pkg, 15);
    assert.equal(a.package.id, b.package.id);
    assert.deepEqual(a.package.timeline, b.package.timeline);
    assert.deepEqual(
      a.package.scenes.map((s) => s.sceneId),
      b.package.scenes.map((s) => s.sceneId),
    );
  });
});
