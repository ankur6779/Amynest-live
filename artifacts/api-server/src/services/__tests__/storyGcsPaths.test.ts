import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  extForStoryMime,
  isValidStoryGcsUrl,
  resolveStoryStreamUrl,
  storyGcsObjectName,
  storyPublicGcsUrl,
} from "../storyGcsPaths";

describe("Story GCS paths", () => {
  it("builds object name and public URL from drive file id", () => {
    const id = "abc123XYZ";
    assert.equal(storyGcsObjectName(id, "video/mp4"), `story-hub/${id}.mp4`);
    const url = storyPublicGcsUrl(id, "video/mp4", "amynest-content-test");
    assert.equal(url, `https://storage.googleapis.com/amynest-content-test/story-hub/${id}.mp4`);
    assert.equal(isValidStoryGcsUrl(url), true);
    assert.equal(isValidStoryGcsUrl(undefined), false);
    assert.equal(isValidStoryGcsUrl("https://storage.googleapis.com/b/undefined.mp4"), false);
  });

  it("derives extension from original filename when mime is unknown", () => {
    assert.equal(extForStoryMime("application/octet-stream", "My_Story.webm"), "webm");
  });
});

describe("resolveStoryStreamUrl", () => {
  it("prefers GCS URL when mirrored", () => {
    const gcs = "https://storage.googleapis.com/bucket/story-hub/file1.mp4";
    assert.equal(
      resolveStoryStreamUrl({ driveFileId: "file1", gcsUrl: gcs }),
      gcs,
    );
  });

  it("falls back to Drive proxy when not mirrored", () => {
    assert.equal(
      resolveStoryStreamUrl({ driveFileId: "file1", gcsUrl: null }),
      "/api/reels/stream/file1",
    );
  });
});
