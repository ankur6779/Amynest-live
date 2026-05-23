import { describe, expect, it } from "vitest";
import {
  assertPrefetchCacheKey,
  computeAudioIdentityHash,
  createAudioIdentity,
  lessonLocalCacheKey,
  lessonPipelineCacheKey,
  resolveLessonPlaybackCacheKey,
} from "@/lib/lesson-audio-identity";
import { pipelineCacheKey } from "@/lib/amy-voice-pipeline-optimizer";

describe("lesson-audio-identity safety contract", () => {
  const sharedPrefix =
    "This is the opening sentence shared by both lesson paragraphs in our regression test.";
  const paraA = `${sharedPrefix} Paragraph A ends with unique alpha marker.`;
  const paraB = `${sharedPrefix} Paragraph B ends with unique beta marker.`;

  it("assigns different cache keys to similar-prefix paragraphs", () => {
    const idA = createAudioIdentity("lesson-a", 0, paraA);
    const idB = createAudioIdentity("lesson-a", 1, paraB);

    expect(idA.hash).not.toBe(idB.hash);
    expect(lessonPipelineCacheKey(idA)).not.toBe(lessonPipelineCacheKey(idB));
    expect(resolveLessonPlaybackCacheKey(idA)).toBe(lessonPipelineCacheKey(idA));
  });

  it("scopes pipelineCacheKey by lessonId and paragraphIdx via audioIdentity", () => {
    const text = "Same paragraph text for testing.";
    const id0 = createAudioIdentity("lesson-a", 0, text);
    const id1 = createAudioIdentity("lesson-a", 1, text);

    const key0 = pipelineCacheKey(text, "default", {
      lessonParagraph: true,
      audioIdentity: id0,
    });
    const key1 = pipelineCacheKey(text, "default", {
      lessonParagraph: true,
      audioIdentity: id1,
    });

    expect(key0).not.toBe(key1);
    expect(key0).toBe(lessonPipelineCacheKey(id0, "default"));
    expect(key1).toBe(lessonPipelineCacheKey(id1, "default"));
  });

  it("uses full raw text hash without truncation", () => {
    const longA = `${"a".repeat(300)} unique tail A`;
    const longB = `${"a".repeat(300)} unique tail B`;
    const idA = createAudioIdentity("lesson-long", 0, longA);
    const idB = createAudioIdentity("lesson-long", 1, longB);

    expect(computeAudioIdentityHash(idA)).not.toBe(computeAudioIdentityHash(idB));
    expect(lessonPipelineCacheKey(idA)).not.toBe(lessonPipelineCacheKey(idB));
  });

  it("prefetch and playback keys must match for the same identity", () => {
    const identity = createAudioIdentity("lesson-prefetch", 2, "Prefetch paragraph text.");
    const playbackKey = resolveLessonPlaybackCacheKey(identity);
    const prefetchKey = lessonPipelineCacheKey(identity);

    expect(() => assertPrefetchCacheKey(prefetchKey, playbackKey)).not.toThrow();
  });

  it("prefetch collision: adjacent paragraphs never share local cache keys", () => {
    const current = createAudioIdentity("lesson-collision", 0, paraA);
    const next = createAudioIdentity("lesson-collision", 1, paraB);

    expect(lessonLocalCacheKey(current)).not.toBe(lessonLocalCacheKey(next));
    expect(lessonPipelineCacheKey(current)).not.toBe(lessonPipelineCacheKey(next));
  });
});
