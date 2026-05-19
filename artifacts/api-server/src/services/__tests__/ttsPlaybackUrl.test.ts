import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolveTtsPlaybackUrl } from "../ttsPlaybackUrl.js";

describe("resolveTtsPlaybackUrl", () => {
  it("always returns API proxy path (never direct GCS)", () => {
    const hash = "a".repeat(64);
    const gcs = `https://storage.googleapis.com/bucket/tts-cache/${hash}.mp3`;
    assert.equal(resolveTtsPlaybackUrl(hash), `/api/tts/audio/${hash}.mp3`);
    assert.equal(resolveTtsPlaybackUrl(hash, { audioUrl: gcs }), `/api/tts/audio/${hash}.mp3`);
  });
});
