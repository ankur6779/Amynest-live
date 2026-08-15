import { describe, expect, it } from "vitest";
import {
  livingSpeechGameAccentClass,
  livingSpeechGameCardClass,
  livingSpeechGameCompleteBody,
  livingSpeechGamePlayLabel,
  livingSpeechHeardLabel,
  livingSpeechLimitTitle,
  livingSpeechLiveEyebrow,
  livingSpeechSessionCompleteBody,
  livingSpeechSessionPresenceLabel,
  livingSpeechStartLiveLabel,
  livingSpeechStartTalkLabel,
  livingSpeechTalkEndedBody,
  livingSpeechTalkEndedTitle,
  livingSpeechTalkEyebrow,
  livingSpeechV2CompleteBody,
  livingSpeechV2CompleteTitle,
  livingSpeechV2PresenceLabel,
  SPEECH_LIVING_DEEP_PALETTE,
} from "./living-room";

describe("speech living session chrome (P0-2 + deep interior)", () => {
  it("never exposes XP / points / streak theatre in living labels", () => {
    const joined = [
      livingSpeechSessionPresenceLabel(),
      livingSpeechLiveEyebrow(),
      livingSpeechSessionCompleteBody(120, 5),
      livingSpeechStartLiveLabel(),
      livingSpeechStartTalkLabel(),
      livingSpeechTalkEyebrow(),
      livingSpeechTalkEndedTitle("trial"),
      livingSpeechTalkEndedBody("trial"),
      livingSpeechV2PresenceLabel(),
      livingSpeechV2CompleteTitle(),
      livingSpeechV2CompleteBody(),
      livingSpeechGameCompleteBody(),
      livingSpeechGamePlayLabel(),
      livingSpeechLimitTitle(),
      livingSpeechHeardLabel("hello"),
    ]
      .join(" ")
      .toLowerCase();
    expect(joined).not.toMatch(/\b(xp|points|streak|unlock|level|coin|upgrade now|neon)\b/);
    expect(joined).toMatch(/together|gentle|enough|voice|amy|ready|practice/);
  });

  it("living deep palette stays cream sanctuary (no neon violet)", () => {
    expect(SPEECH_LIVING_DEEP_PALETTE.panelBorder).toMatch(/232,\s*212,\s*184/);
    expect(SPEECH_LIVING_DEEP_PALETTE.violet).not.toMatch(/139,\s*92,\s*246/);
  });

  it("living mid-play chrome is sanctuary not themed game gradients", () => {
    expect(livingSpeechGameCardClass()).toMatch(/bg-card/);
    expect(livingSpeechGameCardClass().toLowerCase()).not.toMatch(/violet|fuchsia|cyan|amber/);
    expect(livingSpeechGameAccentClass().toLowerCase()).not.toMatch(/violet|fuchsia|cyan/);
    expect(livingSpeechGamePlayLabel().toLowerCase()).not.toMatch(/coin|xp|streak|play now/);
  });
});
