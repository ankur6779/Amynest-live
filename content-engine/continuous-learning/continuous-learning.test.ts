import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  makeContentPackage,
  makePublishedVideo,
} from "../analytics/test-fixtures.js";
import { makeAnalyticsReport } from "../brain/test-fixtures.js";
import {
  ContinuousLearningEngine,
  extractVideoDna,
  isContinuousLearningEnabled,
  normalizeYoutubeMetrics,
  synthesizeMetricsFromViews,
} from "./index.js";

describe("Continuous Learning Engine", () => {
  it("is enabled by default", () => {
    assert.equal(isContinuousLearningEnabled(), true);
  });

  it("extracts permanent Video DNA from published + content package", () => {
    const video = makePublishedVideo({ videoId: "dna_vid_1" });
    const content = makeContentPackage({
      hook: "Feel calmer tonight — one gentle habit?",
      cta: "Try AmyNest AI tonight",
      estimatedDuration: 22,
    });
    const dna = extractVideoDna({
      video,
      content,
      goldenScriptId: "gs_parent_calm_01",
      campaign: "soft-launch",
    });
    assert.equal(dna.videoId, "dna_vid_1");
    assert.equal(dna.goldenScriptId, "gs_parent_calm_01");
    assert.ok(dna.hook.length > 0);
    assert.ok(dna.characters.includes("Amy AI") || dna.characters.length > 0);
    assert.equal(dna.durationSeconds, 22);
    assert.equal(dna.campaign, "soft-launch");
    assert.ok(dna.platform === "youtube" || dna.platform === "future");
  });

  it("normalizes YouTube metrics into PlatformPerformance", () => {
    const perf = synthesizeMetricsFromViews({
      videoId: "m1",
      views: 12_000,
      retention: 0.62,
      ctr: 0.06,
    });
    assert.equal(perf.videoId, "m1");
    assert.ok(perf.performanceScore > 0);
    assert.ok(perf.retentionCurve.length >= 5);
    assert.ok(perf.impressions > perf.views);
  });

  it("ingests published videos and builds knowledge + prompt hints", () => {
    const engine = new ContinuousLearningEngine();
    const contentA = makeContentPackage({
      hook: "Feel overwhelmed at bedtime? One calm breath helps.",
      cta: "Build the habit with AmyNest AI",
      estimatedDuration: 22,
    });
    const contentB = makeContentPackage({
      hook: "Learn how to teach focus tips today",
      cta: "Download AmyNest now",
      estimatedDuration: 30,
    });
    const videos = [
      makePublishedVideo({
        videoId: "learn_a",
        publishedAt: "2026-07-20T12:00:00.000Z",
      }),
      makePublishedVideo({
        videoId: "learn_b",
        publishedAt: "2026-07-21T18:00:00.000Z",
        metadata: {
          ...makePublishedVideo().metadata,
          title: "Learn focus tips | AmyNest AI",
        },
      }),
      makePublishedVideo({
        videoId: "learn_c",
        publishedAt: "2026-07-22T03:00:00.000Z",
      }),
    ];

    const result = engine.ingest({
      videos,
      contentByVideoId: {
        learn_a: contentA,
        learn_b: contentB,
        learn_c: contentA,
      },
      goldenScriptIdByVideoId: {
        learn_a: "gs_a",
        learn_b: "gs_b",
        learn_c: "gs_c",
      },
      campaignByVideoId: {
        learn_a: "emotional-series",
        learn_b: "edu-series",
        learn_c: "emotional-series",
      },
      metrics: [
        normalizeYoutubeMetrics({
          videoId: "learn_a",
          collectedAt: "2026-07-27T00:00:00.000Z",
          views: 25_000,
          watchTimeMinutes: 800,
          averageViewDurationSeconds: 16,
          averagePercentageViewed: 0.72,
          retention: 0.72,
          ctr: 0.08,
          subscribersGained: 40,
          likes: 900,
          comments: 60,
          shares: 120,
          trafficSources: {
            shorts_feed: 0.7,
            browse: 0.1,
            search: 0.05,
            suggested: 0.05,
            external: 0.05,
            playlist: 0.03,
            other: 0.02,
          },
          returningViewers: 4000,
          newViewers: 21_000,
          geography: { IN: 1 },
          deviceType: {
            mobile: 0.9,
            tablet: 0.05,
            tv: 0,
            desktop: 0.05,
            unknown: 0,
          },
          missingMetrics: [],
        }),
        normalizeYoutubeMetrics({
          videoId: "learn_b",
          collectedAt: "2026-07-27T00:00:00.000Z",
          views: 2_000,
          watchTimeMinutes: 40,
          averageViewDurationSeconds: 8,
          averagePercentageViewed: 0.35,
          retention: 0.35,
          ctr: 0.02,
          subscribersGained: 1,
          likes: 20,
          comments: 1,
          shares: 2,
          trafficSources: {
            shorts_feed: 0.5,
            browse: 0.1,
            search: 0.1,
            suggested: 0.1,
            external: 0.1,
            playlist: 0.05,
            other: 0.05,
          },
          returningViewers: 200,
          newViewers: 1_800,
          geography: { IN: 1 },
          deviceType: {
            mobile: 0.9,
            tablet: 0.05,
            tv: 0,
            desktop: 0.05,
            unknown: 0,
          },
          missingMetrics: [],
        }),
        normalizeYoutubeMetrics({
          videoId: "learn_c",
          collectedAt: "2026-07-27T00:00:00.000Z",
          views: 18_000,
          watchTimeMinutes: 500,
          averageViewDurationSeconds: 14,
          averagePercentageViewed: 0.65,
          retention: 0.65,
          ctr: 0.07,
          subscribersGained: 25,
          likes: 600,
          comments: 40,
          shares: 80,
          trafficSources: {
            shorts_feed: 0.65,
            browse: 0.1,
            search: 0.05,
            suggested: 0.1,
            external: 0.05,
            playlist: 0.03,
            other: 0.02,
          },
          returningViewers: 3000,
          newViewers: 15_000,
          geography: { IN: 1 },
          deviceType: {
            mobile: 0.9,
            tablet: 0.05,
            tv: 0,
            desktop: 0.05,
            unknown: 0,
          },
          missingMetrics: [],
        }),
      ],
      month: "2026-07",
    });

    assert.equal(result.version, "1.0.0");
    assert.equal(result.dnaProfiles.length, 3);
    assert.equal(result.performances.length, 3);
    assert.ok(result.knowledge.length > 0);
    assert.ok(result.promptHints.systemPromptAddendum.includes("CONTINUOUS LEARNING"));
    assert.ok(result.experiments.length >= 4);
    assert.ok(result.failures.some((f) => f.videoId === "learn_b"));
    assert.ok(result.monthlyReport);
    assert.equal(result.monthlyReport?.month, "2026-07");
    assert.ok(result.monthlyReport?.top10[0]?.videoId === "learn_a");
    assert.ok(result.monthlyReport?.markdown.includes("Continuous Learning"));

    // Knowledge persists across ingest
    const again = engine.ingest({
      videos: [videos[0]!],
      contentByVideoId: { learn_a: contentA },
      metrics: [
        synthesizeMetricsFromViews({
          videoId: "learn_a",
          views: 30_000,
          retention: 0.75,
          ctr: 0.09,
        }),
      ],
    });
    assert.ok(again.knowledge.length >= result.knowledge.length);
    assert.ok(engine.getPromptHints()?.preferHookStyles.length);
  });

  it("accepts AnalyticsReport without mutating production modules", async () => {
    const analytics = await makeAnalyticsReport();
    const engine = new ContinuousLearningEngine();
    const videos = analytics.videoSummaries.map((v) =>
      makePublishedVideo({
        videoId: v.videoId,
        metadata: {
          ...makePublishedVideo().metadata,
          title: v.title,
        },
      }),
    );
    const result = engine.ingest({
      videos,
      analytics,
      month: "2026-07",
    });
    assert.ok(result.dnaProfiles.length >= 2);
    assert.ok(result.performances.length >= 2);
    assert.ok(result.experiments.length >= 1);
  });

  it("no-ops when AMYNEST_CONTINUOUS_LEARNING=0", () => {
    const prev = process.env.AMYNEST_CONTINUOUS_LEARNING;
    process.env.AMYNEST_CONTINUOUS_LEARNING = "0";
    try {
      const engine = new ContinuousLearningEngine();
      const result = engine.ingest({
        videos: [makePublishedVideo()],
      });
      assert.equal(result.dnaProfiles.length, 0);
      assert.equal(result.knowledge.length, 0);
    } finally {
      if (prev === undefined) delete process.env.AMYNEST_CONTINUOUS_LEARNING;
      else process.env.AMYNEST_CONTINUOUS_LEARNING = prev;
    }
  });
});
