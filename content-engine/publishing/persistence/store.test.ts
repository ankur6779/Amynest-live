import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { PersistedPublishRecord } from "../../types/published-video.js";
import { InMemoryPublishStore } from "./store.js";

describe("publish persistence", () => {
  it("stores records by video id and idempotency key", () => {
    const store = new InMemoryPublishStore();
    const record: PersistedPublishRecord = {
      id: "pv1",
      videoId: "vid1",
      url: "https://youtube.com/shorts/vid1",
      uploadedAt: new Date().toISOString(),
      publishedAt: null,
      visibility: "private",
      metadata: {
        title: "t",
        description: "d",
        tags: ["a"],
        categoryId: "22",
        language: "en-IN",
        playlistId: "AmyNest Shorts",
        visibility: "private",
        license: "youtube",
        madeForKids: false,
        selfDeclaredMadeForKids: false,
      },
      provider: "mock",
      checksum: "abc",
      renderPackageId: "rp1",
      contentPackageTopicId: "topic1",
      idempotencyKey: "idem-abc",
      retryHistory: [],
      thumbnail: {
        path: "brand://default",
        source: "branding-default",
        applied: false,
      },
      schedule: {
        mode: "immediate",
        visibility: "private",
        publishAt: new Date().toISOString(),
        timezone: "Asia/Kolkata",
      },
    };

    store.save(record);
    assert.equal(store.getByVideoId("vid1")?.id, "pv1");
    assert.equal(store.getByIdempotencyKey("idem-abc")?.videoId, "vid1");
    store.saveDeadLetter({
      id: "dl1",
      idempotencyKey: "idem-fail",
      renderPackageId: "rp2",
      failedAt: new Date().toISOString(),
      lastError: "quota",
      errorCode: "quota",
      retryHistory: [],
    });
    assert.equal(store.listDeadLetters().length, 1);
  });
});
