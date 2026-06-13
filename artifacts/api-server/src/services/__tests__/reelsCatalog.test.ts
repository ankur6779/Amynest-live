import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  parseReelsCatalogV1,
  resolveReelStreamPath,
  titleFromReelId,
} from "../reelsCatalog.js";

describe("reelsCatalog", () => {
  it("derives title from catalog id", () => {
    assert.equal(titleFromReelId("artcraft-1"), "Artcraft 1");
    assert.equal(titleFromReelId("paper-boat-fun"), "Paper Boat Fun");
  });

  it("builds stream path from id", () => {
    assert.equal(resolveReelStreamPath("artcraft-42"), "/api/reels/stream/artcraft-42");
  });

  it("parses catalog v1 schema", () => {
    const catalog = parseReelsCatalogV1({
      version: 1,
      prefix: "reels-hub/phase1/",
      entries: [
        {
          id: "artcraft-1",
          title: "Artcraft 1",
          objectKey: "reels-hub/phase1/artcraft-1.mp4",
          sizeBytes: 123,
          contentType: "video/mp4",
          active: true,
        },
      ],
    });
    assert.equal(catalog.entries.length, 1);
    assert.equal(catalog.entries[0]?.id, "artcraft-1");
  });
});
