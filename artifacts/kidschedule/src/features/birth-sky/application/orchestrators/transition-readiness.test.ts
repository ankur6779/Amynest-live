import { describe, expect, it } from "vitest";
import {
  createTransitionReadiness,
  isTransitionReady,
  withReadinessPatch,
} from "./transition-readiness";

describe("transition_completed readiness", () => {
  it("does not complete on cold open", () => {
    let s = createTransitionReadiness(false);
    s = withReadinessPatch(s, {
      heroRendered: true,
      skyInteractive: true,
      firstFrameStable: true,
      transitionOverlayActive: false,
    });
    expect(s.completed).toBe(false);
  });

  it("completes only when all three gates clear and overlay done", () => {
    let s = createTransitionReadiness(true);
    expect(isTransitionReady(s.flags)).toBe(false);
    s = withReadinessPatch(s, { heroRendered: true });
    expect(s.completed).toBe(false);
    s = withReadinessPatch(s, { skyInteractive: true, firstFrameStable: true });
    expect(s.completed).toBe(false); // overlay still active by default
    s = withReadinessPatch(s, { transitionOverlayActive: false });
    expect(s.completed).toBe(true);
  });

  it("never fires earlier while overlay active", () => {
    const s = withReadinessPatch(createTransitionReadiness(true), {
      heroRendered: true,
      skyInteractive: true,
      firstFrameStable: true,
      transitionOverlayActive: true,
    });
    expect(s.completed).toBe(false);
  });
});
