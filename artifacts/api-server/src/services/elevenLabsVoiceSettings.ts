import type { SynthesizeMode } from "./ttsCacheService.js";

/** Per-mode ElevenLabs voice settings — shared by batch and streaming synthesis. */
export const VOICE_SETTINGS: Record<
  SynthesizeMode,
  {
    stability: number;
    similarity_boost: number;
    style: number;
    use_speaker_boost: boolean;
  }
> = {
  default: { stability: 0.5, similarity_boost: 0.75, style: 0.0, use_speaker_boost: true },
  phonics: { stability: 0.85, similarity_boost: 0.85, style: 0.0, use_speaker_boost: true },
};
