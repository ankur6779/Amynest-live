import { TUTOR_SAFETY, type VoiceSettings } from "./types.js";

export type TtsProvider = {
  synthesize(
    text: string,
    settings: VoiceSettings,
  ): Promise<{ audioUrl: string; durationEstimateSec: number }>;
};

export type SttProvider = {
  transcribe(audioBase64OrUrl: string): Promise<string>;
};

const DEFAULT_VOICE: VoiceSettings = {
  speed: 0.92,
  childFriendly: true,
  slowMode: false,
  repeatMode: false,
};

/** ~2.5 words/sec for child-friendly pacing */
export function estimateSpeechSeconds(text: string, settings: VoiceSettings): number {
  const words = text.split(/\s+/).filter(Boolean).length;
  const wps = settings.slowMode ? 1.8 : 2.4 / settings.speed;
  return Math.min(TUTOR_SAFETY.maxAudioSeconds, Math.max(1, words / wps));
}

export function truncateForSafety(text: string): string {
  const words = text.trim().split(/\s+/);
  if (words.length <= TUTOR_SAFETY.maxWordsPerTurn) return text.trim();
  return words.slice(0, TUTOR_SAFETY.maxWordsPerTurn).join(" ") + ".";
}

/** Local/mock TTS — swap for cloud TTS in api-server via provider injection. */
export class MockTtsProvider implements TtsProvider {
  async synthesize(
    text: string,
    settings: VoiceSettings,
  ): Promise<{ audioUrl: string; durationEstimateSec: number }> {
    const safe = truncateForSafety(text);
    const duration = estimateSpeechSeconds(safe, settings);
    const params = new URLSearchParams({
      text: safe.slice(0, 120),
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

export class MockSttProvider implements SttProvider {
  async transcribe(_audio: string): Promise<string> {
    return "";
  }
}

let ttsProvider: TtsProvider = new MockTtsProvider();
let sttProvider: SttProvider = new MockSttProvider();

export function setTtsProvider(provider: TtsProvider): void {
  ttsProvider = provider;
}

export function setSttProvider(provider: SttProvider): void {
  sttProvider = provider;
}

export function resetVoiceProviders(): void {
  ttsProvider = new MockTtsProvider();
  sttProvider = new MockSttProvider();
}

export async function textToSpeech(
  text: string,
  overrides?: Partial<VoiceSettings>,
): Promise<{ audioUrl: string; durationEstimateSec: number }> {
  const settings: VoiceSettings = { ...DEFAULT_VOICE, ...overrides };
  if (settings.repeatMode) settings.speed *= 0.85;
  return ttsProvider.synthesize(truncateForSafety(text), settings);
}

export async function speechToText(audio: string): Promise<string> {
  return sttProvider.transcribe(audio);
}

export function resolveVoiceSettings(options?: {
  slowMode?: boolean;
  repeatMode?: boolean;
  personalityDistractibility?: number;
}): VoiceSettings {
  const settings = { ...DEFAULT_VOICE };
  if (options?.slowMode) settings.slowMode = true;
  if (options?.repeatMode) settings.repeatMode = true;
  if (options?.personalityDistractibility && options.personalityDistractibility > 0.65) {
    settings.speed = 0.85;
  }
  return settings;
}
