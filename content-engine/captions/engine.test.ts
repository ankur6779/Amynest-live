import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildCaptions } from "./engine.js";

describe("caption engine", () => {
  it("splits voice script into timed FFmpeg-ready segments", () => {
    const captions = buildCaptions(
      "Parents, start soft. Keep routines short. Celebrate progress. Try AmyNest AI today.",
      30,
    );
    assert.ok(captions.length >= 2);
    assert.equal(captions[0]?.start, 0);
    assert.equal(captions[captions.length - 1]?.end, 30);
    for (let i = 1; i < captions.length; i++) {
      assert.ok(captions[i]!.start >= captions[i - 1]!.start);
    }
    assert.ok(captions.some((c) => c.style === "cta" || c.style === "emphasis"));
  });
});
