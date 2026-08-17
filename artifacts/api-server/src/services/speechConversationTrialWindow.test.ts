import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  conversationTrialWindow,
  FREE_CONVERSATION_TRIAL_DAYS,
} from "./speechConversationTrialWindow.ts";

describe("conversationTrialWindow", () => {
  const day = 86_400_000;

  it("never expires when first use has not happened", () => {
    const now = Date.UTC(2026, 7, 17);
    assert.deepEqual(conversationTrialWindow(null, now), {
      trialExpired: false,
      trialDaysLeft: FREE_CONVERSATION_TRIAL_DAYS,
    });
    assert.deepEqual(conversationTrialWindow(0, now), {
      trialExpired: false,
      trialDaysLeft: FREE_CONVERSATION_TRIAL_DAYS,
    });
  });

  it("keeps access during the first 3 days from first use", () => {
    const first = Date.UTC(2026, 7, 10, 12, 0, 0);
    const almost = first + 3 * day;
    const w = conversationTrialWindow(first, almost);
    assert.equal(w.trialExpired, false);
    assert.equal(w.trialDaysLeft, 0);
  });

  it("expires strictly after 3 days from first use (UTC)", () => {
    const first = Date.UTC(2026, 7, 10, 12, 0, 0);
    const after = first + 3 * day + 1;
    const w = conversationTrialWindow(first, after);
    assert.equal(w.trialExpired, true);
    assert.equal(w.trialDaysLeft, 0);
  });

  it("does not use account-creation time — a 10-day-old unused clock stays open", () => {
    const unused = conversationTrialWindow(null, Date.UTC(2026, 7, 20));
    assert.equal(unused.trialExpired, false);
    assert.equal(unused.trialDaysLeft, 3);
  });

  it("counts remaining days from first use, not signup", () => {
    const first = Date.UTC(2026, 7, 17, 0, 0, 0);
    const nextDay = first + 1 * day + 1000;
    const w = conversationTrialWindow(first, nextDay);
    assert.equal(w.trialExpired, false);
    assert.equal(w.trialDaysLeft, 2);
  });
});

describe("Talk-with-Amy clock is stamped only on converse", () => {
  it("POST converse stamps; GET memory only peeks", async () => {
    const { readFileSync } = await import("node:fs");
    const src = readFileSync(new URL("../routes/speech-converse.ts", import.meta.url), "utf8");
    assert.match(src, /resolveConversationBudget\(userId, \{ stampFirstUse: true \}\)/);
    assert.match(src, /await resolveConversationBudget\(userId\);/);
    assert.equal((src.match(/stampFirstUse: true/g) ?? []).length, 1);
    assert.match(src, /peekConversationFirstUseMs/);
    assert.match(src, /Memory\/status reads must peek/);
  });
});
