import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { loadDefaultConfig } from "../config/index.js";
import { InMemoryTelemetrySink } from "../telemetry/index.js";
import { exportPublishedVideo } from "./export/index.js";
import { InMemoryNotificationBus } from "./notifications/index.js";
import { PublishingOrchestrator } from "./orchestrator.js";
import { InMemoryPublishStore } from "./persistence/index.js";
import { makeContentPackage, makeRenderPackage } from "./test-fixtures.js";
import {
  MockPublishingProvider,
  PublishingProviderRegistry,
} from "./youtube/index.js";

describe("PublishingOrchestrator", () => {
  it("transforms RenderPackage into PublishedVideo", async () => {
    const config = loadDefaultConfig();
    const store = new InMemoryPublishStore();
    const notifications = new InMemoryNotificationBus();
    const telemetry = new InMemoryTelemetrySink();
    const render = makeRenderPackage();
    const content = makeContentPackage();

    const result = await new PublishingOrchestrator({
      config,
      store,
      notifications,
      telemetry,
      sleep: async () => undefined,
    }).publish({ render, content });

    assert.equal(result.video.version, "6.0.0");
    assert.ok(result.video.videoId.startsWith("mock_"));
    assert.ok(result.video.url.includes(result.video.videoId));
    assert.equal(result.video.provider, "mock");
    assert.equal(result.video.metadata.title, content.title);
    assert.equal(result.video.visibility, "private");
    assert.equal(result.video.verification.ok, true);
    assert.equal(result.video.checksum, render.checksum);
    assert.ok(result.video.auditLog.some((e) => e.action === "upload"));
    assert.ok(result.video.notifications.some((n) => n.event === "success"));
    assert.equal(result.telemetry.name, "publishing.publish");
    assert.equal(store.list().length, 1);
  });

  it("replays persisted uploads via idempotency key", async () => {
    const config = loadDefaultConfig();
    const store = new InMemoryPublishStore();
    const orchestrator = new PublishingOrchestrator({
      config,
      store,
      sleep: async () => undefined,
    });
    const input = {
      render: makeRenderPackage(),
      content: makeContentPackage(),
      idempotencyKey: "idem-1",
    };

    const first = await orchestrator.publish(input);
    const second = await orchestrator.publish(input);

    assert.equal(first.idempotentReplay, false);
    assert.equal(second.idempotentReplay, true);
    assert.equal(second.video.videoId, first.video.videoId);
    assert.equal(store.list().length, 1);
  });

  it("retries transient upload failures then succeeds", async () => {
    const config = { ...loadDefaultConfig(), uploadRetries: 3, retryBaseDelayMs: 1 };
    const mock = new MockPublishingProvider({ failUploads: 2, failWith: "network" });
    const registry = new PublishingProviderRegistry({ providers: [mock] });
    const notifications = new InMemoryNotificationBus();

    const result = await new PublishingOrchestrator({
      config,
      registry,
      notifications,
      sleep: async () => undefined,
    }).publish({
      render: makeRenderPackage(),
      content: makeContentPackage(),
    });

    assert.equal(result.video.verification.ok, true);
    assert.equal(result.video.retryHistory.length, 2);
    assert.ok(result.video.notifications.some((n) => n.event === "retry"));
  });

  it("dead-letters after exhausting retries", async () => {
    const config = {
      ...loadDefaultConfig(),
      uploadRetries: 1,
      retryBaseDelayMs: 1,
      deadLetterEnabled: true,
    };
    const mock = new MockPublishingProvider({ failUploads: 5, failWith: "quota" });
    const store = new InMemoryPublishStore();
    const registry = new PublishingProviderRegistry({ providers: [mock] });

    await assert.rejects(
      () =>
        new PublishingOrchestrator({
          config,
          registry,
          store,
          sleep: async () => undefined,
        }).publish({
          render: makeRenderPackage(),
          content: makeContentPackage(),
        }),
      /quota|failed/i,
    );
    assert.equal(store.listDeadLetters().length, 1);
  });

  it("exports publish manifests", async () => {
    const { video } = await new PublishingOrchestrator({
      config: loadDefaultConfig(),
      sleep: async () => undefined,
    }).publish({
      render: makeRenderPackage(),
      content: makeContentPackage(),
      overrides: { visibility: "unlisted", title: "Custom Title" },
    });

    assert.equal(video.metadata.title, "Custom Title");
    assert.equal(video.visibility, "unlisted");
    const json = exportPublishedVideo(video, "json");
    const yaml = exportPublishedVideo(video, "yaml");
    const manifest = exportPublishedVideo(video, "publish-manifest-v1");
    assert.match(json.content, /"version": "6.0.0"/);
    assert.match(yaml.content, /version: ["']?6\.0\.0["']?/);
    assert.equal(JSON.parse(manifest.content).format, "publish-manifest-v1");
  });
});
