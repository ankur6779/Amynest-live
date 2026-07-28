import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ContentPackage } from "../types/content-package.js";
import { CONTENT_PACKAGE_VERSION } from "../types/content-package.js";
import { buildContentCacheKey, InMemoryContentCache } from "./store.js";

function pkg(id = "topic-1"): ContentPackage {
  return {
    topic: {
      id,
      title: "Title",
      category: "Parenting",
      difficulty: "beginner",
      ageGroup: "all",
      keywords: ["parenting"],
      cta: "Try AmyNest",
      priority: 5,
      estimatedDuration: 30,
      videoStyle: "short",
    },
    title: "Title",
    alternateTitles: ["A"],
    hook: "Hook",
    openingQuestion: "Q?",
    story: "Story",
    keyPoints: ["1", "2", "3"],
    cta: "CTA",
    voiceScript: "Voice",
    sceneScript: "Scene",
    captions: [],
    description: "Desc",
    hashtags: ["AmyNest"],
    keywords: ["parenting"],
    seoScore: 80,
    readingTime: 20,
    estimatedDuration: 30,
    language: "en-IN",
    provider: "mock",
    generatedAt: new Date().toISOString(),
    version: CONTENT_PACKAGE_VERSION,
  };
}

describe("content cache", () => {
  it("stores and returns values before TTL expiry", () => {
    const cache = new InMemoryContentCache();
    const key = buildContentCacheKey({
      topicId: "topic-1",
      language: "en-IN",
      duration: 30,
      videoStyle: "short",
      provider: "mock",
    });
    cache.set(key, pkg(), 60);
    assert.equal(cache.get(key)?.topic.id, "topic-1");
    assert.equal(cache.size(), 1);
  });

  it("expires entries and ignores mismatched versions", () => {
    const cache = new InMemoryContentCache();
    const key = "cp:test";
    cache.set(key, pkg(), 1);
    // Force expiry by manipulating private map through re-set with tiny TTL and time travel via delete path
    const entry = (cache as unknown as { map: Map<string, { expiresAt: string; version: string; value: ContentPackage; key: string; createdAt: string }> }).map.get(key);
    assert.ok(entry);
    entry.expiresAt = new Date(Date.now() - 1000).toISOString();
    assert.equal(cache.get(key), undefined);

    cache.set(key, pkg(), 60);
    const again = (cache as unknown as { map: Map<string, { version: string }> }).map.get(key)!;
    again.version = "0.0.0";
    assert.equal(cache.get(key), undefined);
  });
});
