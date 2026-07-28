import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { findRepoRootQuiet } from "../brand/repo-root.js";
import { buildCreativeBrief } from "./creative/engine.js";
import { enhanceGenerationInput } from "./enhance.js";
import { generateHooks, pickBestHook } from "./hooks/engine.js";
import { buildStudioAnalyticsInsights } from "./knowledge/analytics-feedback.js";
import { buildMasterKnowledgeBase } from "./knowledge/engine.js";
import { ALL_CATEGORIES, generateEvergreenLibrary } from "./library/evergreen.js";
import { MOTION_PRESETS, selectMotionPresets } from "./motion/engine.js";
import { FORBIDDEN_PSYCHOLOGY, buildPsychologyTriggers } from "./psychology/engine.js";
import {
  STUDIO_QUALITY_THRESHOLD,
  evaluateStudioQualityGate,
  scoreStudioCreative,
} from "./quality/engine.js";
import { gateGeneratedPayload } from "./quality/from-payload.js";
import { RETENTION_TARGET, planRetention } from "./retention/engine.js";
import { buildStoryBeats } from "./stories/engine.js";
import { STUDIO_TEMPLATES, selectStudioTemplate } from "./templates/engine.js";
import { generateCtas, pickBestCta } from "./cta/engine.js";
import type { StudioTopicIdea } from "./types.js";
import type { AnalyticsReport } from "../types/analytics.js";

// Re-export probe helper via local constant check
const CATEGORY_COUNT = ALL_CATEGORIES.length;

describe("AmyNest AI Content Studio", () => {
  it("builds knowledge from repository scan (not a static feature list)", () => {
    const knowledge = buildMasterKnowledgeBase({
      repoRoot: findRepoRootQuiet(),
      maxFeatures: 80,
    });
    assert.ok(knowledge.featureCount > 0);
    assert.equal(knowledge.topicSeeds.length, knowledge.featureCount);
    assert.ok(knowledge.topicSeeds.every((s) => s.sourcePath.length > 0));
  });

  it("generates 1000+ evergreen ideas covering all categories", () => {
    const knowledge = buildMasterKnowledgeBase({ maxFeatures: 80 });
    const ideas = generateEvergreenLibrary({ knowledge, minIdeas: 1000 });
    assert.ok(ideas.length >= 1000, `expected >=1000, got ${ideas.length}`);
    for (const category of ALL_CATEGORIES) {
      assert.ok(
        ideas.some((i) => i.category === category),
        `missing category ${category}`,
      );
    }
    assert.equal(CATEGORY_COUNT, 27);
    const sample = ideas[0]!;
    assert.ok(sample.estimatedCtr > 0);
    assert.ok(sample.estimatedRetention > 0);
    assert.ok(sample.recommendedDuration);
    assert.ok(sample.emotion);
    assert.ok(sample.targetAge);
    assert.ok(sample.difficulty);
  });

  it("ranks 10 hooks and picks highest retention", () => {
    const idea = sampleIdea();
    const hooks = generateHooks(idea);
    assert.equal(hooks.length, 10);
    const best = pickBestHook(hooks);
    assert.equal(best.text, hooks[0]!.text);
    for (let i = 1; i < hooks.length; i++) {
      assert.ok(hooks[i - 1]!.retentionPredict >= hooks[i]!.retentionPredict);
    }
  });

  it("builds mandatory story beat order", () => {
    const idea = sampleIdea();
    const hook = pickBestHook(generateHooks(idea));
    const cta = pickBestCta(generateCtas(idea));
    const story = buildStoryBeats({ idea, hook, cta });
    assert.ok(story.hook);
    assert.ok(story.problem);
    assert.ok(story.whyItHappens);
    assert.ok(/amynest/i.test(story.amynestSolution));
    assert.ok(story.featureDemo);
    assert.ok(story.parentBenefit);
    assert.ok(story.childBenefit);
    assert.ok(story.cta);
  });

  it("psychology forbids fear-based manipulation", () => {
    const triggers = buildPsychologyTriggers(sampleIdea());
    assert.ok(FORBIDDEN_PSYCHOLOGY.includes("fear"));
    assert.ok(triggers.forbidden.includes("fear"));
    assert.ok(/never use fear/i.test(triggers.guidance));
  });

  it("retention targets 90%+", () => {
    assert.equal(RETENTION_TARGET, 90);
    const idea = sampleIdea();
    const hook = pickBestHook(generateHooks(idea));
    const cta = pickBestCta(generateCtas(idea));
    const story = buildStoryBeats({ idea, hook, cta });
    const plan = planRetention({
      idea,
      story,
      hookRetentionPredict: hook.retentionPredict,
    });
    assert.equal(plan.targetRetention, 90);
    assert.ok(plan.pacingNotes.length > 0);
  });

  it("generates and ranks 10 CTAs", () => {
    const ctas = generateCtas(sampleIdea());
    assert.equal(ctas.length, 10);
    assert.ok(ctas.some((c) => /Download AmyNest AI/i.test(c.text)));
    const best = pickBestCta(ctas);
    assert.equal(best.text, ctas[0]!.text);
  });

  it("exposes motion presets including end card and purple glow", () => {
    const ids = new Set(MOTION_PRESETS.map((p) => p.id));
    for (const id of [
      "camera-zoom",
      "camera-push",
      "camera-orbit",
      "parallax",
      "reveal",
      "logo-animation",
      "purple-glow",
      "end-card",
    ]) {
      assert.ok(ids.has(id), `missing motion ${id}`);
    }
    const selected = selectMotionPresets(sampleIdea());
    assert.ok(selected.some((p) => p.id === "end-card"));
  });

  it("provides master studio templates wrapping video templates", () => {
    assert.ok(STUDIO_TEMPLATES.length >= 10);
    const template = selectStudioTemplate(sampleIdea("Astro"));
    assert.equal(template.videoTemplateId, "astro-daily");
    assert.equal(template.characterPreference, "amy-ai");
  });

  it("quality gate requires overall ≥ 90", () => {
    assert.equal(STUDIO_QUALITY_THRESHOLD, 90);
    const idea = sampleIdea();
    const brief = buildCreativeBrief({ idea });
    const scores = scoreStudioCreative({
      idea,
      hook: brief.selectedHook,
      cta: brief.selectedCta,
      story: brief.story,
      retention: brief.retention,
      brandOk: true,
    });
    const gate = evaluateStudioQualityGate(scores);
    assert.equal(gate.threshold, 90);
    assert.ok(typeof gate.ok === "boolean");
    assert.ok(scores.overall >= 0 && scores.overall <= 100);
  });

  it("enhanceGenerationInput produces a studio brief block", () => {
    const enhanced = enhanceGenerationInput({
      title: "Speech practice that feels like play",
      category: "Speech",
      keywords: ["speech", "phonics", "play"],
      language: "en",
      duration: 20,
    });
    assert.ok(enhanced.systemPromptBlock.includes("CONTENT STUDIO BRIEF"));
    assert.ok(enhanced.brief.hooks.length === 10);
    assert.ok(enhanced.brief.ctas.length === 10);
    assert.ok(/official characters/i.test(enhanced.systemPromptBlock));
  });

  it("gates weak generated payloads below 90", () => {
    const gate = gateGeneratedPayload({
      topicTitle: "Test",
      category: "Learning",
      payload: {
        hook: "Hi",
        openingQuestion: "Ok?",
        story: "Something happened.",
        keyPoints: ["a"],
        cta: "Click",
        voiceScript: "Hello there.",
        sceneScript: "scene one",
        titles: {
          primary: "Test",
          alternates: [],
          short: "Test",
          highCtr: "Test",
          searchOptimized: "Test",
        },
        description: {
          seo: "x",
          appPromotion: "y",
          playStoreCta: "z",
          website: "https://www.amynest.in",
          socialLinks: "",
          disclaimer: "",
        },
        hashtags: [],
        keywords: [],
      },
    });
    assert.equal(gate.ok, false);
    assert.ok(gate.scores.overall < 90);
    assert.ok(gate.rewriteHint);
  });

  it("builds analytics insights from existing analytics report shape", () => {
    const insights = buildStudioAnalyticsInsights({
      analytics: minimalAnalytics(),
      learningWindowDays: 30,
    });
    assert.ok(Array.isArray(insights.winningHooks));
    assert.ok(Array.isArray(insights.winningCtas));
    assert.ok(insights.winningDurations.length > 0);
  });
});

