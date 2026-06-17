export type StaticAudioMode = "default" | "phonics";

/**
 * Provenance for the static-audio catalog (Phase B). Optional + additive so
 * existing map readers keep working; written at generation time and asserted
 * by the phonics certification gate. The `phonics` bucket must certify as the
 * single ElevenLabs voice.
 */
export type StaticAudioProvenance = {
  provider: "elevenlabs" | "openai";
  voiceId: string;
  model: string;
  generatedAt: string;
  curriculumVersion?: number;
  phonemeVersion?: number;
  normalizationVersion?: number;
};

export type StaticAudioMap = {
  default: Record<string, string>;
  phonics: Record<string, string>;
  /** Per-bucket provenance; keyed by mode. Optional for backward compatibility. */
  meta?: Partial<Record<StaticAudioMode, StaticAudioProvenance>>;
};

export type StaticTtsEntry = {
  text: string;
  mode: StaticAudioMode;
};
