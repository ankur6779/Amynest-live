import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  resolveDeepLinkPath,
  resolveRoutedAction,
  categoryToDefaultAction,
  campaignStepToAction,
  surfaceToAction,
  parseLegacyPathToAction,
  assertValidActionRouting,
  NOTIFICATION_CATEGORY_TARGETS,
} from "./index.js";

describe("action-routing", () => {
  test("registry validates clean", () => {
    assert.doesNotThrow(() => assertValidActionRouting());
  });

  test("legacy paths resolve to canonical routes", () => {
    assert.equal(resolveDeepLinkPath("/hub").path, "/parenting-hub");
    assert.equal(resolveDeepLinkPath("/meals").path, "/nutrition");
    assert.equal(resolveDeepLinkPath("/study-zone").path, "/learn-with-amy");
    assert.equal(resolveDeepLinkPath("/story-time").path, "/parenting-hub#tile-story-hub");
    assert.equal(resolveDeepLinkPath("/subscription").path, "/pricing");
    assert.equal(resolveDeepLinkPath("/routine").path, "/routines");
  });

  test("category fallbacks when deepLink empty", () => {
    assert.equal(resolveDeepLinkPath("", "phonics").path, "/speech-coach");
    assert.equal(resolveDeepLinkPath("", "nutrition").path, "/nutrition");
    assert.equal(resolveDeepLinkPath("", "streak_recovery").path, "/routines");
    assert.equal(resolveDeepLinkPath("", "campaigns").path, "/parenting-hub");
  });

  test("routine_item with routineId opens routine detail", () => {
    const r = resolveDeepLinkPath("", "routine_item", { routineId: "42" });
    assert.equal(r.path, "/routines/42");
  });

  test("routine_task falls back to routines when id missing", () => {
    const r = resolveDeepLinkPath("", "routine_item");
    assert.equal(r.path, "/routines");
    assert.equal(r.usedFallback, false);
  });

  test("campaign step maps reading challenge to story hub", () => {
    const action = campaignStepToAction("reading_7d", 4, "/story-time");
    const r = resolveRoutedAction(action);
    assert.equal(r.path, "/parenting-hub#tile-story-hub");
  });

  test("surface routine maps to routines", () => {
    const r = resolveRoutedAction(surfaceToAction("routine"));
    assert.equal(r.path, "/routines");
  });

  test("amy recommendation goal includes query", () => {
    const r = resolveRoutedAction({
      actionTarget: "goal",
      entityId: "g1",
      fallbackTarget: "amy_chat",
    });
    assert.ok(r.path.includes("/assistant"));
    assert.ok(r.path.includes("goalId=g1"));
  });

  test("all notification categories have targets", () => {
    const expected = [
      "nutrition", "parenting_tips", "learning_activity", "story_time",
      "routine", "routine_item", "engagement", "milestone", "weekly",
      "good_night", "phonics", "insights", "campaigns", "streak_recovery",
      "retention_intervention",
    ];
    for (const cat of expected) {
      assert.ok(NOTIFICATION_CATEGORY_TARGETS[cat as keyof typeof NOTIFICATION_CATEGORY_TARGETS], cat);
      const action = categoryToDefaultAction(cat);
      const r = resolveRoutedAction(action);
      assert.ok(r.path.startsWith("/"), `${cat} -> ${r.path}`);
    }
  });

  test("parseLegacyPathToAction handles hub tiles", () => {
    const a = parseLegacyPathToAction("/parenting-hub#tile-phonics");
    assert.ok(a);
    const r = resolveRoutedAction(a);
    assert.equal(r.path, "/parenting-hub#tile-phonics");
  });
});
