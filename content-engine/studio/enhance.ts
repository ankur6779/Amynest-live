/**
 * Thin studio enhancement for existing script generation.
 * Does not change workflow phases or provider architecture.
 */

import { buildMasterKnowledgeBase } from "./knowledge/engine.js";
import { generateEvergreenLibrary, rankEvergreenIdeas } from "./library/evergreen.js";
import { buildCreativeBrief } from "./creative/engine.js";
import {
  evaluateStudioQualityGate,
  scoreStudioCreative,
  STUDIO_QUALITY_THRESHOLD,
} from "./quality/engine.js";
import type {
  StudioAnalyticsInsights,
  StudioCreativeBrief,
  StudioQualityGate,
  StudioTopicIdea,
} from "./types.js";

export interface StudioEnhancement {
  idea: StudioTopicIdea;
  brief: StudioCreativeBrief;
  systemPromptBlock: string;
  qualityGate: StudioQualityGate;
}

let cachedLibrary: StudioTopicIdea[] | null = null;
let cachedLibraryAt = 0;
const LIBRARY_TTL_MS = 15 * 60 * 1000;

function getEvergreenLibraryCached(): StudioTopicIdea[] {
  const now = Date.now();
  if (cachedLibrary && now - cachedLibraryAt < LIBRARY_TTL_MS) {
    return cachedLibrary;
  }
  const knowledge = buildMasterKnowledgeBase({ maxFeatures: 200 });
  cachedLibrary = generateEvergreenLibrary({ knowledge, minIdeas: 1000 });
  cachedLibraryAt = now;
  return cachedLibrary;
}

/** Map a generation topic into the nearest evergreen + studio brief. */
export function enhanceGenerationInput(input: {
  title: string;
  category: string;
  keywords: string[];
  language?: string;
  duration?: number;
  insights?: StudioAnalyticsInsights;
}): StudioEnhancement {
  const library = getEvergreenLibraryCached();
  const idea = pickIdeaForTopic(library, input);

  const brief = buildCreativeBrief({
    idea,
    language: input.language ?? "en",
    insights: input.insights,
  });

  const scores = scoreStudioCreative({
    idea,
    hook: brief.selectedHook,
    cta: brief.selectedCta,
    story: brief.story,
    retention: brief.retention,
    brandOk: true,
  });
  const qualityGate = evaluateStudioQualityGate(scores, STUDIO_QUALITY_THRESHOLD);

  return {
    idea,
    brief,
    systemPromptBlock: brief.systemPromptBlock,
    qualityGate,
  };
}

export function buildStudioRewriteHint(gate: StudioQualityGate): string | undefined {
  if (gate.ok) return undefined;
  return gate.rewriteHint;
}

function pickIdeaForTopic(
  library: StudioTopicIdea[],
  input: {
    title: string;
    category: string;
    keywords: string[];
    duration?: number;
  },
): StudioTopicIdea {
  const hay = [input.title, input.category, ...input.keywords].join(" ").toLowerCase();
  let best = rankEvergreenIdeas(library)[0]!;
  let bestScore = -1;

  for (const idea of library) {
    let score = 0;
    if (idea.category.toLowerCase() === input.category.toLowerCase()) score += 8;
    if (hay.includes(idea.category.toLowerCase())) score += 3;
    for (const kw of idea.keywords) {
      if (hay.includes(kw.toLowerCase())) score += 2;
    }
    if (hay.includes((idea.featureTitle ?? "").toLowerCase().slice(0, 12))) score += 5;
    if (input.duration && idea.recommendedDuration === nearestDuration(input.duration)) {
      score += 2;
    }
    score += idea.estimatedRetention * 0.05;
    if (score > bestScore) {
      bestScore = score;
      best = idea;
    }
  }

  // Keep title grounded to the requested topic while retaining studio metadata.
  return {
    ...best,
    title: input.title,
    keywords: [...new Set([...input.keywords, ...best.keywords])].slice(0, 16),
  };
}

function nearestDuration(seconds: number): 15 | 20 | 30 {
  if (seconds <= 17) return 15;
  if (seconds <= 25) return 20;
  return 30;
}
