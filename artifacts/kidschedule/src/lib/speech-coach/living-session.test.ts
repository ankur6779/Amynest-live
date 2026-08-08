import { describe, expect, it } from "vitest";
import {
  livingSpeechLiveEyebrow,
  livingSpeechSessionCompleteBody,
  livingSpeechSessionPresenceLabel,
} from "./living-room";

describe("speech living session chrome (P0-2)", () => {
  it("never exposes XP / points / streak theatre in living labels", () => {
    const joined = [
      livingSpeechSessionPresenceLabel(),
      livingSpeechLiveEyebrow(),
      livingSpeechSessionCompleteBody(120, 5),
    ]
      .join(" ")
      .toLowerCase();
    expect(joined).not.toMatch(/\b(xp|points|streak|unlock|level|coin)\b/);
    expect(joined).toMatch(/together|gentle|enough|voice/);
  });
});
