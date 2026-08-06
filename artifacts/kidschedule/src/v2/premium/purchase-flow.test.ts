import { describe, expect, it } from "vitest";
import {
  PREMIUM_OFFLINE_RESTORE,
  PREMIUM_SUCCESS_BODY,
  PREMIUM_SUCCESS_HEADLINE,
} from "./copy";
import {
  PREMIUM_JOURNEY_ID,
  PREMIUM_JOURNEY_METADATA,
  PREMIUM_JOURNEY_VERSION,
} from "./journey-meta";
import {
  createInitialPremiumJourneyState,
  reducePremiumJourney,
  restartAfterPurchase,
} from "./purchase-flow";

describe("Premium journey flow", () => {
  it("loading → ready on hydrate when free + online", () => {
    let s = createInitialPremiumJourneyState();
    expect(s.phase).toBe("loading");
    s = reducePremiumJourney(s, {
      type: "HYDRATE",
      isPremium: false,
      online: true,
    });
    expect(s.phase).toBe("ready");
    expect(s.isPremium).toBe(false);
  });

  it("purchase success unlocks premium phase", () => {
    let s = createInitialPremiumJourneyState({ phase: "ready", online: true });
    s = reducePremiumJourney(s, { type: "PURCHASE_START" });
    expect(s.phase).toBe("purchasing");
    s = reducePremiumJourney(s, { type: "PURCHASE_SUCCESS" });
    expect(s.phase).toBe("success");
    expect(s.isPremium).toBe(true);
  });

  it("purchase cancel", () => {
    let s = createInitialPremiumJourneyState({ phase: "purchasing", online: true });
    s = reducePremiumJourney(s, { type: "PURCHASE_CANCEL" });
    expect(s.phase).toBe("cancelled");
    expect(s.isPremium).toBe(false);
    s = reducePremiumJourney(s, { type: "DISMISS_CANCEL" });
    expect(s.phase).toBe("ready");
  });

  it("purchase fail + retry", () => {
    let s = createInitialPremiumJourneyState({ phase: "purchasing", online: true });
    s = reducePremiumJourney(s, {
      type: "PURCHASE_FAIL",
      error: "Store error",
    });
    expect(s.phase).toBe("failed");
    expect(s.error).toBe("Store error");
    s = reducePremiumJourney(s, { type: "RETRY", online: true });
    expect(s.phase).toBe("ready");
    expect(s.error).toBeNull();
  });

  it("restore success", () => {
    let s = createInitialPremiumJourneyState({ phase: "ready", online: true });
    s = reducePremiumJourney(s, { type: "RESTORE_START" });
    expect(s.phase).toBe("restoring");
    s = reducePremiumJourney(s, { type: "RESTORE_SUCCESS" });
    expect(s.phase).toBe("success");
    expect(s.isPremium).toBe(true);
  });

  it("offline blocks purchase and restore", () => {
    let s = createInitialPremiumJourneyState({ phase: "ready", online: true });
    s = reducePremiumJourney(s, { type: "GO_OFFLINE" });
    expect(s.phase).toBe("offline");
    s = reducePremiumJourney(s, { type: "PURCHASE_START" });
    expect(s.phase).toBe("offline");
    expect(s.offlineContext).toBe("purchase");
    s = reducePremiumJourney(s, { type: "RESTORE_START" });
    expect(s.phase).toBe("offline");
    expect(s.offlineContext).toBe("restore");
  });

  it("existing premium persists as already_premium", () => {
    let s = createInitialPremiumJourneyState();
    s = reducePremiumJourney(s, {
      type: "HYDRATE",
      isPremium: true,
      online: true,
    });
    expect(s.phase).toBe("already_premium");
    expect(s.isPremium).toBe(true);
    s = reducePremiumJourney(s, { type: "PURCHASE_START" });
    expect(s.phase).toBe("already_premium");
  });

  it("hydrate offline without premium", () => {
    const s = reducePremiumJourney(createInitialPremiumJourneyState(), {
      type: "HYDRATE",
      isPremium: false,
      online: false,
    });
    expect(s.phase).toBe("offline");
  });
});

