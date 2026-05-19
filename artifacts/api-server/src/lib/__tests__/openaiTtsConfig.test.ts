import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

describe("openai-tts-config", () => {
  const prevVoice = process.env.OPENAI_TTS_VOICE;
  const prevAccent = process.env.OPENAI_TTS_ACCENT;
  const prevInstructions = process.env.OPENAI_TTS_INSTRUCTIONS;

  beforeEach(() => {
    delete process.env.OPENAI_TTS_VOICE;
    delete process.env.OPENAI_TTS_ACCENT;
    delete process.env.OPENAI_TTS_INSTRUCTIONS;
  });

  afterEach(() => {
    if (prevVoice === undefined) delete process.env.OPENAI_TTS_VOICE;
    else process.env.OPENAI_TTS_VOICE = prevVoice;
    if (prevAccent === undefined) delete process.env.OPENAI_TTS_ACCENT;
    else process.env.OPENAI_TTS_ACCENT = prevAccent;
    if (prevInstructions === undefined) delete process.env.OPENAI_TTS_INSTRUCTIONS;
    else process.env.OPENAI_TTS_INSTRUCTIONS = prevInstructions;
  });

  it("defaults to Indian-accent female (coral)", async () => {
    const mod = await import("../openai-tts-config.js");
    assert.equal(mod.getOpenAiTtsVoice(), "coral");
    assert.equal(mod.getOpenAiTtsAccent(), "indian");
    assert.match(mod.getOpenAiTtsInstructions("default"), /Indian English/i);
  });

  it("uses US female (nova) when OPENAI_TTS_ACCENT=us", async () => {
    process.env.OPENAI_TTS_ACCENT = "us";
    const mod = await import("../openai-tts-config.js");
    assert.equal(mod.getOpenAiTtsVoice(), "nova");
    assert.match(mod.getOpenAiTtsInstructions("default"), /American English/i);
  });

  it("respects OPENAI_TTS_VOICE override", async () => {
    process.env.OPENAI_TTS_VOICE = "shimmer";
    const mod = await import("../openai-tts-config.js");
    assert.equal(mod.getOpenAiTtsVoice(), "shimmer");
  });

  it("phonics mode adjusts instructions", async () => {
    const mod = await import("../openai-tts-config.js");
    assert.match(mod.getOpenAiTtsInstructions("phonics"), /phonics/i);
  });
});
