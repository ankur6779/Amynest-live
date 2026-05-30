import { describe, expect, it } from "vitest";
import { createSafeAudio } from "@/lib/phonics-safe-audio";

describe("createSafeAudio", () => {
  it("returns an element for phonics library proxy URLs", () => {
    const url = "/api/phonics-library/phonics/letters/a.mp3";
    const el = createSafeAudio(url, { catalogKey: "letter:a", label: "a" });
    expect(el).not.toBeNull();
  });

  it("returns null for direct GCS URLs", () => {
    const url =
      "https://storage.googleapis.com/amynest-audio-storage/phonics/letters/a.mp3";
    const el = createSafeAudio(url, { catalogKey: "letter:a", label: "a" });
    expect(el).toBeNull();
  });

  it("returns null for blocked static GCS URLs", () => {
    const url =
      "https://storage.googleapis.com/amynest-audio-storage/static-audio/deadbeefdeadbeefdeadbeefdeadbeef.mp3";
    const el = createSafeAudio(url);
    expect(el).toBeNull();
  });

  it("never throws on invalid input", () => {
    expect(() => createSafeAudio("")).not.toThrow();
    expect(createSafeAudio("")).toBeNull();
  });
});
