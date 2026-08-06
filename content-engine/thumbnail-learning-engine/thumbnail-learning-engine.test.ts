import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { MockAnalyticsProvider } from "../analytics/providers/mock.js";
import type { VideoPerformanceMetrics } from "../types/analytics.js";
import {
  buildLearningRecord,
  buildLearningRecommendations,
  detectThumbnailPatterns,
  isTrustedSample,
  loadThumbnailLearningRecommendations,
  refreshAbHistory,
  runThumbnailLearningEngine,
  CTR_TARGET,
  CTR_LONG_TERM_TARGET,
} from "./index.js";

function metrics(
  videoId: string,
  overrides: Partial<VideoPerformanceMetrics> = {},
): VideoPerformanceMetrics {
  return {
    videoId,
    collectedAt: "2026-07-15T12:00:00.000Z",
    views: 5_000,
    watchTimeMinutes: 800,
    averageViewDurationSeconds: 22,
    averagePercentageViewed: 0.55,
    retention: 0.48,
    ctr: 0.12,
    subscribersGained: 12,
    likes: 120,
    comments: 8,
    shares: 4,
    trafficSources: {
      shorts_feed: 4000,
      browse: 500,
      search: 200,
      suggested: 200,
      external: 50,
      playlist: 30,
      other: 20,
    },
    returningViewers: 1000,
    newViewers: 4000,
    geography: { IN: 4000 },
    deviceType: {
      mobile: 4000,
      tablet: 400,
      tv: 200,
      desktop: 300,
      unknown: 100,
    },
    missingMetrics: [],
    ...overrides,
  };
}

describe("Thumbnail Learning Engine", () => {
  it("builds a record from real analytics metrics fields", () => {
    const record = buildLearningRecord({
      videoId: "v1",
      title: "Speak Better Today",
      metrics: metrics("v1", { ctr: 0.14, views: 2000, retention: 0.5 }),
      publishedAt: "2026-07-10T08:30:00.000Z",
    });
    assert.equal(record.videoId, "v1");
    assert.equal(record.outcomes.ctr, 0.14);
    assert.ok(record.outcomes.impressions >= 2000);
    assert.equal(record.features.day, "2026-07-10");
    assert.equal(record.features.headlineLength > 0, true);
    assert.equal(isTrustedSample(record, 100), true);
  });

  it("detects patterns only from trusted CTR samples", () => {
    const records = [
      buildLearningRecord({
        videoId: "a1",
        metrics: metrics("a1", { ctr: 0.16, views: 3000 }),
        title: "Calm Routines",
      }),
      buildLearningRecord({
        videoId: "a2",
        metrics: metrics("a2", { ctr: 0.15, views: 2800 }),
        title: "Calm Routines",
      }),
      buildLearningRecord({
        videoId: "b1",
        metrics: metrics("b1", { ctr: 0.04, views: 50 }),
        title: "Low Sample",
      }),
    ];
    // Force feature differentiation for pattern buckets
    records[0]!.features.emotion = "warm-encourage";
    records[1]!.features.emotion = "warm-encourage";
    records[2]!.features.emotion = "urgency";
    records[0]!.features.characters = "amy-girl";
    records[1]!.features.characters = "amy-girl";
    records[2]!.features.characters = "group";
    records[0]!.features.colorPalette = "amynest-purple-gold";
    records[1]!.features.colorPalette = "amynest-purple-gold";
    records[2]!.features.colorPalette = "other";

    const patterns = detectThumbnailPatterns(records, 100, 2);
    assert.ok(patterns.emotions.length >= 1);
    assert.equal(patterns.emotions[0]!.value, "warm-encourage");
    assert.ok(patterns.emotions[0]!.averageCtr > 0.1);

    const recs = buildLearningRecommendations(records, patterns);
    assert.equal(recs.targetCtr, CTR_TARGET);
    assert.equal(recs.longTermTargetCtr, CTR_LONG_TERM_TARGET);
    assert.ok(recs.highestCtrEmotions.includes("warm-encourage"));
  });

  it("keeps top/worst A/B history", () => {
    const records = Array.from({ length: 5 }, (_, i) =>
      buildLearningRecord({
        videoId: `hist_${i}`,
        metrics: metrics(`hist_${i}`, { ctr: 0.05 + i * 0.02, views: 1000 }),
      }),
    );
    const history = refreshAbHistory(records);
    assert.equal(history.top100[0]!.outcomes.ctr, 0.13);
    assert.equal(history.worst100[0]!.outcomes.ctr, 0.05);
  });

  it("runs end-to-end with MockAnalyticsProvider and writes reports", async () => {
    const dir = mkdtempSync(join(tmpdir(), "tle-"));
    const storePath = join(dir, "store.json");
    const provider = new MockAnalyticsProvider({ seed: "tle-test" });
    const videoIds = ["tle_a", "tle_b", "tle_c", "tle_d"];

    const pack = await runThumbnailLearningEngine({
      provider,
      videoIds,
      outputDir: dir,
      storePath,
      minImpressions: 1,
      minPatternSample: 1,
    });

    assert.equal(pack.ingested, 4);
    assert.ok(pack.sampleSize >= 1);
    assert.ok(existsSync(pack.reportPaths.learning));
    assert.ok(existsSync(pack.reportPaths.top));
    assert.ok(existsSync(pack.reportPaths.low));
    assert.ok(existsSync(pack.reportPaths.monthly));
    assert.ok(existsSync(pack.reportPaths.dashboardHtml));
    assert.ok(existsSync(pack.reportPaths.recommendationsJson));

    const learningMd = readFileSync(pack.reportPaths.learning, "utf8");
    assert.match(learningMd, /Thumbnail Learning Report/);
    assert.match(learningMd, /Pattern detection/);

    const loaded = loadThumbnailLearningRecommendations(storePath);
    assert.ok(loaded);
    assert.equal(loaded!.version, pack.version);
    assert.equal(typeof pack.dashboard.averageCtr, "number");
    assert.ok(Array.isArray(pack.dashboard.ctrTrend));
  });

  it("respects kill-switch without writing learning artifacts", async () => {
    const dir = mkdtempSync(join(tmpdir(), "tle-off-"));
    const prev = process.env.AMYNEST_THUMBNAIL_LEARNING;
    process.env.AMYNEST_THUMBNAIL_LEARNING = "0";
    try {
      const pack = await runThumbnailLearningEngine({
        metrics: [metrics("off1")],
        outputDir: dir,
        storePath: join(dir, "store.json"),
      });
      assert.equal(pack.ingested, 0);
      assert.match(pack.summary, /disabled/i);
    } finally {
      if (prev === undefined) delete process.env.AMYNEST_THUMBNAIL_LEARNING;
      else process.env.AMYNEST_THUMBNAIL_LEARNING = prev;
    }
  });
});
