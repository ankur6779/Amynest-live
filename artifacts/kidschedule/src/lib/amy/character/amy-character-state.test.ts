import { describe, expect, it } from "vitest";
import {
  amy3dToCharacterState,
  characterStateToAssetKey,
  stageToCharacterState,
} from "./amy-character-state";
import { shouldSuppressBlinkForMouth } from "./amy-blink-schedule";

describe("amy-character-state", () => {
  it("maps legacy Amy3D states", () => {
    expect(amy3dToCharacterState("speaking")).toBe("talking");
    expect(amy3dToCharacterState("encouraging")).toBe("happy");
    expect(amy3dToCharacterState("listening")).toBe("listening");
  });

  it("maps extended internal states to assets", () => {
    expect(characterStateToAssetKey("waiting")).toBe("thinking");
    expect(characterStateToAssetKey("sleeping")).toBe("thinking");
    expect(characterStateToAssetKey("error")).toBe("idle");
    expect(characterStateToAssetKey("happy")).toBe("happy");
  });

  it("maps stage states", () => {
    expect(stageToCharacterState("celebrating")).toBe("celebrating");
    expect(stageToCharacterState("talking")).toBe("talking");
  });

  it("suppresses blink on wide-open phoneme", () => {
    expect(shouldSuppressBlinkForMouth(2, true)).toBe(true);
    expect(shouldSuppressBlinkForMouth(0, true)).toBe(false);
  });
});
