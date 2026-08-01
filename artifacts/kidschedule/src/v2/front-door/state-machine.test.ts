import { describe, expect, it } from "vitest";
import {
  FrontDoorState,
  resumeFrontDoorState,
  transitionFrontDoor,
} from "./state-machine";

describe("Front Door state machine (review P0)", () => {
  it("walks BREATH → AGE → NAME → WORRY → COMPLETE", () => {
    let state = FrontDoorState.BREATH;
    state = transitionFrontDoor(state, "CONTINUE");
    expect(state).toBe(FrontDoorState.AGE);
    state = transitionFrontDoor(state, "SELECT_AGE");
    expect(state).toBe(FrontDoorState.NAME);
    state = transitionFrontDoor(state, "SKIP_NAME");
    expect(state).toBe(FrontDoorState.WORRY);
    state = transitionFrontDoor(state, "SELECT_WORRY");
    expect(state).toBe(FrontDoorState.COMPLETE);
  });

  it("supports BACK for future restore UX", () => {
    expect(transitionFrontDoor(FrontDoorState.WORRY, "BACK")).toBe(
      FrontDoorState.NAME,
    );
    expect(transitionFrontDoor(FrontDoorState.BREATH, "BACK")).toBe(
      FrontDoorState.BREATH,
    );
  });

  it("resumes COMPLETE when worry is already set", () => {
    expect(
      resumeFrontDoorState({ worry: "speech_talking", ageBand: "preschool_3_5" }),
    ).toBe(FrontDoorState.COMPLETE);
  });

  it("resumes explicit persisted state", () => {
    expect(
      resumeFrontDoorState({ state: FrontDoorState.NAME, ageBand: "child_6_8" }),
    ).toBe(FrontDoorState.NAME);
  });
});
