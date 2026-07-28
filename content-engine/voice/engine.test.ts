import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { estimateSpeakingSeconds, refineVoiceScript } from "./engine.js";

describe("voice script engine", () => {
  it("keeps narration in a speakable 15–30s window", () => {
    const long =
      "This is a very long narration that keeps going with many words about parenting routines and calm cues and family connection and more guidance that should be trimmed for short form video delivery while remaining natural and emotionally engaging for parents who are listening carefully.";
    const refined = refineVoiceScript(long, 20);
    const seconds = estimateSpeakingSeconds(refined);
    assert.ok(seconds >= 15 && seconds <= 30, `got ${seconds}s`);
    assert.ok(!/\s{2,}/.test(refined));
  });
});
