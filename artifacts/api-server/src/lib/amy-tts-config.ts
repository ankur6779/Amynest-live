import { AMY_TTS_VOICE_ID, resolveAmyTtsModelId } from "@workspace/static-audio";
import { readEnv } from "./env.js";

export {
  AMY_TTS_MODEL_ID,
  AMY_TTS_MODEL_FALLBACK,
  AMY_TTS_VOICE_ID,
  AMY_TTS_OUTPUT_FORMAT,
  AMY_TTS_STREAM_LATENCY,
  resolveAmyTtsModelId,
} from "@workspace/static-audio";

/** Production model ID — respects AMY_TTS_MODEL_ID or ELEVENLABS_MODEL_ID env override. */
export function getAmyTtsModelId(): string {
  return resolveAmyTtsModelId(readEnv("AMY_TTS_MODEL_ID") ?? readEnv("ELEVENLABS_MODEL_ID"));
}

export function getAmyTtsVoiceId(): string {
  const v = readEnv("AMY_TTS_VOICE_ID") ?? readEnv("ELEVENLABS_VOICE_ID");
  return v?.trim() || AMY_TTS_VOICE_ID;
}
