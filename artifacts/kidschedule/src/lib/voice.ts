// ─────────────────────────────────────────────────────────────
// AmyNest Voice System — Hindi + English, Female / Male
// Powered by ElevenLabs Indian voices (no browser TTS)
// ─────────────────────────────────────────────────────────────

import { getAuth } from "firebase/auth";

const KEY_ENABLED = "amynest_voice_enabled";
const KEY_LANG    = "amynest_voice_lang";   // "en" | "hi"
const KEY_GENDER  = "amynest_voice_gender"; // "female" | "male"

export type VoiceLang   = "en" | "hi";
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
// Hindi Female — Anjura (Calm & Warm)
const VOICE_HI_FEMALE = "TllHtNijgXBd45uTSCS7";
// Hindi Male — Rahul S (Professional Hindi Conversational)
const VOICE_HI_MALE   = "2cdvnKJ5TZi631y5PN1s";

const MODEL_EN = "eleven_turbo_v2_5";
const MODEL_HI = "eleven_multilingual_v2";

// ─── Settings ────────────────────────────────────────────────

export function getVoiceSettings(): VoiceSettings {
  return {
    enabled:   localStorage.getItem(KEY_ENABLED) === "true",
    lang:      (localStorage.getItem(KEY_LANG) as VoiceLang)     ?? "hi",
    gender:    (localStorage.getItem(KEY_GENDER) as VoiceGender) ?? "female",
    voiceName: null,
  };
}

export function saveVoiceSettings(patch: Partial<VoiceSettings>): void {
  if (patch.enabled !== undefined) localStorage.setItem(KEY_ENABLED, patch.enabled ? "true" : "false");
  if (patch.lang    !== undefined) localStorage.setItem(KEY_LANG, patch.lang);
  if (patch.gender  !== undefined) localStorage.setItem(KEY_GENDER, patch.gender);
}

export function isVoiceEnabled(): boolean           { return getVoiceSettings().enabled; }
export function setVoiceEnabled(val: boolean): void { saveVoiceSettings({ enabled: val }); }
export function getSavedVoiceName(): string | null  { return null; }
export function saveVoiceName(_name: string): void  { /* no-op */ }

// ─── Voice resolution ─────────────────────────────────────────

function resolveVoice(lang: VoiceLang, gender: VoiceGender): { voiceId: string; modelId: string } {
  if (lang === "hi") {
    return { voiceId: gender === "male" ? VOICE_HI_MALE : VOICE_HI_FEMALE, modelId: MODEL_HI };
  }
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

    const synthRes = await fetch("/api/tts/synthesize", {
      method: "POST",
      headers,
      body: JSON.stringify({ text: trimmed, voiceId, modelId }),
    });
    if (!synthRes.ok) return;

    const data = (await synthRes.json()) as { audioUrl: string };

    const audioHeaders: Record<string, string> = {};
    if (token) audioHeaders["Authorization"] = `Bearer ${token}`;

    const audioRes = await fetch(data.audioUrl, { headers: audioHeaders });
    if (!audioRes.ok) return;

    const blob = await audioRes.blob();
    const url  = URL.createObjectURL(blob);
    _objUrl = url;

    const audio = new Audio(url);
    _audio = audio;
    audio.onended = stopCurrentAudio;
    audio.onerror = stopCurrentAudio;
    await audio.play();
  } catch {
    stopCurrentAudio();
  }
}

// ─── Task announcements ───────────────────────────────────────

const HINDI_MSGS = [
  (n: string, t: string) => `${n}, अब समय है ${t} का! चलो शुरू करते हैं!`,
  (n: string, t: string) => `हाय ${n}! ${t} का समय आ गया।`,
  (n: string, t: string) => `${n}, ${t} करने का वक़्त है! तैयार हो जाओ!`,
];
const ENGLISH_MSGS = [
  (n: string, t: string) => `Hey ${n}! Time for ${t}. You've got this!`,
  (n: string, t: string) => `${n}, it's ${t} time! Let's go!`,
  (n: string, t: string) => `Hi ${n}! Your next activity is ${t}. Ready?`,
];

export async function announceCurrentTask(childName: string, activity: string): Promise<void> {
  const settings = getVoiceSettings();
  if (!settings.enabled) return;
  const msgs = settings.lang === "hi" ? HINDI_MSGS : ENGLISH_MSGS;
  const msg   = msgs[Math.floor(Math.random() * msgs.length)](childName, activity);
  await speak(msg);
}
