/**
 * Canonical AmyNest phonics audio standards — single source of truth for the
 * unified ElevenLabs voice, model, and provenance/versioning metadata.
 *
 * Every phonics asset (library manifest + static catalog) must certify against
 * these constants. Validation FAILS on any provider/voice/model mismatch.
 */
import {
  PHONICS_ELEVENLABS_MODEL_DEFAULT,
  PHONICS_ELEVENLABS_VOICE_ID_DEFAULT,
} from "./phonics-generation.js";

/** The ONLY provider allowed to generate phonics audio in production. */
export const PHONICS_AUDIO_PROVIDER = "elevenlabs" as const;

/** Certified canonical Amy phonics voice (English-Indian female, "Ananya K"). */
export const PHONICS_CANONICAL_VOICE_ID = PHONICS_ELEVENLABS_VOICE_ID_DEFAULT;

/** Canonical production model — keep generator, manifest, runtime, tooling aligned. */
export const PHONICS_CANONICAL_MODEL_ID = PHONICS_ELEVENLABS_MODEL_DEFAULT;

/**
 * Accepted fallback model — used when Flash is not enabled on the ElevenLabs
 * account (set via PHONICS_ELEVENLABS_MODEL env). Mirrors `AMY_TTS_MODEL_FALLBACK`
 * in lib/static-audio/src/amy-tts-config.ts. Provenance certifies against EITHER
 * the canonical model or this documented fallback — never a foreign provider.
 */
export const PHONICS_CANONICAL_MODEL_FALLBACK = "eleven_turbo_v2_5";

/** Models that certify as a single, consistent ElevenLabs Amy voice. */
export const PHONICS_ACCEPTED_MODELS: readonly string[] = [
  PHONICS_CANONICAL_MODEL_ID,
  PHONICS_CANONICAL_MODEL_FALLBACK,
];

/** Bump when curriculum scope/sequence changes (forces asset re-certification). */
export const PHONICS_CURRICULUM_VERSION = 1;

/**
 * Bump when the canonical phoneme registry / spoken-text mappings change.
 * v2 (2026-07): full letter+digraph regeneration after the phoneme audit found
 * letter-name drift (b→"bee", d→"dee", j→"jay", p→"pee") and wrong sounds for
 * h/i/o/q/x in the v1 clips.
 */
export const PHONICS_PHONEME_VERSION = 2;

/** Bump when the audio normalization profile (loudness/bitrate/trim) changes. */
export const PHONICS_NORMALIZATION_VERSION = 1;

/** Per-manifest provenance block written by the generator and asserted in CI. */
export type AudioProvenance = {
  provider: typeof PHONICS_AUDIO_PROVIDER;
  voiceId: string;
  model: string;
  generatedAt: string;
  curriculumVersion: number;
  phonemeVersion: number;
  normalizationVersion: number;
};

export function buildPhonicsProvenance(
  overrides?: Partial<AudioProvenance>,
): AudioProvenance {
  return {
    provider: PHONICS_AUDIO_PROVIDER,
    voiceId: PHONICS_CANONICAL_VOICE_ID,
    model: PHONICS_CANONICAL_MODEL_ID,
    generatedAt: new Date().toISOString(),
    curriculumVersion: PHONICS_CURRICULUM_VERSION,
    phonemeVersion: PHONICS_PHONEME_VERSION,
    normalizationVersion: PHONICS_NORMALIZATION_VERSION,
    ...overrides,
  };
}

export type ProvenanceIssue = {
  field: keyof AudioProvenance;
  expected: string | number;
  actual: unknown;
};

/**
 * Certification gate. Returns the list of mismatches; empty array == PASS.
 * A non-empty result MUST fail certification (provider/voice/model mismatch).
 */
export function validatePhonicsProvenance(
  provenance: Partial<AudioProvenance> | undefined,
): ProvenanceIssue[] {
  const issues: ProvenanceIssue[] = [];
  const p = provenance ?? {};
  if (p.provider !== PHONICS_AUDIO_PROVIDER) {
    issues.push({ field: "provider", expected: PHONICS_AUDIO_PROVIDER, actual: p.provider });
  }
  if (p.voiceId !== PHONICS_CANONICAL_VOICE_ID) {
    issues.push({ field: "voiceId", expected: PHONICS_CANONICAL_VOICE_ID, actual: p.voiceId });
  }
  if (typeof p.model !== "string" || !PHONICS_ACCEPTED_MODELS.includes(p.model)) {
    issues.push({
      field: "model",
      expected: PHONICS_ACCEPTED_MODELS.join(" | "),
      actual: p.model,
    });
  }
  if (typeof p.generatedAt !== "string" || !p.generatedAt) {
    issues.push({ field: "generatedAt", expected: "ISO timestamp", actual: p.generatedAt });
  }
  if (p.curriculumVersion !== PHONICS_CURRICULUM_VERSION) {
    issues.push({ field: "curriculumVersion", expected: PHONICS_CURRICULUM_VERSION, actual: p.curriculumVersion });
  }
  if (p.phonemeVersion !== PHONICS_PHONEME_VERSION) {
    issues.push({ field: "phonemeVersion", expected: PHONICS_PHONEME_VERSION, actual: p.phonemeVersion });
  }
  if (p.normalizationVersion !== PHONICS_NORMALIZATION_VERSION) {
    issues.push({ field: "normalizationVersion", expected: PHONICS_NORMALIZATION_VERSION, actual: p.normalizationVersion });
  }
  return issues;
}
