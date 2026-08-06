import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  classifyV2Screen,
  describeActionTarget,
  isMeaningfulActionTarget,
} from "./classify";
import {
  __founderObsTest,
  exportFounderObservationJson,
  getFounderObservationSummary,
  noteActivity,
  recordHesitation,
  recordMeaningfulAction,
  recordScreen,
  resetFounderObservationStore,
  startFounderObservationSession,
} from "./store";
import {
  isFounderObservationBuildEnabled,
  isFounderObservationEnabled,
  setFounderObservationPreferred,
} from "./enabled";

describe("founder-observation classify", () => {
  it("maps V2 screens", () => {
    expect(classifyV2Screen("/front-door")).toBe("Front Door");
    expect(classifyV2Screen("/today")).toBe("Today");
    expect(classifyV2Screen("/today/mission")).toBe("Mission");
    expect(classifyV2Screen("/today/coach-plan")).toBe("Coach");
    expect(classifyV2Screen("/amy-coach")).toBe("Coach");
    expect(classifyV2Screen("/ask-amy")).toBe("Ask Amy");
    expect(classifyV2Screen("/for-child")).toBe("For Child");
    expect(classifyV2Screen("/premium")).toBe("Premium");
  });

  it("detects meaningful action targets", () => {
    const btn = document.createElement("button");
    btn.setAttribute("data-testid", "v2-mission-cta");
    document.body.appendChild(btn);
    expect(isMeaningfulActionTarget(btn)).toBe(true);
    expect(describeActionTarget(btn)).toBe("testid:v2-mission-cta");
    btn.remove();
  });
});

describe("founder-observation store", () => {
  beforeEach(() => {
    resetFounderObservationStore();
    vi.useFakeTimers();
  });

  afterEach(() => {
    resetFounderObservationStore();
    vi.useRealTimers();
  });

  it("tracks sequence and milestones", () => {
    startFounderObservationSession("/front-door");
    recordScreen("/today");
    recordMeaningfulAction("testid:v2-mission-cta", "/today");
    recordScreen("/today/mission");
    recordScreen("/today/coach-plan");
    recordScreen("/ask-amy");

    const summary = getFounderObservationSummary();
    expect(summary).not.toBeNull();
    expect(summary!.screenSequence).toEqual([
      "Front Door",
      "Today",
      "Mission",
      "Coach",
      "Ask Amy",
    ]);
    expect(summary!.firstMeaningfulAction?.detail).toBe(
      "testid:v2-mission-cta",
    );
    expect(summary!.timeToFirstMissionMs).not.toBeNull();
    expect(summary!.timeToCoachMs).not.toBeNull();
    expect(summary!.timeToAskAmyMs).not.toBeNull();
  });

  it("records leaving Today and first hesitation", () => {
    startFounderObservationSession("/today");
    recordScreen("/premium");
    expect(getFounderObservationSummary()!.timeBeforeLeavingTodayMs).not.toBeNull();

    startFounderObservationSession("/today");
    noteActivity();
    vi.advanceTimersByTime(__founderObsTest.IDLE_MS + 10);
    expect(getFounderObservationSummary()!.firstHesitationMs).not.toBeNull();

    // second hesitation ignored
    recordHesitation();
    const events = __founderObsTest
      .getEvents()
      .filter((e) => e.type === "hesitation");
    expect(events).toHaveLength(1);
  });

  it("exports json without analytics fields", () => {
    startFounderObservationSession("/today");
    const json = exportFounderObservationJson();
    expect(json).toContain("screenSequence");
    expect(json).not.toContain("firebase");
    expect(json).not.toContain("analytics");
  });
});

describe("founder-observation enabled", () => {
  afterEach(() => {
    try {
      localStorage.removeItem("__amynest_founder_observe");
    } catch {
      /* ignore */
    }
  });

  it("is DEV-gated and off by default", () => {
    expect(isFounderObservationBuildEnabled()).toBe(
      Boolean(import.meta.env.DEV),
    );
    expect(isFounderObservationEnabled()).toBe(false);
  });

  it("opt-in via localStorage", () => {
    setFounderObservationPreferred(true);
    expect(isFounderObservationEnabled()).toBe(true);
    setFounderObservationPreferred(false);
    expect(isFounderObservationEnabled()).toBe(false);
  });
});
