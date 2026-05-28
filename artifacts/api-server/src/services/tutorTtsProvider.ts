import { type TtsProvider, type VoiceSettings, estimateSpeechSeconds } from "@workspace/content-orchestration";
import { generateOpenAiTts } from "./ttsGenerate.js";

export class OpenAiTtsProvider implements TtsProvider {
  async synthesize(
    text: string,
    settings: VoiceSettings,
  ): Promise<{ audioUrl: string; durationEstimateSec: number }> {
    const duration = estimateSpeechSeconds(text, settings);

    try {
      // Call generateOpenAiTts to generate and cache the real OpenAI TTS audio
      const result = await generateOpenAiTts({
        text,
        speed: settings.speed,
        mode: settings.slowMode ? "phonics" : "default",
        category: "sentences",
      });

      if (result && result.url) {
        return {
          audioUrl: result.url,
          durationEstimateSec: duration,
        };
      }
    } catch {
      /* ignore and fallback */
    }

    // Fallback to standard mock URL if tts generation fails
    const params = new URLSearchParams({
      text: text.slice(0, 120),
      speed: String(settings.speed),
      slow: settings.slowMode ? "1" : "0",
      friendly: settings.childFriendly ? "1" : "0",
    });
    return {
      audioUrl: `/api/content/tutor/voice/mock?${params.toString()}`,
      durationEstimateSec: duration,
    };
  }
}
