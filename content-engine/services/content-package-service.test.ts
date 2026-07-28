import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MockProvider, ProviderRegistry } from "../ai/index.js";
import { InMemoryContentCache } from "../cache/index.js";
import { loadDefaultConfig } from "../config/index.js";
import { InMemoryTelemetrySink } from "../telemetry/index.js";
import type { Topic } from "../types/index.js";
import { ContentPackageService } from "./content-package-service.js";

const topic: Topic = {
  id: "parenting-001",
  title: "Gentle Discipline That Actually Works",
  category: "Parenting",
  difficulty: "beginner",
  ageGroup: "all",
  keywords: ["parenting", "discipline", "amynest"],
  cta: "Try AmyNest AI for calmer daily parenting support",
  priority: 10,
  estimatedDuration: 30,
  videoStyle: "short",
};

describe("ContentPackageService", () => {
  it("generates a complete ContentPackage via MockProvider", async () => {
    const telemetry = new InMemoryTelemetrySink();
    const service = new ContentPackageService({
      config: loadDefaultConfig(),
      telemetry,
    });

    const result = await service.generateFromTopic(topic);
    const pkg = result.package;

    assert.equal(pkg.topic.id, topic.id);
    assert.ok(pkg.title.length > 0);
    assert.ok(pkg.alternateTitles.length >= 5);
    assert.ok(pkg.hook.length > 0);
    assert.ok(pkg.openingQuestion.length > 0);
    assert.ok(pkg.story.length > 0);
    assert.ok(pkg.keyPoints.length >= 3 && pkg.keyPoints.length <= 5);
    assert.ok(pkg.voiceScript.length > 0);
    assert.ok(pkg.sceneScript.length > 0);
    assert.ok(pkg.captions.length >= 1);
    assert.ok(pkg.captions.every((c) => c.end >= c.start));
    assert.ok(pkg.hashtags.length >= 10 && pkg.hashtags.length <= 20);
    assert.ok(pkg.seoScore >= 55);
    assert.ok(result.quality.overall >= 60);
    assert.equal(pkg.provider, "mock");
    assert.equal(pkg.version, "2.0.0");
    assert.equal(result.cacheHit, false);
    assert.equal(telemetry.list().length, 1);
  });

  it("returns cache hits for identical topics", async () => {
    const cache = new InMemoryContentCache();
    const service = new ContentPackageService({
      config: loadDefaultConfig(),
      cache,
    });
    const first = await service.generateFromTopic(topic);
    const second = await service.generateFromTopic(topic);
    assert.equal(first.cacheHit, false);
    assert.equal(second.cacheHit, true);
    assert.equal(second.package.title, first.package.title);
  });

  it("auto-regenerates after moderation failure", async () => {
    const unsafe = new MockProvider({ injectUnsafeOnce: true });
    const registry = new ProviderRegistry();
    registry.register(unsafe);

    const service = new ContentPackageService({
      config: {
        ...loadDefaultConfig(),
        scriptProvider: "mock",
        maxRetries: 2,
      },
      registry,
    });

    const result = await service.generateFromTopic(topic);
    assert.equal(result.moderation.ok, true);
    assert.ok(result.telemetry.retryCount >= 1);
    assert.ok(
      !/miracle cure|heal autism|guarantee medical/i.test(result.package.voiceScript),
    );
  });

  it("falls back to secondary provider after primary failures", async () => {
    const primary = new MockProvider({ failTimes: 2 });
    // Re-register under a custom id by wrapping
    const failing = {
      id: "openai",
      supportsStreaming: () => true,
      supportsImages: () => true,
      supportsJSON: () => true,
      health: async () => ({ ok: false, checkedAt: new Date().toISOString() }),
      generate: (req: Parameters<MockProvider["generate"]>[0]) => primary.generate(req),
    };
    const fallback = new MockProvider();
    const registry = new ProviderRegistry();
    registry.register(failing);
    registry.register(fallback);

    const service = new ContentPackageService({
      config: {
        ...loadDefaultConfig(),
        scriptProvider: "openai",
        fallbackProvider: "mock",
        maxRetries: 2,
      },
      registry,
    });

    const result = await service.generateFromTopic(topic);
    assert.equal(result.package.provider, "mock");
    assert.ok(result.telemetry.errors.some((e) => e.includes("PROVIDER_UNAVAILABLE") || e.includes("fallback")));
  });
});
