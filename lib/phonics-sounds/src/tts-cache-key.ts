import { createHash } from "node:crypto";

export type TtsSynthesizeMode = "default" | "phonics";

/** Canonical string hashed into a TTS cache key (must match api-server ttsCacheService). */
export function buildTtsCacheKeyPayload(
  text: string,
  voiceId: string,
  modelId: string,
  mode: TtsSynthesizeMode,
): string {
  if (mode === "default") {
    return `${modelId}|${voiceId}|${text}`;
  }
  return `\x00mode=${mode}\x00${modelId}\x00${voiceId}\x00${text}`;
}

/** Content-addressed TTS cache key — includes voice, model, mode, and normalized text. */
export function computeTtsCacheKey(
  text: string,
  voiceId: string,
  modelId: string,
  mode: TtsSynthesizeMode,
): string {
  return createHash("sha256")
    .update(buildTtsCacheKeyPayload(text, voiceId, modelId, mode))
    .digest("hex");
}
