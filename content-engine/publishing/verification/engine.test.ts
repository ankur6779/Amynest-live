import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DEFAULT_PUBLISHING_SETTINGS } from "../../config/publishing.js";
import { buildPublishMetadata } from "../metadata/index.js";
import { makeContentPackage, makeRenderPackage } from "../test-fixtures.js";
import { MockPublishingProvider } from "../youtube/mock.js";
import { verifyPublishedVideo } from "./engine.js";

describe("publishing verification", () => {
  it("verifies uploaded video metadata and media properties", async () => {
    const provider = new MockPublishingProvider();
    const content = makeContentPackage();
    const render = makeRenderPackage();
    const metadata = buildPublishMetadata(content, DEFAULT_PUBLISHING_SETTINGS);
    const upload = await provider.upload({
      jobId: "j1",
      idempotencyKey: "verify-1",
      videoPath: render.videoPath,
      thumbnailPath: null,
      metadata,
      schedule: {
        mode: "immediate",
        visibility: metadata.visibility,
        publishAt: new Date().toISOString(),
        timezone: "Asia/Kolkata",
      },
      durationSeconds: render.duration,
      width: render.resolution.width,
      height: render.resolution.height,
      checksum: render.checksum,
    });

    const report = await verifyPublishedVideo({
      provider,
      videoId: upload.videoId,
      metadata,
      visibility: upload.visibility,
      durationSeconds: render.duration,
      width: 1080,
      height: 1920,
      thumbnail: {
        path: "brand://amynest-default-thumb.jpg",
        source: "branding-default",
        applied: false,
      },
    });

    assert.equal(report.ok, true);
    assert.equal(report.videoExists, true);
    assert.equal(report.metadataApplied, true);
    assert.equal(report.visibilityCorrect, true);
    assert.equal(report.durationMatch, true);
    assert.equal(report.resolutionMatch, true);
  });
});
