import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MockAnalyticsProvider } from "../providers/mock.js";
import { scoreContent, scoreTopic } from "../scoring/index.js";
import {
  buildChannelSummary,
  buildPeriodReport,
  buildVideoSummaries,
} from "./engine.js";

describe("analytics reporting", () => {
  it("builds daily weekly monthly style period reports", async () => {
    const provider = new MockAnalyticsProvider({ seed: "report" });
    const metrics = await provider.video("rep1");
    const topicScores = [
      scoreTopic({
        topicId: "parenting-001",
        topicTitle: "Parenting",
        category: "Parenting",
        metrics: [metrics],
      }),
    ];
    const contentScores = [
      scoreContent({
        videoId: "rep1",
        topicId: "parenting-001",
        metrics,
      }),
    ];
    const summaries = buildVideoSummaries({
      videos: [
        {
          videoId: "rep1",
          title: "Title",
          topicId: "parenting-001",
          metrics,
        },
      ],
      topicScores,
      contentScores,
    });
    const channel = await provider.channel();
    const shorts = await provider.shorts();
    const channelSummary = buildChannelSummary({
      channel,
      shorts,
      videoSummaries: summaries,
    });

    for (const schedule of ["daily", "weekly", "monthly"] as const) {
      const period = buildPeriodReport({
        schedule,
        periodStart: "2026-07-01",
        periodEnd: "2026-07-27",
        videoSummaries: summaries,
        channelSummary,
      });
      assert.equal(period.schedule, schedule);
      assert.ok(period.topVideos.length >= 1);
      assert.ok(period.worstVideos.length >= 1);
      assert.ok(period.growthSummary.length > 0);
    }
  });
});
