/**
 * Talking Amy voice transformation modes — device-side presets + kid-facing copy.
 */

export type TalkingAmyModeId = "baby" | "chipmunk" | "robot" | "alien" | "monster";

export type TalkingAmyVoicePreset = {
  /** Pitch shift in cents (100 = 1 semitone). */
  detuneCents: number;
  playbackRate: number;
  /** Optional low-pass cutoff for softer tone (Hz). */
  lowPassHz?: number;
  /** Optional high-pass for deep voices (Hz). */
  highPassHz?: number;
  /** Robot ring-mod carrier frequency (Hz). */
  ringModHz?: number;
  /** Alien wobble LFO rate (Hz). */
  wobbleHz?: number;
  /** Alien wobble depth in cents. */
  wobbleDepthCents?: number;
  /** Echo delay time (seconds). */
  echoDelaySec?: number;
  /** Echo wet mix 0..1. */
  echoMix?: number;
};

export type TalkingAmyModeTheme = {
  listeningGlow: string;
  speakingGlow: string;
  thinkingGlow: string;
  ringBorderListening: string;
  ringBorderSpeaking: string;
  haloPulseSec: number;
  fastBounce: boolean;
  gentleBounce: boolean;
  giantBounce: boolean;
  floatMotion: boolean;
  cosmicParticles: boolean;
  monsterParticles: boolean;
  digitalPulse: boolean;
  eyeSparkle: boolean;
  brightPurplePulse: boolean;
  micButtonGradient: string;
  micButtonRecording: string;
  pageAccent: string;
};

export type TalkingAmyMode = {
  id: TalkingAmyModeId;
  emoji: string;
  label: string;
  tagline: string;
  voice: TalkingAmyVoicePreset;
  theme: TalkingAmyModeTheme;
  reactions: readonly string[];
  echoHint: string;
};

