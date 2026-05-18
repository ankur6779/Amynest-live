// ─────────────────────────────────────────────────────────────
// AmyNest Voice System — English, Female / Male
// Powered by ElevenLabs Indian voices (no browser TTS)
// ─────────────────────────────────────────────────────────────

import { getAuth } from "firebase/auth";
import { getApiUrl, resolveApiMediaUrl } from "@/lib/api";
import { resolveAiApiData, type AuthFetchFn } from "@/lib/poll-result";

const KEY_ENABLED = "amynest_voice_enabled";
const KEY_GENDER  = "amynest_voice_gender"; // "female" | "male"

export type VoiceLang   = "en";
export type VoiceGender = "female" | "male";

export interface VoiceSettings {
  enabled: boolean;
  lang: VoiceLang;
  gender: VoiceGender;
  voiceName: string | null;
}

// ─── ElevenLabs Indian Voice IDs ──────────────────────────────
// English Indian Female — Ananya K (Clear & Polished)
const VOICE_EN_FEMALE = "QbQKfe9vgx5OsbZUvlFv";
// English Indian Male — Karthik (Indian AI Voice)
const VOICE_EN_MALE   = "oaz5NvoRIhcJystOASAA";

const MODEL_EN = "eleven_turbo_v2_5";

// ─── Settings ────────────────────────────────────────────────

export function getVoiceSettings(): VoiceSettings {
  return {
    enabled:   localStorage.getItem(KEY_ENABLED) === "true",
    lang:      "en",
    gender:    (localStorage.getItem(KEY_GENDER) as VoiceGender) ?? "female",
    voiceName: null,
  };
}

export function saveVoiceSettings(patch: Partial<VoiceSettings>): void {
  if (patch.enabled !== undefined) localStorage.setItem(KEY_ENABLED, patch.enabled ? "true" : "false");
  if (patch.gender  !== undefined) localStorage.setItem(KEY_GENDER, patch.gender);
}

export function isVoiceEnabled(): boolean           { return getVoiceSettings().enabled; }
export function setVoiceEnabled(val: boolean): void { saveVoiceSettings({ enabled: val }); }
export function getSavedVoiceName(): string | null  { return null; }
export function saveVoiceName(_name: string): void  { /* no-op */ }

// ─── Voice resolution ─────────────────────────────────────────

function resolveVoice(_lang: VoiceLang, gender: VoiceGender): { voiceId: string; modelId: string } {
  return { voiceId: gender === "male" ? VOICE_EN_MALE : VOICE_EN_FEMALE, modelId: MODEL_EN };
}

// ─── Legacy browser-voice stubs (removed, kept for import compat) ─────────
export interface LabeledVoice {
  voice: { name: string; lang: string; localService: boolean };
  label: string;
}
export async function getVoicesForLang(_lang: VoiceLang): Promise<LabeledVoice[]> { return []; }
export async function getEnglishVoices(): Promise<unknown[]>                       { return []; }
export function loadVoices(): Promise<unknown[]>                                   { return Promise.resolve([]); }

// ─── Audio singleton ─────────────────────────────────────────

let _audio: HTMLAudioElement | null = null;
let _objUrl: string | null = null;

function stopCurrentAudio() {
  if (_audio) {
    _audio.pause();
    _audio.removeAttribute("src");
    _audio.load();
    _audio = null;
  }
  if (_objUrl) {
    URL.revokeObjectURL(_objUrl);
    _objUrl = null;
  }
}

// ─── Core speak via ElevenLabs ────────────────────────────────

export async function speak(text: string): Promise<void> {
  const settings = getVoiceSettings();
  if (!settings.enabled) return;
  const trimmed = text.trim();
  if (!trimmed) return;

  stopCurrentAudio();

  try {
    const token = await getAuth().currentUser?.getIdToken().catch(() => undefined);
    const { voiceId, modelId } = resolveVoice(settings.lang, settings.gender);

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    console.info("[ElevenLabs] Request start (voice.speak)");
    const authFetch: AuthFetchFn = async (input, init) => {
      const url = typeof input === "string" ? getApiUrl(input) : input;
      return fetch(url, {
        ...init,
        headers: { ...headers, ...(init?.headers as Record<string, string> | undefined) },
      });
    };
    const synthRes = await fetch(getApiUrl("/api/tts/synthesize"), {
      method: "POST",
      headers,
      body: JSON.stringify({ text: trimmed, voiceId, modelId }),
    });
    if (!synthRes.ok) {
      const errBody = await synthRes.json().catch(() => ({}));
      console.error("[ElevenLabs] Synthesize failed", synthRes.status, errBody);
      return;
    }
    const raw = (await synthRes.json()) as { audioUrl?: string; jobId?: string };
    const data = await resolveAiApiData<{ audioUrl: string }>(raw, authFetch);
    if (!data?.audioUrl) {
      console.error("[ElevenLabs] Synthesize missing audioUrl");
      return;
    }
    console.info("[ElevenLabs] Synthesize OK", data.audioUrl);

    const audioHeaders: Record<string, string> = {};
    if (token) audioHeaders["Authorization"] = `Bearer ${token}`;

    const playbackUrl = resolveApiMediaUrl(data.audioUrl);
    const audioRes = await fetch(playbackUrl, { headers: audioHeaders });
    if (!audioRes.ok) {
      console.error("[ElevenLabs] Audio fetch failed", audioRes.status, playbackUrl);
      return;
    }

    const blob = await audioRes.blob();
    if (blob.size === 0) {
      console.error("[ElevenLabs] Empty audio blob");
      return;
    }
    const url  = URL.createObjectURL(blob);
    _objUrl = url;

    const audio = new Audio(url);
    _audio = audio;
    audio.onended = stopCurrentAudio;
    audio.onerror = () => {
      console.error("[ElevenLabs] HTMLAudioElement error", audio.error?.code);
      stopCurrentAudio();
    };
    try {
      await audio.play();
      console.info("[ElevenLabs] Playback started");
    } catch (playErr) {
      console.error("[ElevenLabs] audio.play() failed", playErr);
      stopCurrentAudio();
    }
  } catch (err) {
    console.error("[ElevenLabs] Error:", err instanceof Error ? err.message : err);
    stopCurrentAudio();
  }
}

// ─── Task announcements ───────────────────────────────────────

const ENGLISH_MSGS = [
  (n: string, t: string) => `Hey ${n}! Time for ${t}. You've got this!`,
  (n: string, t: string) => `${n}, it's ${t} time! Let's go!`,
  (n: string, t: string) => `Hi ${n}! Your next activity is ${t}. Ready?`,
];

export async function announceCurrentTask(childName: string, activity: string): Promise<void> {
  const settings = getVoiceSettings();
  if (!settings.enabled) return;
  const msgs = ENGLISH_MSGS;
  const msg   = msgs[Math.floor(Math.random() * msgs.length)](childName, activity);
  await speak(msg);
}
