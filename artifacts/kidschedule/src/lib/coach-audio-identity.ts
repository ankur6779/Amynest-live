/**
 * Amy Coach audio identity — verbatim win listen text, plan-scoped cache keys.
 * Safety contract: UI text === Cache === Playback.
 */

import { hashCacheKeySync } from "@/lib/amy-voice-pipeline-server-sync";
import type { Win } from "@/pages/ai-coach";

export const COACH_MODULE_ID = "amy-coach" as const;

export type CoachAudioIdentity = {
  moduleId: string;
  planCacheKey: string;
  winIndex: number;
  text: string;
  hash: string;
};

const IS_DEV = import.meta.env.DEV;

function canonicalPayload(
  identity: Pick<CoachAudioIdentity, "moduleId" | "planCacheKey" | "winIndex" | "text">,
): string {
  return JSON.stringify({
    moduleId: identity.moduleId,
    planCacheKey: identity.planCacheKey,
    winIndex: identity.winIndex,
    text: identity.text,
  });
}

export function computeCoachAudioIdentityHash(
  identity: Pick<CoachAudioIdentity, "moduleId" | "planCacheKey" | "winIndex" | "text">,
): string {
  return hashCacheKeySync(canonicalPayload(identity));
}

/** Verbatim listen-aloud script — must match server buildCoachWinListenText. */
export function buildCoachWinListenText(win: Win): string {
  return [
    `${win.win}. ${win.title}.`,
    win.objective,
    win.deep_explanation,
    win.actions?.length ? `${win.actions.join(". ")}` : "",
    win.example ? `${win.example}` : "",
    win.mistake_to_avoid ? `${win.mistake_to_avoid}.` : "",
    win.micro_task ? `${win.micro_task}.` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

export function createCoachAudioIdentity(input: {
  planCacheKey: string;
  win: Win;
  moduleId?: string;
}): CoachAudioIdentity {
  const moduleId = (input.moduleId ?? COACH_MODULE_ID).trim();
  const planCacheKey = (input.planCacheKey ?? "").trim();
  const text = buildCoachWinListenText(input.win);
  const winIndex = input.win.win;
  if (!planCacheKey) throw new Error("CoachAudioIdentity requires planCacheKey");
  if (!Number.isFinite(winIndex) || winIndex < 1) {
    throw new Error("CoachAudioIdentity requires positive winIndex");
  }
  if (!text.trim()) throw new Error("CoachAudioIdentity requires non-empty text");
  const hash = computeCoachAudioIdentityHash({ moduleId, planCacheKey, winIndex, text });
  return { moduleId, planCacheKey, winIndex, text, hash };
}

export function coachPipelineCacheKey(identity: CoachAudioIdentity): string {
  return `coach:${identity.planCacheKey}:${identity.winIndex}:${identity.hash}`;
}

export function coachLocalCacheKey(identity: CoachAudioIdentity): string {
  return `coach-audio:${coachPipelineCacheKey(identity)}`;
}

export function assertVerbatimCoachText(inputText: string, uiText: string): void {
  const input = inputText ?? "";
  const raw = uiText ?? "";
  if (input === raw) return;
  const msg = "Non-verbatim text used for Coach audio identity";
  if (IS_DEV) {
    console.warn(`[CoachAudioIdentity] ${msg}`, {
      inputPreview: input.slice(0, 120),
      rawPreview: raw.slice(0, 120),
    });
    throw new Error(msg);
  }
  console.warn(`[CoachAudioIdentity] ${msg}`);
}

export function isCoachAudioIdentity(identity: unknown): identity is CoachAudioIdentity {
  return (
    typeof identity === "object" &&
    identity != null &&
    "moduleId" in identity &&
    "planCacheKey" in identity &&
    "winIndex" in identity &&
    "hash" in identity &&
    !("lessonId" in identity) &&
    !("sectionId" in identity)
  );
}

export function logCoachAudioIdentity(
  identity: CoachAudioIdentity,
  extra?: Record<string, unknown>,
): void {
  const line = {
    evt: "tts.playback",
    event: "coach_audio_identity",
    planCacheKey: identity.planCacheKey.slice(0, 8),
    winIndex: identity.winIndex,
    hash: identity.hash,
    textLength: identity.text.length,
    ...extra,
  };
  if (IS_DEV) console.info("[TTS]", line);
}

/** Mirror server norm() — infant goal slug for cache key. */
function normInfantGoalId(goalId: string): string {
  return String(goalId ?? "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 60);
}

/**
 * Stable SHA-1 plan key for static infant problems (0–2 yr).
 * Matches server buildInfantCoachPlanCacheKey in coachPlanCacheKey.ts.
 */
export async function buildInfantCoachPlanCacheKey(goalId: string): Promise<string> {
  const slug = normInfantGoalId(goalId);
  if (!slug) throw new Error("buildInfantCoachPlanCacheKey requires goalId");
  const raw = `infant_coach_v1_${slug}`;
  if (typeof crypto === "undefined" || !crypto.subtle?.digest) {
    throw new Error("Web Crypto unavailable for infant coach plan cache key");
  }
  const buf = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(raw));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
