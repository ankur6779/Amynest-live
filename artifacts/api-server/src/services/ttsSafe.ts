import { generateOpenAiTts, type TtsGenerateInput } from "./ttsGenerate.js";
import {
  AMY_MODEL_ID_DEFAULT,
  AMY_VOICE_ID_DEFAULT,
  type SynthesizeOptions,
  type SynthesizeResult,
} from "./ttsCacheService.js";

/** Run OpenAI TTS generation without throwing — for background warm-up jobs. */
export async function synthesizeSafe(
  text: string,
  options: SynthesizeOptions = {},
): Promise<SynthesizeResult | null> {
  try {
    const result = await generateOpenAiTts({
      text,
      voice: options.voiceId ?? AMY_VOICE_ID_DEFAULT,
      mode: options.mode ?? "default",
      category: options.mode === "phonics" ? "phonics" : "words",
    });
    if (!result) return null;
    return {
      cacheKey: result.cacheKey,
      audioPath: `/api/tts/audio/${result.cacheKey}.mp3`,
      audioUrl: result.url,
      contentType: "audio/mpeg",
      charCount: text.length,
      cached: result.cached,
    };
  } catch (err) {
    console.error("TTS background failed", err instanceof Error ? err.message : err);
    return null;
  }
}

export type { TtsGenerateInput };
