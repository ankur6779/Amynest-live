import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

describe("getTtsProvider", () => {
  const prevProvider = process.env.TTS_PROVIDER;
  const prevEleven = process.env.TTS_ELEVENLABS_ENABLED;

  beforeEach(() => {
    delete process.env.TTS_PROVIDER;
    delete process.env.TTS_ELEVENLABS_ENABLED;
  });

  afterEach(() => {
    if (prevProvider === undefined) delete process.env.TTS_PROVIDER;
    else process.env.TTS_PROVIDER = prevProvider;
    if (prevEleven === undefined) delete process.env.TTS_ELEVENLABS_ENABLED;
    else process.env.TTS_ELEVENLABS_ENABLED = prevEleven;
  });

  it("defaults to openai when unset", async () => {
    const { getTtsProvider } = await import("../env.js");
    assert.equal(getTtsProvider(), "openai");
  });

  it("forces openai when ElevenLabs is disabled", async () => {
    process.env.TTS_PROVIDER = "elevenlabs";
    process.env.TTS_ELEVENLABS_ENABLED = "false";
    const { getTtsProvider } = await import("../env.js");
    assert.equal(getTtsProvider(), "openai");
  });

  it("honors elevenlabs when explicitly enabled", async () => {
    process.env.TTS_PROVIDER = "elevenlabs";
    process.env.TTS_ELEVENLABS_ENABLED = "true";
    const { getTtsProvider } = await import("../env.js");
    assert.equal(getTtsProvider(), "elevenlabs");
  });

  it("treats unknown provider values as openai", async () => {
    process.env.TTS_PROVIDER = "other";
    process.env.TTS_ELEVENLABS_ENABLED = "true";
    const { getTtsProvider } = await import("../env.js");
    assert.equal(getTtsProvider(), "openai");
  });
});
