/**
 * SceneComposer — main entry.
 * Converts an approved ContentPackage into a provider-aware multi-scene production plan.
 *
 * Pipeline order (additive):
 *   approved ContentPackage → plan intents → AI Director → Performance Director
 *   → Character Performance Studio → Character Memory Engine → Story Memory Engine
 *   → scene prompts → validate
 */

import { createHash } from "node:crypto";
import {
  directProductionScenes,
  enrichPromptsWithDirector,
  isAiDirectorEnabled,
} from "../ai-director/director.js";
import {
  enrichPromptsWithCharacterMemory,
  isCharacterMemoryEnabled,
  runCharacterMemoryEngine,
} from "../character-memory-engine/engine.js";
import {
  enrichPromptsWithCharacterStudio,
  isCharacterStudioEnabled,
  runCharacterPerformanceStudio,
} from "../character-performance-studio/studio.js";
import {
  directPerformances,
  enrichPromptsWithPerformanceDirector,
  isPerformanceDirectorEnabled,
} from "../performance-director/director.js";
import {
  enrichPromptsWithStoryMemory,
  isStoryMemoryEnabled,
  runStoryMemoryEngine,
} from "../story-memory-engine/engine.js";
import type { ContentPackage } from "../types/content-package.js";
import type { SupportedDuration } from "../types/storyboard.js";
import { resolveSupportedDuration } from "../timeline/engine.js";
import { buildComposerAudioPlan } from "./audio-pipeline.js";
import { buildComposerEndCard } from "./end-card.js";
import { extractScriptBeats, planComposerIntents } from "./planner.js";
import { buildScenePrompts } from "./prompts.js";
import { detectActiveVideoProvider } from "./providers.js";
import { buildComposerTimeline } from "./timeline-composer.js";
import {
  SCENE_COMPOSER_VERSION,
  type SceneComposerPackage,
  type VideoProviderCapabilities,
} from "./types.js";
import { validateAllScenes, validateComposerScene } from "./validate.js";

export interface ComposeProductionInput {
  contentPackage: ContentPackage;
  duration?: SupportedDuration;
  provider?: VideoProviderCapabilities | string;
  /** Optional QA notes keyed by scene role for validation tests */
  sceneNotes?: Record<string, string>;
}

/**
 * Plan the full multi-scene Short. Does not call video providers itself —
 * produces prompts + timeline for asset/render stages.
 */
