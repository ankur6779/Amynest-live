import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { makeContentPackage } from "../storyboard/test-fixtures.js";
import { getAllTopics, getTopicById } from "../topics/index.js";
import { selectTopicsForJob } from "../workflow/jobs/pipeline.js";
import { InMemoryHistoryStore } from "../services/history-store.js";
import { buildEditorialCalendar90d } from "./calendar/ninety-day.js";
import { clusterTopicToSeries, CONTENT_SERIES } from "./clustering/series.js";
import { isContentIntelligenceEnabled } from "./enable.js";
import { InMemoryContentMemoryStore } from "./memory/store.js";
import { ContentIntelligence } from "./orchestrator.js";
import { buildDerivativePlan } from "./reuse/derivatives.js";
import { evaluateTopic } from "./scoring/topic-gate.js";
import { recommendPublishingStrategy } from "./publishing/strategy.js";

describe("Content Intelligence & Campaign Manager", () => {
  it("is enabled by default and can be disabled", () => {
    assert.equal(isContentIntelligenceEnabled({}), true);
    assert.equal(
      isContentIntelligenceEnabled({ AMYNEST_CONTENT_INTELLIGENCE: "0" }),
      false,
    );
  });

  it("clusters topics into recognizable series", () => {
    assert.ok(CONTENT_SERIES.length >= 10);
    const learning = getAllTopics().find((t) => t.category === "Learning");
    const speech = getAllTopics().find((t) => t.category === "Speech");
    const astro = getAllTopics().find((t) => t.category === "Amy Astro");
    if (learning) {
      assert.ok(
        ["study-zone-mastery", "brain-boost", "audio-adventures"].includes(
          clusterTopicToSeries(learning),
        ),
      );
    }
    if (speech) assert.equal(clusterTopicToSeries(speech), "speech-journey");
    if (astro) assert.equal(clusterTopicToSeries(astro), "astro-stories");
  });

  it("maintains permanent content memory and blocks duplicates", () => {
    const store = new InMemoryContentMemoryStore();
    const pkg = makeContentPackage();
    const remembered = store.rememberFromPackage({ content: pkg });
    assert.ok(remembered.videoId);
    assert.ok(remembered.hook);
    assert.ok(remembered.seriesId);
    assert.equal(store.hasTopic(pkg.topic.id), true);

    const gate = evaluateTopic({
      topic: pkg.topic,
      asOfDate: "2026-07-29",
      memory: store.list(),
    });
    assert.equal(gate.ok, false);
    assert.ok(gate.rejectCodes.includes("duplicate"));
  });

  it("scores topics across campaign dimensions before script generation", () => {
    const topic = getTopicById("parenting-001") ?? getAllTopics()[0]!;
    const gate = evaluateTopic({
      topic,
      asOfDate: "2026-07-29",
      memory: [],
    });
    assert.ok(gate.scores.novelty >= 0);
    assert.ok(gate.scores.educationalValue >= 0);
    assert.ok(gate.scores.parentValue >= 0);
    assert.ok(gate.scores.emotionalImpact >= 0);
    assert.ok(gate.scores.brandValue >= 0);
    assert.ok(gate.scores.retentionPrediction >= 0);
    assert.ok(gate.scores.ctrPrediction >= 0);
    assert.ok(gate.scores.seasonalRelevance >= 0);
    assert.ok(gate.scores.seriesBalance >= 0);
    assert.ok(gate.scores.overall >= 0);
    assert.ok(typeof gate.shouldPublish === "boolean");
  });

  it("builds a rolling 90-day editorial calendar with weekday pillars", () => {
    const calendar = buildEditorialCalendar90d({
      startDate: "2026-08-03", // Monday
      campaignMode: "none",
    });
    assert.equal(calendar.days.length, 90);
    assert.equal(calendar.days[0]!.dayOfWeek, "Monday");
    assert.equal(calendar.days[0]!.preferredPillar, "Learning");
    assert.equal(calendar.days[1]!.preferredPillar, "Health");
    assert.ok(calendar.days.filter((d) => d.topicId).length >= 20);
    assert.ok(Object.keys(calendar.categoryBalance).length >= 1);
  });

  it("supports campaign modes with connected arcs", () => {
    const intel = new ContentIntelligence({
      campaignMode: "7-day-reading-challenge",
    });
    const campaign = intel.campaign();
    assert.equal(campaign.id, "7-day-reading-challenge");
    assert.equal(campaign.connectedArc.length, 7);
    const plan = intel.plan({
      startDate: "2026-08-03",
      campaignMode: "back-to-school-series",
    });
    assert.equal(plan.campaignMode, "back-to-school-series");
    assert.ok(plan.dashboard.campaignProgress.arc.length > 0);
  });

  it("reuses one package into multi-platform derivatives without changing CTA", () => {
    const pkg = makeContentPackage();
    const plan = buildDerivativePlan({ content: pkg });
    const platforms = new Set(plan.derivatives.map((d) => d.platform));
    for (const required of [
      "youtube-short",
      "instagram-reel",
      "facebook-reel",
      "pinterest",
      "blog",
      "email",
      "community",
    ]) {
      assert.ok(platforms.has(required as never), `missing ${required}`);
    }
    assert.ok(plan.derivatives.every((d) => d.cta === pkg.cta));
  });

  it("recommends publishing strategy", () => {
    const topic = getAllTopics()[0]!;
    const strategy = recommendPublishingStrategy({ topic });
    assert.ok(strategy.bestPublishDay);
    assert.match(strategy.bestPublishTime, /^\d{2}:\d{2}$/);
    assert.ok(strategy.recommendedHashtags.length >= 3);
    assert.ok(strategy.suggestedTitle.length > 0);
    assert.ok(strategy.thumbnailConcept.includes("AmyNest"));
    assert.ok(strategy.primaryAudience.length > 0);
  });

  it("builds an intelligence dashboard with gaps and opportunities", () => {
    const intel = new ContentIntelligence();
    const plan = intel.plan({ startDate: "2026-08-03" });
    assert.ok(plan.dashboard.upcomingVideos.length >= 1);
    assert.ok(plan.dashboard.contentGaps.length >= 1);
    assert.ok(plan.dashboard.topOpportunities.length >= 1);
    assert.equal(plan.version, "1.0.0");
  });

  it("gates topic selection before script generation without new workflow phase", () => {
    const history = new InMemoryHistoryStore();
    const selected = selectTopicsForJob({
      jobType: "GenerateOneVideo",
      count: 1,
      history,
      date: "2026-08-03",
    });
    assert.equal(selected.length, 1);
    assert.ok(selected[0]!.id);
  });
});
