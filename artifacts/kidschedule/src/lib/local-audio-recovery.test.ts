import { describe, expect, it } from "vitest";
import { isLocalAudioRecoveryEnabled } from "@/lib/local-audio-recovery";
import { isLocalAudioPackStub, listLocalPackEntryCount, resolveLocalSpellingUrl } from "@/lib/local-audio-pack";

describe("local-audio-recovery P0 launch gate", () => {
  it("enables recovery when bundled pack is not stub tier", () => {
    expect(isLocalAudioPackStub()).toBe(false);
    expect(isLocalAudioRecoveryEnabled()).toBe(true);
    expect(listLocalPackEntryCount()).toBeGreaterThan(40);
  });

  it("resolves spelling clip URLs from bundled manifest", () => {
    const url = resolveLocalSpellingUrl("cat");
    expect(url).toMatch(/^\/audio-pack\/spelling\/cat\.mp3$/);
  });
});
