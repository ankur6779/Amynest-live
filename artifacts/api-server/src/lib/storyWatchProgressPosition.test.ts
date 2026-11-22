import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveStoryWatchProgressPositionSec } from "./storyWatchProgressPosition.js";

describe("resolveStoryWatchProgressPositionSec", () => {
  it("keeps mid-story resume when autoplay posts a zero before seek completes", () => {
    assert.equal(
      resolveStoryWatchProgressPositionSec({
        incomingPositionSec: 0,
        existingPositionSec: 187,
        isCompleted: false,
      }),
      187,
    );
  });

  it("advances when the client reports a later position", () => {
    assert.equal(
      resolveStoryWatchProgressPositionSec({
        incomingPositionSec: 210,
        existingPositionSec: 187,
        isCompleted: false,
      }),
      210,
    );
  });

  it("resets to zero on completion", () => {
    assert.equal(
      resolveStoryWatchProgressPositionSec({
        incomingPositionSec: 400,
        existingPositionSec: 187,
        isCompleted: true,
      }),
      0,
    );
  });

  it("allows first-play zeros when nothing was saved yet", () => {
    assert.equal(
      resolveStoryWatchProgressPositionSec({
        incomingPositionSec: 0,
        existingPositionSec: null,
        isCompleted: false,
      }),
      0,
    );
  });
});
