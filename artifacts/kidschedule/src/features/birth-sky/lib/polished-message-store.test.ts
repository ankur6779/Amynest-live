import { beforeEach, describe, expect, it } from "vitest";
import {
  __resetPolishedMessageStoreForTests,
  applyPolishedBodies,
  getPolishedMessage,
  savePolishedMessage,
} from "./polished-message-store";

describe("polished-message-store (hydrate survival)", () => {
  beforeEach(() => {
    __resetPolishedMessageStoreForTests();
  });

  it("keeps polished body after a simulated hydrate with raw server text", () => {
    const profileId = "p-hydrate";
    const messageId = "asst_1";
    const polished =
      "For Aanya:\n\nWhat parents can try: Notice one concrete effort today.\n\nAstronomy (birth chart): Sun in Leo.";
    const rawServer = "Looking at their chart, Aanya will do fine. Trust the journey.";

    savePolishedMessage(profileId, messageId, polished);
    expect(getPolishedMessage(profileId, messageId)).toBe(polished);

    // hydrate() path: server messages arrive with raw body
    const hydrated = applyPolishedBodies(profileId, [
      {
        messageId: "user_1",
        role: "user",
        body: "How can I help her confidence?",
      },
      {
        messageId,
        role: "assistant",
        body: rawServer,
      },
    ]);

    expect(hydrated[1]!.body).toBe(polished);
    expect(hydrated[1]!.body).not.toBe(rawServer);
    expect(hydrated[1]!.messageId).toBe(messageId);
  });

  it("does not re-transform when polish already matches", () => {
    const profileId = "p2";
    savePolishedMessage(profileId, "m1", "Same text");
    const once = applyPolishedBodies(profileId, [
      { messageId: "m1", role: "assistant", body: "Same text" },
    ]);
    expect(once[0]!.body).toBe("Same text");
  });
});