export function composeProductionScenes(
  input: ComposeProductionInput,
): SceneComposerPackage {
  const pkg = input.contentPackage;
  const totalDuration =
    input.duration ?? resolveSupportedDuration(pkg.estimatedDuration);
  const provider =
    typeof input.provider === "string" || input.provider === undefined
      ? detectActiveVideoProvider({
          providerId: typeof input.provider === "string" ? input.provider : undefined,
        })
      : input.provider;

  const beats = extractScriptBeats(pkg);
  let intents = planComposerIntents({
    beats,
    totalDuration,
    provider,
    category: pkg.topic.category,
    title: pkg.title,
    keywords: pkg.topic.keywords,
  });

  // AI Director: after approved script intents, before scene prompt/generation.
  const directed = isAiDirectorEnabled()
    ? directProductionScenes({ contentPackage: pkg, intents })
    : null;
  if (directed) {
    intents = directed.intents;
  }

  // Performance Director v2: additive acting layer after AI Director 1.2.0.
  const performed = isPerformanceDirectorEnabled()
    ? directPerformances({
        contentPackage: pkg,
        intents,
        director: directed?.director ?? null,
      })
    : null;
  if (performed) {
    intents = performed.intents;
  }

  let prompts = buildScenePrompts(intents, {
    title: pkg.title,
    category: pkg.topic.category,
    keywords: pkg.topic.keywords,
  });
  if (directed) {
    prompts = enrichPromptsWithDirector(prompts, directed.director);
  }
  if (performed) {
    prompts = enrichPromptsWithPerformanceDirector(
      prompts,
      performed.performance,
    );
  }

  // Character Performance Studio: intention / face / eye / body craft (additive).
  const studio = isCharacterStudioEnabled()
    ? runCharacterPerformanceStudio({
        contentPackage: pkg,
        intents,
        performance: performed?.performance ?? null,
      })
    : null;
  if (studio) {
    prompts = enrichPromptsWithCharacterStudio(prompts, studio);
  }

  // Character Memory Engine: inherit previous approved scene state (additive).
  const memory = isCharacterMemoryEnabled()
    ? runCharacterMemoryEngine({
        contentPackage: pkg,
        intents,
        director: directed?.director ?? null,
        performance: performed?.performance ?? null,
      })
    : null;
  if (memory) {
    prompts = enrichPromptsWithCharacterMemory(prompts, memory);
  }

  // Story Memory Engine: final additive narrative/emotional thread.
  const story = isStoryMemoryEnabled()
    ? runStoryMemoryEngine({
        contentPackage: pkg,
        intents,
        characterMemory: memory,
      })
    : null;
  if (story) {
    prompts = enrichPromptsWithStoryMemory(prompts, story);
  }

  const directorRejects = new Map(
    (directed?.director.quality.rejects ?? []).map((r) => [r.sceneId, r]),
  );
  const studioRejects = new Map(
    (studio?.quality.rejects ?? []).map((r) => [r.sceneId, r]),
  );
  const memoryRejects = new Map(
    (memory?.quality.rejects ?? []).map((r) => [r.sceneId, r]),
  );
  const storyRejects = new Map(
    (story?.quality.rejects ?? []).map((r) => [r.sceneId, r]),
  );

  const scenes = intents.map((intent, index) => {
    const prompt = prompts[index]!;
    let validation = validateComposerScene({
      sceneId: prompt.sceneId,
      prompt,
      provider,
      notes: input.sceneNotes?.[intent.role] ?? input.sceneNotes?.[prompt.sceneId],
      measuredDurationSeconds: prompt.durationSeconds,
      resolution: "1080x1920",
    });
    const directorReject = directorRejects.get(prompt.sceneId);
    if (directorReject) {
      validation = {
        sceneId: prompt.sceneId,
        ok: false,
        code: "low-quality",
        message: `AI Director rejected: ${directorReject.code} — ${directorReject.reason}`,
        shouldRegenerate: true,
        retryPromptHint:
          "Re-direct with cinematic shot language, micro-actions, and continuity locks.",
      };
    }
    // Studio rejects are advisory on the package; only fail a scene when the
    // whole studio package is not ok AND this scene is listed (keeps Scene Composer
    // validator behavior intact for unrelated regen tests).
    const studioReject = studioRejects.get(prompt.sceneId);
    if (studio && !studio.quality.ok && studioReject && validation.ok) {
      validation = {
        sceneId: prompt.sceneId,
        ok: false,
        code: "low-quality",
        message: `Character Studio rejected: ${studioReject.code} — ${studioReject.reason}`,
        shouldRegenerate: true,
        retryPromptHint:
          "Re-direct with intention-driven face/eye/body acting, interaction, and non-neutral faces.",
      };
    }
    const memoryReject = memoryRejects.get(prompt.sceneId);
    if (memory && !memory.quality.ok && memoryReject && validation.ok) {
      validation = {
        sceneId: prompt.sceneId,
        ok: false,
        code: "low-quality",
        message: `Character Memory rejected: ${memoryReject.code} — ${memoryReject.reason}`,
        shouldRegenerate: true,
        retryPromptHint:
          "Regenerate inheriting previous last-frame memory — lock identity, props, lighting, camera momentum, and emotion arc.",
      };
    }
    const storyReject = storyRejects.get(prompt.sceneId);
    if (story && !story.quality.ok && storyReject && validation.ok) {
      validation = {
        sceneId: prompt.sceneId,
        ok: false,
        code: "low-quality",
        message: `Story Memory rejected: ${storyReject.code} — ${storyReject.reason}`,
        shouldRegenerate: true,
        retryPromptHint:
          "Regenerate as the next beat of one continuous story — honor what just happened, emotion thread, goals, and visual callbacks.",
      };
    }
    return {
      sceneId: prompt.sceneId,
      intent,
      prompt,
      validation,
      regenerateAttempts: 0,
    };
  });

  const timeline = buildComposerTimeline(intents, totalDuration);
  const audio = buildComposerAudioPlan(intents);
  const endCard = buildComposerEndCard(
    scenes.find((s) => s.intent.role === "end-card")?.intent.durationSeconds ?? 2.5,
  );
  const validation = validateAllScenes(scenes);
  if (directed && !directed.director.quality.ok) {
    validation.messages.push(directed.director.quality.summary);
  }
  if (studio && !studio.quality.ok) {
    validation.messages.push(studio.quality.summary);
  }
  if (memory && !memory.quality.ok) {
    validation.messages.push(memory.quality.summary);
  }
  if (story && !story.quality.ok) {
    validation.messages.push(story.quality.summary);
  }

  return {
    id: buildComposerId(pkg, totalDuration, provider.providerId),
    version: SCENE_COMPOSER_VERSION,
    createdAt: new Date().toISOString(),
    totalDuration,
    targetResolution: "1080x1920",
    aspectRatio: "9:16",
    provider,
    scenes,
    transitions: timeline.transitions,
    audio,
    endCard,
    timeline: {
      clips: timeline.clips,
      totalSeconds: timeline.totalSeconds,
    },
    stitch: {
      seamless: true,
      method: scenes.length > 1 ? "xfade-concat" : "concat",
      outputHint: "platform-ready-vertical-short",
    },
    director: directed?.director,
    performanceDirector: performed?.performance,
    characterStudio: studio ?? undefined,
    characterMemory: memory ?? undefined,
    storyMemory: story ?? undefined,
    validation,
  };
}

/** Return only scenes that failed validation (for selective regeneration). */
export function scenesNeedingRegeneration(
  composed: SceneComposerPackage,
): SceneComposerPackage["scenes"] {
  return composed.scenes.filter(
    (s) => !s.validation.ok && s.validation.shouldRegenerate,
  );
}

function buildComposerId(
  pkg: ContentPackage,
  duration: SupportedDuration,
  providerId: string,
): string {
  const digest = createHash("sha256")
    .update(
      [pkg.topic.id, pkg.title, String(duration), providerId, SCENE_COMPOSER_VERSION].join(
        "|",
      ),
    )
    .digest("hex")
    .slice(0, 12);
  return `sc_${pkg.topic.id}_${duration}_${digest}`;
}
