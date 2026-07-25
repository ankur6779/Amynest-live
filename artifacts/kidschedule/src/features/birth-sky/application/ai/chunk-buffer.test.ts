import { describe, expect, it } from "vitest";
import { applyChunk, createChunkBuffer } from "./chunk-buffer";

describe("chunkSequence buffer", () => {
  it("appends in-order chunks", () => {
    let s = createChunkBuffer();
    s = applyChunk(s, 1, "Hel");
    s = applyChunk(s, 2, "lo");
    expect(s.text).toBe("Hello");
    expect(s.committedSequence).toBe(2);
  });

  it("ignores duplicates", () => {
    let s = createChunkBuffer();
    s = applyChunk(s, 1, "A");
    s = applyChunk(s, 1, "A");
    expect(s.text).toBe("A");
  });

  it("ignores out-of-order gaps", () => {
    let s = createChunkBuffer();
    s = applyChunk(s, 1, "A");
    s = applyChunk(s, 3, "C");
    expect(s.text).toBe("A");
    s = applyChunk(s, 2, "B");
    expect(s.text).toBe("AB");
  });
});
