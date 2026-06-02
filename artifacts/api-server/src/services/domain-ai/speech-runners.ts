import { speechToText, ensureCompatibleFormat } from "@workspace/integrations-openai-ai-server";
import {
  transcribeWithElevenLabsScribe,
  isElevenLabsScribeEnabled,
} from "../elevenLabsScribe.js";
import { logger } from "../../lib/logger";

export async function runSpeechTranscribe(input: {
  audioBase64: string;
  mimeType: string;
  /** Live coach opts into ElevenLabs Scribe v1; all other callers use Whisper. */
  provider?: "whisper" | "elevenlabs";
}): Promise<{ text: string }> {
  const buffer = Buffer.from(input.audioBase64, "base64");
  const compatible = await ensureCompatibleFormat(buffer);

  if (input.provider === "elevenlabs" && isElevenLabsScribeEnabled()) {
    try {
      const text = await transcribeWithElevenLabsScribe(compatible.buffer, compatible.format);
      if (text) return { text };
      logger.warn({ evt: "scribe.empty_fallback_whisper" }, "[Scribe] empty transcript — falling back to Whisper");
    } catch (err) {
      logger.warn(
        { evt: "scribe.failed_fallback_whisper", message: err instanceof Error ? err.message : String(err) },
        "[Scribe] failed — falling back to Whisper",
      );
    }
  }

  const text = await speechToText(compatible.buffer, compatible.format);
  return { text };
}
