import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  GCS_SIGNED_URL_EXPIRY_BUFFER_MS,
  isGcsSignedUrlValid,
  parseGcsV4SignedUrlExpiresAtMs,
} from "./gcs-signed-url-expiry.js";

const SAMPLE_URL =
  "https://storage.googleapis.com/bucket/Rhymes/song.mp3" +
  "?X-Goog-Algorithm=GOOG4-RSA-SHA256" +
  "&X-Goog-Credential=test%40project.iam.gserviceaccount.com%2F20260612%2Fauto%2Fstorage%2Fgoog4_request" +
  "&X-Goog-Date=20260612T134706Z" +
  "&X-Goog-Expires=2700" +
  "&X-Goog-SignedHeaders=host" +
  "&X-Goog-Signature=abc";

describe("gcs-signed-url-expiry", () => {
  it("parses X-Goog-Date + X-Goog-Expires into epoch ms", () => {
    const expiresAt = parseGcsV4SignedUrlExpiresAtMs(SAMPLE_URL);
    assert.ok(expiresAt);
    assert.equal(expiresAt, Date.UTC(2026, 5, 12, 13, 47, 6) + 2700 * 1000);
  });

  it("returns null for non-GCS URLs", () => {
    assert.equal(parseGcsV4SignedUrlExpiresAtMs("https://example.com/a.mp3"), null);
  });

  it("isGcsSignedUrlValid respects buffer before expiry", () => {
    const expiresAt = parseGcsV4SignedUrlExpiresAtMs(SAMPLE_URL)!;
    assert.equal(isGcsSignedUrlValid(SAMPLE_URL, expiresAt - 60_000, 30_000), true);
    assert.equal(isGcsSignedUrlValid(SAMPLE_URL, expiresAt - 10_000, 30_000), false);
  });

  it("buffer constant is 30s", () => {
    assert.equal(GCS_SIGNED_URL_EXPIRY_BUFFER_MS, 30_000);
  });
});
