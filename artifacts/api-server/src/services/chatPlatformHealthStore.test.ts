import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  getChatPlatformHealthDashboard,
  ingestChatPlatformHealthEvent,
  resetChatPlatformHealthStoreForTests,
} from "./chatPlatformHealthStore.js";

describe("chatPlatformHealthStore", () => {
  beforeEach(() => {
    resetChatPlatformHealthStoreForTests();
  });

  it("aggregates failures by device manufacturer, android version, keyboard, and app version", () => {
    const now = Date.parse("2026-06-01T12:00:00Z");
    ingestChatPlatformHealthEvent({
      ts: now,
      event: "chat_prompt_hidden_after_keyboard_open",
      surface: "onboarding",
      meta: {
        deviceManufacturer: "Samsung",
        androidVersion: "14",
        osSkin: "One UI",
        keyboardApp: "Gboard",
        appVersion: "2.4.0",
      },
    });
    ingestChatPlatformHealthEvent({
      ts: now + 1000,
      event: "chat_prompt_recovery_triggered",
      surface: "onboarding",
      meta: {
        deviceManufacturer: "Samsung",
        androidVersion: "14",
        osSkin: "One UI",
        keyboardApp: "Gboard",
        appVersion: "2.4.0",
      },
    });
    ingestChatPlatformHealthEvent({
      ts: now + 2000,
      event: "chat_prompt_hidden_after_keyboard_open",
      surface: "assistant",
      meta: {
        deviceManufacturer: "Samsung",
        androidVersion: "14",
        osSkin: "One UI",
        keyboardApp: "Samsung Keyboard",
        appVersion: "2.4.0",
      },
    });

    const dashboard = getChatPlatformHealthDashboard(now + 3000);
    assert.equal(dashboard.status, "failing");
    assert.equal(dashboard.totals.chat_prompt_hidden_after_keyboard_open, 2);
    assert.equal(dashboard.totals.chat_prompt_recovery_triggered, 1);
    assert.equal(dashboard.failureGroups.length, 2);
    assert.match(dashboard.failureGroups[0]!.label, /Samsung Android 14/);
    assert.equal(dashboard.failureGroups[0]!.totalFailures, 1);
  });
});
