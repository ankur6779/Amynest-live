/**
 * SceneComposer — main entry.
 * Converts an approved ContentPackage into a provider-aware multi-scene production plan.
 *
 * Pipeline order (additive):
 *   approved ContentPackage → plan intents → AI Director → scene prompts → validate
 */

import { createHash } from "node:crypto";
import {
  directProductionScenes,
  enrichPromptsWithDirector,
  isAiDirectorEnabled,
} from "../ai-director/director.js";
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

  let prompts = buildScenePrompts(intents, {
    title: pkg.title,
    category: pkg.topic.category,
    keywords: pkg.topic.keywords,
  });
  if (directed) {
    prompts = enrichPromptsWithDirector(prompts, directed.director);
  }

  const directorRejects = new Map(
    (directed?.director.quality.rejects ?? []).map((r) => [r.sceneId, r]),
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
