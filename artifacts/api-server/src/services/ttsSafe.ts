import { synthesize, type SynthesizeOptions, type SynthesizeResult } from "./elevenLabsService.js";

/** Run TTS generation without throwing — for background warm-up jobs. */
export async function synthesizeSafe(
  text: string,
  options: SynthesizeOptions = {},
): Promise<SynthesizeResult | null> {
  try {
    return await synthesize(text, options);
  } catch (err) {
    console.error("TTS background failed", err instanceof Error ? err.message : err);
    return null;
  }
}
