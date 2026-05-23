/**
 * Parent Hub audio identity — single source of truth for hub read-aloud.
 * Safety contract: UI text === Cache === Playback (verbatim raw text only).
 */

import { hashCacheKeySync } from "@/lib/amy-voice-pipeline-server-sync";

export const PARENT_HUB_MODULE_ID = "parent-hub" as const;

export const PARENT_HUB_SECTIONS = {
  ARTICLES: "hub_articles",
  FACTS: "hub_facts",
  DAILY_STORIES: "hub_daily_stories",
  AGE_STORIES: "hub_age_stories",
  TODDLER_STORIES: "hub_toddler_stories",
  PUZZLE: "hub_puzzle",
  KIDS_ACTIVITY: "hub_kids_activity",
} as const;

export type ParentHubAudioIdentity = {
  moduleId: string;
  sectionId: string;
  itemId?: string;
  text: string;
  hash: string;
};

const IS_DEV = import.meta.env.DEV;

function canonicalPayload(
  identity: Pick<ParentHubAudioIdentity, "moduleId" | "sectionId" | "itemId" | "text">,
): string {
  return JSON.stringify({
    moduleId: identity.moduleId,
    sectionId: identity.sectionId,
    itemId: identity.itemId ?? "",
    text: identity.text,
  });
}

/** Deterministic hash over { moduleId, sectionId, itemId, text } — no truncation. */
export function computeParentHubAudioIdentityHash(
  identity: Pick<ParentHubAudioIdentity, "moduleId" | "sectionId" | "itemId" | "text">,
): string {
  return hashCacheKeySync(canonicalPayload(identity));
}

export function createParentHubAudioIdentity(input: {
  moduleId?: string;
  sectionId: string;
  itemId?: string;
  text: string;
}): ParentHubAudioIdentity {
  const moduleId = (input.moduleId ?? PARENT_HUB_MODULE_ID).trim();
  const sectionId = (input.sectionId ?? "").trim();
  const text = input.text ?? "";
  if (!moduleId) {
    throw new Error("ParentHubAudioIdentity requires moduleId");
  }
  if (!sectionId) {
    throw new Error("ParentHubAudioIdentity requires sectionId");
  }
  if (!text.trim()) {
    throw new Error("ParentHubAudioIdentity requires non-empty text");
  }
  const hash = computeParentHubAudioIdentityHash({
    moduleId,
    sectionId,
    itemId: input.itemId,
    text,
  });
  return {
    moduleId,
    sectionId,
    itemId: input.itemId,
    text,
    hash,
  };
}

/** Pipeline / warm-cache key — MUST NOT use substrings or normalized text. */
export function parentHubPipelineCacheKey(identity: ParentHubAudioIdentity): string {
  const itemPart = identity.itemId ?? "";
  return `parent:${identity.moduleId}:${identity.sectionId}:${itemPart}:${identity.hash}`;
}

/** IndexedDB warm-cache key scoped to parent hub identity. */
export function parentHubLocalCacheKey(identity: ParentHubAudioIdentity): string {
  return `parent-hub-audio:${parentHubPipelineCacheKey(identity)}`;
}

export function assertVerbatimParentHubText(
  inputText: string,
  uiText: string,
): void {
  const input = inputText ?? "";
  const raw = uiText ?? "";
  if (input === raw) return;

  const msg = "Non-verbatim text used for Parent Hub audio identity";
  if (IS_DEV) {
    console.warn(`[ParentHubAudioIdentity] ${msg}`, {
      inputPreview: input.slice(0, 120),
      rawPreview: raw.slice(0, 120),
    });
    throw new Error(msg);
  }
  console.warn(`[ParentHubAudioIdentity] ${msg}`);
}

export function assertPlaybackMatchesUi(
  uiIdentity: ParentHubAudioIdentity,
  playbackIdentity: ParentHubAudioIdentity,
): void {
  if (uiIdentity.text !== playbackIdentity.text) {
    const err = new Error("Parent Hub audio/UI text mismatch detected");
    if (IS_DEV) throw err;
    console.error("[ParentHubAudioIdentity]", err.message, { uiIdentity, playbackIdentity });
    return;
  }
  if (uiIdentity.moduleId !== playbackIdentity.moduleId) {
    const err = new Error("Parent Hub audio/UI moduleId mismatch detected");
    if (IS_DEV) throw err;
    console.error("[ParentHubAudioIdentity]", err.message, { uiIdentity, playbackIdentity });
    return;
  }
  if (uiIdentity.sectionId !== playbackIdentity.sectionId) {
    const err = new Error("Parent Hub audio/UI sectionId mismatch detected");
    if (IS_DEV) throw err;
    console.error("[ParentHubAudioIdentity]", err.message, { uiIdentity, playbackIdentity });
    return;
  }
  if ((uiIdentity.itemId ?? "") !== (playbackIdentity.itemId ?? "")) {
    const err = new Error("Parent Hub audio/UI itemId mismatch detected");
    if (IS_DEV) throw err;
    console.error("[ParentHubAudioIdentity]", err.message, { uiIdentity, playbackIdentity });
  }
}

export function assertParentHubSpeakConsistency(
  uiIdentity: ParentHubAudioIdentity,
  speakText: string,
  speakOpts?: { parentHub?: boolean; audioIdentity?: ParentHubAudioIdentity },
): void {
  assertVerbatimParentHubText(speakText, uiIdentity.text);
  if (speakOpts?.audioIdentity) {
    assertPlaybackMatchesUi(uiIdentity, speakOpts.audioIdentity);
  }
}

export function assertPrefetchCacheKey(
  prefetchKey: string,
  playbackKey: string,
): void {
  if (prefetchKey === playbackKey) return;
  const err = new Error("Parent Hub prefetch key mismatch");
  if (IS_DEV) throw err;
  console.error("[ParentHubAudioIdentity]", err.message, { prefetchKey, playbackKey });
}

export function resolveParentHubPlaybackCacheKey(
  identity: ParentHubAudioIdentity,
): string {
  return parentHubPipelineCacheKey(identity);
}

export function logParentHubAudioIdentity(
  identity: ParentHubAudioIdentity,
  extra?: Record<string, unknown>,
): void {
  const line = {
    evt: "tts.playback",
    event: "parent_hub_audio_identity",
    moduleId: identity.moduleId,
    sectionId: identity.sectionId,
    itemId: identity.itemId,
    hash: identity.hash,
    textLength: identity.text.length,
    ...extra,
  };
  if (IS_DEV) console.info("[TTS]", line);
}

export function isParentHubAudioIdentity(
  identity: unknown,
): identity is ParentHubAudioIdentity {
  return (
    typeof identity === "object" &&
    identity != null &&
    "moduleId" in identity &&
    "sectionId" in identity &&
    "hash" in identity &&
    !("lessonId" in identity)
  );
}
