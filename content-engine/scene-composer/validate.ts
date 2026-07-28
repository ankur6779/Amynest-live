/**
 * Per-scene quality validation — regenerate only failed scenes.
 */

import { evaluateProviderConsistency } from "../brand/consistency.js";
import type {
  ComposerScene,
  ComposerScenePrompt,
  SceneValidationResult,
  VideoProviderCapabilities,
} from "./types.js";

export function validateComposerScene(input: {
  sceneId: string;
  prompt: ComposerScenePrompt;
  provider: VideoProviderCapabilities;
  /** Optional notes from provider / QA reviewer */
  notes?: string;
  /** Optional measured clip duration */
  measuredDurationSeconds?: number;
  /** Optional resolution string e.g. 1080x1920 */
  resolution?: string;
  attempt?: number;
}): SceneValidationResult {
  const { sceneId, prompt, provider } = input;

  if (
    input.measuredDurationSeconds != null &&
    Math.abs(input.measuredDurationSeconds - prompt.durationSeconds) > 1.25
  ) {
    return fail(
      sceneId,
      "incorrect-duration",
      `Duration ${input.measuredDurationSeconds}s ≠ planned ${prompt.durationSeconds}s`,
      true,
      "Regenerate with exact duration lock.",
    );
  }

  if (input.resolution && !/1080\s*[x×]\s*1920|1920/i.test(input.resolution)) {
    // Allow 720x1280 as temporary but flag for regen when targeting platform-ready
    if (!/720\s*[x×]\s*1280/i.test(input.resolution)) {
      return fail(
        sceneId,
        "low-resolution",
        `Resolution ${input.resolution} is not vertical HD`,
        true,
        "Regenerate at 1080x1920 (9:16).",
      );
    }
  }

  const consistency = evaluateProviderConsistency({
    notes: input.notes,
    expectedCharacters: prompt.characters,
    attempt: input.attempt,
  });
  if (!consistency.ok) {
    const code =
      consistency.failureClass === "wrong-colors"
        ? "wrong-colors"
        : consistency.failureClass === "identity-drift" ||
            consistency.failureClass === "wrong-child" ||
            consistency.failureClass === "wrong-mascot"
          ? "wrong-character"
          : consistency.failureClass === "generic-ai-look"
            ? "low-quality"
            : "brand-violation";
    return fail(
      sceneId,
      code,
      consistency.reason,
      consistency.shouldRetry,
      consistency.retryPrompt ?? prompt.continuity.sharedIdentityLock,
    );
  }

  if (input.notes && /nsfw|violence|hate|self-harm/i.test(input.notes)) {
    return fail(sceneId, "safety", "Safety issue detected", true, "Regenerate safely.");
  }

  if (input.notes && /jitter|stutter|broken motion|bad animation/i.test(input.notes)) {
    return fail(
      sceneId,
      "bad-animation",
      "Animation quality failure",
      true,
      "Regenerate with smoother motion and locked identity.",
    );
  }

  if (prompt.durationSeconds > provider.maxClipSeconds + 0.05) {
    return fail(
      sceneId,
      "incorrect-duration",
      `Scene ${prompt.durationSeconds}s exceeds provider max ${provider.maxClipSeconds}s`,
      true,
      "Re-plan scene under provider max clip duration.",
    );
  }

  return {
    sceneId,
    ok: true,
    code: "ok",
    message: "Scene passed validation",
    shouldRegenerate: false,
  };
}

export function validateAllScenes(scenes: ComposerScene[]): {
  ok: boolean;
  failedSceneIds: string[];
  messages: string[];
} {
  const failed = scenes.filter((s) => !s.validation.ok);
  return {
    ok: failed.length === 0,
    failedSceneIds: failed.map((s) => s.sceneId),
    messages: failed.map((s) => `${s.sceneId}: ${s.validation.message}`),
  };
}

function fail(
  sceneId: string,
  code: SceneValidationResult["code"],
  message: string,
  shouldRegenerate: boolean,
  retryPromptHint?: string,
): SceneValidationResult {
  return { sceneId, ok: false, code, message, shouldRegenerate, retryPromptHint };
}
