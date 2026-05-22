// ElevenLabs-powered TTS for Smart Study Zone and Event Prep pages.
// Replaces the old browser speechSynthesis with Indian ElevenLabs voices.

import { getAuth } from "firebase/auth";
import { getApiUrl, resolveApiMediaUrl } from "@/lib/api";
import { audioManager } from "@/lib/audio-manager";
import {
  mustUseStaticOnly,
  prepareStaticPlaybackAudio,
  safePlayAudio,
} from "@/lib/static-audio";
import { resolveAiApiData, type AuthFetchFn } from "@/lib/poll-result";
import { synthesizeTtsWithBackgroundPoll } from "@/lib/tts-playback";

// ─── ElevenLabs Indian Voice IDs ──────────────────────────────
// English Indian Female — Ananya K
const VOICE_EN_FEMALE = "QbQKfe9vgx5OsbZUvlFv";
// English Indian Male — Karthik
const VOICE_EN_MALE   = "oaz5NvoRIhcJystOASAA";

const MODEL_EN = "eleven_turbo_v2_5";

export function stopSpeaking() {
  audioManager.stop();
}

export function ttsAvailable(): boolean {
  return true;
}

// ─── Speak via ElevenLabs ─────────────────────────────────────

export async function speak(
  text: string,
  opts?: { lang?: string; gender?: "female" | "male" },
): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed) return;

  stopSpeaking();

  const staticAudio = await prepareStaticPlaybackAudio(trimmed);
  if (staticAudio) {
    staticAudio.onended = stopSpeaking;
    staticAudio.onerror = stopSpeaking;
    const played = await safePlayAudio(staticAudio, {
      proxyUrl: staticAudio.src,
      phrase: trimmed,
    });
    if (!played) console.error("[StudyTTS] Static playback failed", trimmed);
    return;
  }

  if (mustUseStaticOnly(trimmed)) return;

  const isMale  = opts?.gender === "male";
  const voiceId = isMale ? VOICE_EN_MALE : VOICE_EN_FEMALE;
  const modelId = MODEL_EN;

  try {
    const token = await getAuth().currentUser?.getIdToken().catch(() => undefined);
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const authFetch: AuthFetchFn = async (input, init) => {
      const url = typeof input === "string" ? getApiUrl(input) : input;
      return fetch(url, {
        ...init,
        headers: { ...headers, ...(init?.headers as Record<string, string> | undefined) },
      });
    };
    const synth = await synthesizeTtsWithBackgroundPoll(authFetch, {
      text: trimmed,
      voiceId,
      modelId,
    });
    if (!synth?.success || !synth.audioUrl?.trim()) {
      console.warn("[ElevenLabs] Synthesize failed", synth?.error ?? "unknown");
      return;
    }
    const audioUrl = synth.audioUrl.trim();
    if (!audioUrl || audioUrl.includes("undefined")) {
      console.warn("Invalid audio URL, skipping playback");
      return;
    }
    const audioHeaders: Record<string, string> = {};
    if (token) audioHeaders["Authorization"] = `Bearer ${token}`;

    const playbackUrl = resolveApiMediaUrl(audioUrl);
    const audioRes = await fetch(playbackUrl, { headers: audioHeaders });
    if (!audioRes.ok) {
      console.error("[ElevenLabs] Audio fetch failed", audioRes.status);
      return;
    }

    const blob = await audioRes.blob();
    if (blob.size === 0) {
      console.error("[ElevenLabs] Empty audio blob");
      return;
    }
    const url = URL.createObjectURL(blob);
    audioManager.trackObjectUrl(url);

    const audio = audioManager.create(url);
    audio.onended = stopSpeaking;
    audio.onerror = () => {
      console.error("[ElevenLabs] HTMLAudioElement error", audio.error?.code);
      stopSpeaking();
    };
    const played = await audioManager.play(
      audio,
      { proxyUrl: url, phrase: trimmed, source: "study-tts", channel: "speech", interrupt: true, srcType: "blob" },
      { channel: "speech", interrupt: true },
    );
    if (!played) console.error("[StudyTTS] Playback failed after retries", trimmed);
  } catch (err) {
    console.error("[ElevenLabs] Error:", err instanceof Error ? err.message : err);
    stopSpeaking();
  }
}
