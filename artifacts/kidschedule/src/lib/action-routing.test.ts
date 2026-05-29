import { describe, it, expect } from "vitest";
import {
  resolveDeepLinkPath,
  resolveRoutedAction,
  categoryToDefaultAction,
  assertValidActionRouting,
  NOTIFICATION_CATEGORY_TARGETS,
  buildNotificationActionPayload,
} from "@workspace/action-routing";

describe("@workspace/action-routing", () => {
  it("validates registry", () => {
    expect(() => assertValidActionRouting()).not.toThrow();
  });

  it("resolves legacy broken paths", () => {
    expect(resolveDeepLinkPath("/subscription").path).toBe("/pricing");
    expect(resolveDeepLinkPath("/story-time").path).toBe("/parenting-hub#tile-story-hub");
    expect(resolveDeepLinkPath("/hub").path).toBe("/parenting-hub");
  });

  it("maps all notification categories", () => {
    for (const cat of Object.keys(NOTIFICATION_CATEGORY_TARGETS)) {
      const action = categoryToDefaultAction(cat);
      const path = resolveRoutedAction(action).path;
      expect(path.startsWith("/")).toBe(true);
    }
  });

  it("builds notification payload with actionTarget", () => {
    const payload = buildNotificationActionPayload({
      category: "routine_item",
      deepLink: "/routine",
      data: { routineId: "99" },
    });
    expect(payload.actionTarget).toBe("routine_task");
    expect(payload.deepLink).toBe("/routines/99");
    expect(payload.data.actionTarget).toBe("routine_task");
  });

  it("streak_recovery opens routines", () => {
    expect(resolveDeepLinkPath("", "streak_recovery").path).toBe("/routines");
  });

  it("retention_intervention opens assistant", () => {
    expect(resolveDeepLinkPath("", "retention_intervention").path).toBe("/assistant");
  });
});
