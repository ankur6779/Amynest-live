import { describe, expect, it } from "vitest";
import {
  buildTalkingAmyAvatarInputs,
  phaseToTalkingAmyMood,
} from "./talking-amy-avatar-contract";

describe("talking-amy-avatar-contract", () => {
  it("maps phases to moods", () => {
    expect(phaseToTalkingAmyMood("recording")).toBe("listening");
    expect(phaseToTalkingAmyMood("celebrate")).toBe("celebrating");
  });

  it("drives viseme from mic level while listening", () => {
    const inputs = buildTalkingAmyAvatarInputs("recording", 0.8);
    expect(inputs.micLevel).toBe(0.8);
    expect(inputs.viseme).toBeGreaterThan(0.5);
    expect(inputs.mood).toBe("listening");
  });
});
