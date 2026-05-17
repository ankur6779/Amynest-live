import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ttsGcsObjectName, ttsPublicGcsUrl } from "../ttsGcsPaths";

describe("TTS GCS public URL", () => {
  it("builds storage.googleapis.com URL from content hash", () => {
    const hash = "a".repeat(64);
    const objectName = ttsGcsObjectName(hash);
    assert.equal(objectName, `tts-cache/${hash}.mp3`);
    const url = ttsPublicGcsUrl(hash, "amynest-tts-test");
    assert.equal(
      url,
      `https://storage.googleapis.com/amynest-tts-test/tts-cache/${hash}.mp3`,
    );
  });
});
