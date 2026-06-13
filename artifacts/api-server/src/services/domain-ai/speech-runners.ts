import { speechToText, ensureCompatibleFormat } from "@workspace/integrations-openai-ai-server";
import {
  transcribeWithElevenLabsScribe,
  isElevenLabsScribeEnabled,
} from "../elevenLabsScribe.js";
import { logger } from "../../lib/logger";

function resolveCompatibleAudio(
  buffer: Buffer,
  mimeType: string,
): Promise<{ buffer: Buffer; format: "wav" | "mp3" }> {
  if (mimeType === "audio/wav" || mimeType === "audio/x-wav") {
    return Promise.resolve({ buffer, format: "wav" });
  }
  if (mimeType === "audio/mpeg" || mimeType === "audio/mp3") {
    return Promise.resolve({ buffer, format: "mp3" });
  }
  return ensureCompatibleFormat(buffer);
}

export async function runSpeechTranscribe(input: {
  audioBase64: string;
  mimeType: string;
  /** Live coach opts into ElevenLabs Scribe v1; all other callers use Whisper. */
  provider?: "whisper" | "elevenlabs";
}): Promise<{ text: string }> {
  const buffer = Buffer.from(input.audioBase64, "base64");
  const compatible = await resolveCompatibleAudio(buffer, input.mimeType);

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
