import { beforeEach, describe, expect, it } from "vitest";
import {
  clearPendingAiIntent,
  isPendingAiIntentValid,
  loadPendingAiIntent,
  stashPendingAiIntent,
} from "./pending-ai-intent-store";
import { PENDING_AI_TTL_MS } from "../../domain/models/conversation";

describe("pending AI intent", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("survives stash/load within TTL", () => {
    stashPendingAiIntent({
      profileId: "p1",
      conversationId: "c1",
      entryPoint: "reflect",
      snapshotVersion: "ss_1",
    });
    const loaded = loadPendingAiIntent();
    expect(loaded?.conversationId).toBe("c1");
    expect(isPendingAiIntentValid(loaded)).toBe(true);
  });

  it("clears on explicit dismiss / module exit", () => {
    stashPendingAiIntent({
      profileId: "p1",
      conversationId: null,
      entryPoint: "reflect",
      snapshotVersion: "ss_1",
    });
    clearPendingAiIntent("module_exit");
    expect(loadPendingAiIntent()).toBeNull();
  });

  it("expires after TTL", () => {
    const intent = stashPendingAiIntent({
      profileId: "p1",
      conversationId: null,
      entryPoint: "reflect",
      snapshotVersion: "ss_1",
    });
    // Simulate expiry
    sessionStorage.setItem(
      "amynest:birth-sky:pending-ai-intent:v1",
      JSON.stringify({ ...intent, stashedAt: Date.now() - PENDING_AI_TTL_MS - 1 }),
    );
    expect(loadPendingAiIntent()).toBeNull();
  });
});
