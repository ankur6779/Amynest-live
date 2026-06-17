/**
 * Phonics audio is ElevenLabs-only (single certified Amy voice).
 *
 * Phonics playback must NEVER be served OpenAI-generated audio — not from a
 * live OpenAI synthesis call, and not from a previously cached OpenAI clip.
 * These predicates are the single source of truth for "is this request a
 * phonics request" so every server TTS path enforces the same policy.
 */

export type PhonicsPolicyInput = {
  mode?: string | null;
  category?: string | null;
};

/** True when a TTS request belongs to the phonics curriculum surface. */
export function isPhonicsTtsRequest(input: PhonicsPolicyInput): boolean {
  return input.mode === "phonics" || input.category === "phonics";
}
