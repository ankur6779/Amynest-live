import { describe, expect, it } from "vitest";
import {
  assertPrefetchCacheKey,
  assertVerbatimParentHubText,
  computeParentHubAudioIdentityHash,
  createParentHubAudioIdentity,
  parentHubLocalCacheKey,
  parentHubPipelineCacheKey,
  resolveParentHubPlaybackCacheKey,
} from "@/lib/parent-hub-audio-identity";
import { pipelineCacheKey } from "@/lib/amy-voice-pipeline-optimizer";

describe("parent-hub-audio-identity safety contract", () => {
  const sharedPrefix =
    "This is the opening sentence shared by both Parent Hub items in our regression test.";
  const textA = `${sharedPrefix} Item A ends with unique alpha marker.`;
  const textB = `${sharedPrefix} Item B ends with unique beta marker.`;

  it("assigns different cache keys to similar-prefix items", () => {
    const idA = createParentHubAudioIdentity({
      sectionId: "hub_facts",
      itemId: "fact-a",
      text: textA,
    });
    const idB = createParentHubAudioIdentity({
      sectionId: "hub_facts",
      itemId: "fact-b",
      text: textB,
    });

    expect(idA.hash).not.toBe(idB.hash);
    expect(parentHubPipelineCacheKey(idA)).not.toBe(parentHubPipelineCacheKey(idB));
    expect(resolveParentHubPlaybackCacheKey(idA)).toBe(parentHubPipelineCacheKey(idA));
  });

  it("throws in dev when UI text diverges from identity text", () => {
    const identity = createParentHubAudioIdentity({
      sectionId: "hub_articles",
      itemId: "article-1:0",
      text: "Visible article intro text.",
    });

    expect(() =>
      assertVerbatimParentHubText("Visible article intro text.", identity.text),
    ).not.toThrow();
    expect(() =>
      assertVerbatimParentHubText("Modified UI text.", identity.text),
    ).toThrow(/Non-verbatim text used for Parent Hub audio identity/);
  });

  it("prefetch and playback keys must match for the same identity", () => {
    const identity = createParentHubAudioIdentity({
      sectionId: "hub_daily_stories",
      itemId: "story-42",
      text: "Once upon a time there was a brave little fox.",
    });
    const playbackKey = resolveParentHubPlaybackCacheKey(identity);
    const prefetchKey = parentHubPipelineCacheKey(identity);

    expect(() => assertPrefetchCacheKey(prefetchKey, playbackKey)).not.toThrow();
    expect(
      pipelineCacheKey(identity.text, "default", {
        parentHub: true,
        audioIdentity: identity,
      }),
    ).toBe(playbackKey);
  });

  it("uses full raw text hash without truncation", () => {
    const longA = `${"a".repeat(300)} unique tail A`;
    const longB = `${"a".repeat(300)} unique tail B`;
    const idA = createParentHubAudioIdentity({
      sectionId: "hub_age_stories",
      itemId: "story-a",
      text: longA,
    });
    const idB = createParentHubAudioIdentity({
      sectionId: "hub_age_stories",
      itemId: "story-b",
      text: longB,
    });

    expect(computeParentHubAudioIdentityHash(idA)).not.toBe(computeParentHubAudioIdentityHash(idB));
    expect(parentHubPipelineCacheKey(idA)).not.toBe(parentHubPipelineCacheKey(idB));
  });

  it("prefetch collision: adjacent items never share local cache keys", () => {
    const current = createParentHubAudioIdentity({
      sectionId: "hub_articles",
      itemId: "article-x:0",
      text: textA,
    });
    const next = createParentHubAudioIdentity({
      sectionId: "hub_articles",
      itemId: "article-x:1",
      text: textB,
    });

    expect(parentHubLocalCacheKey(current)).not.toBe(parentHubLocalCacheKey(next));
    expect(parentHubPipelineCacheKey(current)).not.toBe(parentHubPipelineCacheKey(next));
  });
});
