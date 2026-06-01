import { beforeEach, describe, expect, it, vi } from "vitest";

import audioMap from "@/data/static-audio-map.json";

/**
 * Regression test for the static-audio fast path (branch: audio-fast-path).
 *
 * The happy path must stream directly from the API proxy `src` (reusing the
 * warm URL-keyed element) and must NOT download the MP3 to a blob + run
 * decodeAudioData() before playback. Guard against silently regressing back to
 * the blob path, which added a duration-scaled per-tap main-thread cost.
 */

const { getCachedMock, createMock, trackObjectUrlMock } = vi.hoisted(() => {
  const makeEl = (src: string) =>
    ({ src, play: vi.fn(), pause: vi.fn(), load: vi.fn() }) as unknown as HTMLAudioElement;
  return {
    getCachedMock: vi.fn((url: string) => makeEl(url)),
    createMock: vi.fn((url: string) => makeEl(url)),
    trackObjectUrlMock: vi.fn(),
  };
});

vi.mock("@/lib/audio-manager", () => ({
  audioManager: {
    getCached: getCachedMock,
    create: createMock,
    trackObjectUrl: trackObjectUrlMock,
  },
}));

import { prepareStaticPlaybackAudio } from "./static-audio";

const firstMappedPhrase = Object.keys(
  (audioMap as { default: Record<string, string> }).default,
)[0];

describe("static audio fast path", () => {
  beforeEach(() => {
    getCachedMock.mockClear();
    createMock.mockClear();
    trackObjectUrlMock.mockClear();
    globalThis.fetch = vi.fn() as unknown as typeof fetch;
  });

  it("returns a direct-src proxy element on the happy path", async () => {
    expect(firstMappedPhrase, "static-audio-map.json must have entries").toBeTruthy();

    const el = await prepareStaticPlaybackAudio(firstMappedPhrase);

    expect(el).not.toBeNull();
    expect(el!.src).toMatch(/\/api\/static-audio\/[a-f0-9]{32}\.mp3$/);
    expect(el!.src.startsWith("blob:")).toBe(false);
  });

  it("reuses the warm cached element and skips the blob fetch + decode path", async () => {
    await prepareStaticPlaybackAudio(firstMappedPhrase);

    expect(getCachedMock).toHaveBeenCalledTimes(1);
    expect(createMock).not.toHaveBeenCalled();
    // Blob path (fetch -> blob -> decodeAudioData) must not run on the happy path.
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});