function sampleIdea(category: StudioTopicIdea["category"] = "Learning"): StudioTopicIdea {
  return {
    id: "test-idea",
    title: "Most parents don't know this learning habit",
    category,
    featureId: "learning-zone",
    featureTitle: "Learning Zone",
    difficulty: "beginner",
    audience: "parents",
    targetAge: "3-5",
    estimatedCtr: 7.2,
    estimatedRetention: 88,
    emotion: "curiosity",
    recommendedDuration: 20,
    keywords: ["learning", "amynest", "play"],
    angle: "Most parents don't know",
  };
}

function minimalAnalytics(): AnalyticsReport {
  const now = new Date().toISOString();
  return {
    id: "analytics-test",
    version: "1",
    createdAt: now,
    schedule: "daily",
    channelSummary: {
      subscribers: 0,
      views: 0,
      watchTimeHours: 0,
      averageViewDurationSeconds: 0,
      engagementRate: 0,
    },
    videoSummaries: [],
    topicScores: [],
    contentScores: [],
    recommendations: [],
    trends: {
      categoryTrends: [],
      topicTrends: [],
      seasonalSpikes: [],
      publishingTimeEffectiveness: [],
      decliningTopics: [],
    },
    learningUpdates: {
      topicPerformance: [],
      categoryTrends: [],
      publishingTimes: [],
      videoStyles: [{ style: "short", averageScore: 80, sampleSize: 3 }],
      audiencePreferences: [],
      updatedAt: now,
    },
    periodReport: {
      start: now,
      end: now,
      totalViews: 0,
      totalEngagements: 0,
      averageRetention: 0,
    },
    optimizationSignals: [],
    telemetry: {
      collectLatencyMs: 0,
      scoreLatencyMs: 0,
      errors: [],
      missingMetrics: 0,
      provider: "mock",
      videosAnalyzed: 0,
    },
  } as AnalyticsReport;
}