export const TALKING_AMY_MODES: readonly TalkingAmyMode[] = [
  {
    id: "chipmunk",
    emoji: "🐿️",
    label: "Chipmunk Amy",
    tagline: "Classic Talking Tom style",
    voice: {
      detuneCents: 1000,
      playbackRate: 1.8,
    },
    theme: {
      listeningGlow: "bg-violet-400/40",
      speakingGlow: "bg-fuchsia-500/45",
      thinkingGlow: "bg-violet-300/30",
      ringBorderListening: "border-violet-300/85",
      ringBorderSpeaking: "border-fuchsia-300/85",
      haloPulseSec: 0.5,
      fastBounce: true,
      gentleBounce: false,
      giantBounce: false,
      floatMotion: false,
      cosmicParticles: false,
      monsterParticles: false,
      digitalPulse: false,
      eyeSparkle: false,
      brightPurplePulse: true,
      micButtonGradient: "from-violet-500 via-fuchsia-500 to-purple-600",
      micButtonRecording: "from-violet-400 via-fuchsia-500 to-pink-600",
      pageAccent: "bg-violet-500/22",
    },
    reactions: ["Wheee!", "Say it again!", "That was funny!"],
    echoHint: "Amy repeats you super fast!",
  },
  {
    id: "baby",
    emoji: "👶",
    label: "Baby Amy",
    tagline: "Cute toddler Amy",
    voice: {
      detuneCents: 500,
      playbackRate: 1.1,
      lowPassHz: 3800,
    },
    theme: {
      listeningGlow: "bg-pink-300/40",
      speakingGlow: "bg-rose-300/45",
      thinkingGlow: "bg-pink-200/30",
      ringBorderListening: "border-pink-200/80",
      ringBorderSpeaking: "border-rose-200/80",
      haloPulseSec: 1.4,
      fastBounce: false,
      gentleBounce: true,
      giantBounce: false,
      floatMotion: false,
      cosmicParticles: false,
      monsterParticles: false,
      digitalPulse: false,
      eyeSparkle: true,
      brightPurplePulse: false,
      micButtonGradient: "from-pink-400 via-rose-400 to-fuchsia-400",
      micButtonRecording: "from-pink-300 via-rose-400 to-pink-500",
      pageAccent: "bg-pink-400/20",
    },
    reactions: ["Yay!", "Again!", "Hehe!"],
    echoHint: "Amy says it in a cute baby voice!",
  },
  {
    id: "robot",
    emoji: "🤖",
    label: "Robot Amy",
    tagline: "Friendly learning robot",
    voice: {
      detuneCents: 0,
      playbackRate: 1.0,
      ringModHz: 58,
    },
    theme: {
      listeningGlow: "bg-cyan-400/35",
      speakingGlow: "bg-sky-400/45",
      thinkingGlow: "bg-cyan-300/28",
      ringBorderListening: "border-cyan-300/80",
      ringBorderSpeaking: "border-sky-300/80",
      haloPulseSec: 0.9,
      fastBounce: false,
      gentleBounce: false,
      giantBounce: false,
      floatMotion: false,
      cosmicParticles: false,
      monsterParticles: false,
      digitalPulse: true,
      eyeSparkle: false,
      brightPurplePulse: false,
      micButtonGradient: "from-cyan-500 via-sky-500 to-blue-600",
      micButtonRecording: "from-cyan-400 via-sky-500 to-indigo-600",
      pageAccent: "bg-cyan-400/18",
    },
    reactions: ["Voice detected.", "Processing complete.", "Hello friend."],
    echoHint: "Beep boop — robot Amy speaking!",
  },
  {
    id: "alien",
    emoji: "👽",
    label: "Alien Amy",
    tagline: "Playful space visitor",
    voice: {
      detuneCents: 0,
      playbackRate: 1.0,
      wobbleHz: 5.5,
      wobbleDepthCents: 180,
      echoDelaySec: 0.17,
      echoMix: 0.38,
    },
    theme: {
      listeningGlow: "bg-emerald-400/30",
      speakingGlow: "bg-violet-400/40",
      thinkingGlow: "bg-teal-300/25",
      ringBorderListening: "border-emerald-300/70",
      ringBorderSpeaking: "border-violet-300/75",
      haloPulseSec: 1.8,
      fastBounce: false,
      gentleBounce: false,
      giantBounce: false,
      floatMotion: true,
      cosmicParticles: true,
      monsterParticles: false,
      digitalPulse: false,
      eyeSparkle: false,
      brightPurplePulse: false,
      micButtonGradient: "from-emerald-500 via-violet-500 to-fuchsia-500",
      micButtonRecording: "from-teal-400 via-violet-500 to-purple-600",
      pageAccent: "bg-violet-400/18",
    },
    reactions: [
      "Greetings Earth friend.",
      "Zorp zorp!",
      "Take me to your playground.",
    ],
    echoHint: "Alien Amy from outer space!",
  },
  {
    id: "monster",
    emoji: "🦖",
    label: "Monster Amy",
    tagline: "Big silly roar",
    voice: {
      detuneCents: -600,
      playbackRate: 0.8,
      lowPassHz: 2200,
      highPassHz: 90,
    },
    theme: {
      listeningGlow: "bg-purple-900/45",
      speakingGlow: "bg-violet-800/50",
      thinkingGlow: "bg-purple-800/35",
      ringBorderListening: "border-purple-400/70",
      ringBorderSpeaking: "border-violet-500/80",
      haloPulseSec: 0.7,
      fastBounce: false,
      gentleBounce: false,
      giantBounce: true,
      floatMotion: false,
      cosmicParticles: false,
      monsterParticles: true,
      digitalPulse: false,
      eyeSparkle: false,
      brightPurplePulse: false,
      micButtonGradient: "from-purple-700 via-violet-800 to-indigo-900",
      micButtonRecording: "from-purple-600 via-violet-700 to-purple-900",
      pageAccent: "bg-purple-700/25",
    },
    reactions: ["Rooooar!", "I am Monster Amy!", "That sounded huge!"],
    echoHint: "Monster Amy goes ROAR!",
  },
] as const;

export const TALKING_AMY_DEFAULT_MODE: TalkingAmyModeId = "chipmunk";

const MODE_BY_ID = new Map(TALKING_AMY_MODES.map((m) => [m.id, m]));

export function getTalkingAmyMode(id: TalkingAmyModeId): TalkingAmyMode {
  return MODE_BY_ID.get(id) ?? MODE_BY_ID.get(TALKING_AMY_DEFAULT_MODE)!;
}

export function pickTalkingAmyReaction(mode: TalkingAmyMode): string {
  const list = mode.reactions;
  return list[Math.floor(Math.random() * list.length)] ?? list[0] ?? "Yay!";
}

/** Legacy export — chipmunk preset rate for tests. */
export const TALKING_AMY_ECHO_RATE = getTalkingAmyMode("chipmunk").voice.playbackRate;
