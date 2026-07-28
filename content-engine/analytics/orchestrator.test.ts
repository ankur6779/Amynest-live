import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { loadDefaultConfig } from "../config/index.js";
import { getTopicById } from "../topics/index.js";
import { AnalyticsOrchestrator } from "./orchestrator.js";
import { InMemoryAnalyticsStore } from "./persistence/index.js";
import { makeContentPackage, makePublishedVideo } from "./test-fixtures.js";

describe("AnalyticsOrchestrator", () => {
  it("builds a complete AnalyticsReport from published videos", async () => {
    const topic = getTopicById("parenting-001")!;
    const content = makeContentPackage();
    const videos = [
      makePublishedVideo({ videoId: "vid_a" }),
      makePublishedVideo({
        videoId: "vid_b",
        metadata: {
          ...makePublishedVideo().metadata,
          title: "Amy Astro tip for calmer mornings",
        },
      }),
      makePublishedVideo({ videoId: "vid_c" }),
    ];

    const store = new InMemoryAnalyticsStore();
    const { report, telemetry } = await new AnalyticsOrchestrator({
      config: { ...loadDefaultConfig(), minimumSampleSize: 1 },
      store,
    }).analyze({
      videos,
      videoTopicIds: {
        vid_a: topic.id,
        vid_b: "astro-001",
        vid_c: topic.id,
      },
      topicsById: {
        [topic.id]: {
          title: topic.title,
          category: topic.category,
          videoStyle: topic.videoStyle,
        },
        "astro-001": {
          title: "Amy Astro tip",
          category: "Amy Astro",
          videoStyle: "astro",
        },
      },
      contentByTopicId: {
        [topic.id]: content,
      },
      schedule: "weekly",
    });

    assert.equal(report.version, "8.0.0");
    assert.equal(report.schedule, "weekly");
    assert.equal(report.videoSummaries.length, 3);
    assert.ok(report.topicScores.length >= 1);
    assert.ok(report.contentScores.length === 3);
    assert.ok(report.channelSummary.growthSummary.length > 0);
    assert.ok(report.periodReport.topVideos.length > 0);
    assert.ok(Array.isArray(report.recommendations));
    assert.ok(report.learningUpdates.topicPerformance.length > 0);
    assert.equal(report.telemetry.provider, "mock");
    assert.equal(telemetry.name, "analytics.analyze");
    assert.equal(store.listReports().length, 1);
    assert.ok(store.getLearning());
  });

  it("persists learning and exports analytics manifests", async () => {
    const topic = getTopicById("parenting-001")!;
    const orchestrator = new AnalyticsOrchestrator({
      config: { ...loadDefaultConfig(), minimumSampleSize: 1, optimizationEnabled: true },
    });
    const { report } = await orchestrator.analyze({
      videos: [makePublishedVideo({ videoId: "vid_export" })],
      videoTopicIds: { vid_export: topic.id },
      topicsById: {
        [topic.id]: {
          title: topic.title,
          category: topic.category,
          videoStyle: topic.videoStyle,
        },
      },
      contentByTopicId: { [topic.id]: makeContentPackage() },
    });

    const json = orchestrator.export(report, "json");
    const yaml = orchestrator.export(report, "yaml");
    const manifest = orchestrator.export(report, "analytics-report-v1");
    assert.match(json.content, /"version": "8.0.0"/);
    assert.match(yaml.content, /version: ["']?8\.0\.0["']?/);
    assert.equal(JSON.parse(manifest.content).format, "analytics-report-v1");
  });
});