describe("Purchase idempotency regression", () => {
  it("Purchase → Restart → no duplicate unlock", () => {
    let s = createInitialPremiumJourneyState({ phase: "ready", online: true });
    s = reducePremiumJourney(s, { type: "PURCHASE_START" });
    s = reducePremiumJourney(s, { type: "PURCHASE_SUCCESS" });
    expect(s.isPremium).toBe(true);
    expect(s.phase).toBe("success");

    // App restart: entitlement still premium once.
    const afterRestart = restartAfterPurchase(true);
    expect(afterRestart.isPremium).toBe(true);
    expect(afterRestart.phase).toBe("already_premium");

    // Further purchase attempts must not re-enter purchasing.
    const again = reducePremiumJourney(afterRestart, { type: "PURCHASE_START" });
    expect(again.phase).toBe("already_premium");
    expect(again.isPremium).toBe(true);

    // A second PURCHASE_SUCCESS must not invent a second unlock flag.
    const dup = reducePremiumJourney(again, { type: "PURCHASE_SUCCESS" });
    expect(dup.isPremium).toBe(true);
    expect(dup.phase).toBe("success");
  });

  it("restart without premium does not unlock", () => {
    const afterRestart = restartAfterPurchase(false);
    expect(afterRestart.isPremium).toBe(false);
    expect(afterRestart.phase).toBe("ready");
  });
});

describe("Restore while offline UX", () => {
  it("RESTORE_START offline → friendly restore copy + retry stays offline until online", () => {
    let s = createInitialPremiumJourneyState({ phase: "ready", online: true });
    s = reducePremiumJourney(s, { type: "GO_OFFLINE", context: "restore" });
    expect(s.phase).toBe("offline");
    expect(s.offlineContext).toBe("restore");
    expect(s.error).toBe(PREMIUM_OFFLINE_RESTORE);

    s = reducePremiumJourney(s, { type: "RESTORE_START" });
    expect(s.phase).toBe("offline");
    expect(s.error).toBe(PREMIUM_OFFLINE_RESTORE);

    s = reducePremiumJourney(s, { type: "RETRY", online: false });
    expect(s.phase).toBe("offline");
    expect(s.error).toBe(PREMIUM_OFFLINE_RESTORE);

    s = reducePremiumJourney(s, { type: "RETRY", online: true });
    expect(s.phase).toBe("ready");
    expect(s.error).toBeNull();
    expect(s.offlineContext).toBeNull();
  });
});

describe("journey identity metadata (no behavior)", () => {
  it("embeds journeyId, journeyVersion, metadata on every state", () => {
    const s = createInitialPremiumJourneyState();
    expect(s.journeyId).toBe(PREMIUM_JOURNEY_ID);
    expect(s.journeyVersion).toBe(PREMIUM_JOURNEY_VERSION);
    expect(s.metadata).toEqual(PREMIUM_JOURNEY_METADATA);

    const next = reducePremiumJourney(s, {
      type: "HYDRATE",
      isPremium: false,
      online: true,
    });
    expect(next.journeyId).toBe(PREMIUM_JOURNEY_ID);
    expect(next.journeyVersion).toBe(PREMIUM_JOURNEY_VERSION);
    expect(next.metadata.entitlementSource).toBe("revenuecat");
  });
});

describe("success copy contract", () => {
  it("reassurance only — no marketing / feature list language", () => {
    expect(PREMIUM_SUCCESS_HEADLINE).toBe("We're staying with Amy");
    expect(PREMIUM_SUCCESS_BODY.toLowerCase()).not.toMatch(
      /unlimited|features?|speech|games|discovery|best value|unlock everything|bought|subscription|upgrade/,
    );
  });
});
