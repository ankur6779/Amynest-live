/**
 * Talking Amy voice transformation modes — device-side presets + kid-facing copy.
 */

import { pickWeightedTalkingAmyReaction } from "@/lib/talking-amy-reaction-pools";

export type TalkingAmyRegularModeId =
  | "baby"
  | "chipmunk"
  | "robot"
  | "alien"
  | "monster"
  | "ghost"
  | "space"
  | "magic"
  | "frog";

export type TalkingAmySecretModeId = "rainbow" | "lightning" | "galaxy";

export type TalkingAmyModeId = TalkingAmyRegularModeId | TalkingAmySecretModeId;

export type TalkingAmyVoicePreset = {
  /** Pitch shift in cents (100 = 1 semitone). */
  detuneCents: number;
  playbackRate: number;
  lowPassHz?: number;
  highPassHz?: number;
  ringModHz?: number;
  wobbleHz?: number;
  wobbleDepthCents?: number;
  echoDelaySec?: number;
  echoMix?: number;
  reverbDelaySec?: number;
  reverbMix?: number;
  radioBandLowHz?: number;
  radioBandHighHz?: number;
  transmissionDelaySec?: number;
  shimmerHz?: number;
  shimmerDepthCents?: number;
  resonanceHz?: number;
  resonanceQ?: number;
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
  ghostParticles: boolean;
  spaceParticles: boolean;
  magicParticles: boolean;
  frogParticles: boolean;
  hopAnimation: boolean;
  whiteGlow: boolean;
  rainbowGlow: boolean;
  transparentEffect: boolean;
  orbitingStars: boolean;
  featuredGlow: boolean;
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
  secret?: boolean;
};

const MODE_THEME_DEFAULTS = {
  ghostParticles: false,
  spaceParticles: false,
  magicParticles: false,
  frogParticles: false,
  hopAnimation: false,
  whiteGlow: false,
  rainbowGlow: false,
  transparentEffect: false,
  orbitingStars: false,
  featuredGlow: false,
} as const;

export const TALKING_AMY_REGULAR_MODES: readonly TalkingAmyMode[] = [
  {
    id: "chipmunk",
    emoji: "🐿️",
    label: "Chipmunk Amy",
    tagline: "Bright and playful",
    voice: { detuneCents: 600, playbackRate: 1.35, lowPassHz: 6800 },
    theme: {
      ...MODE_THEME_DEFAULTS,
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
    reactions: [],
    echoHint: "Amy repeats you in a cute chipmunk voice!",
  },
  {
    id: "baby",
    emoji: "👶",
    label: "Baby Amy",
    tagline: "Cute toddler Amy",
    voice: { detuneCents: 500, playbackRate: 1.1, lowPassHz: 3800 },
    theme: {
      ...MODE_THEME_DEFAULTS,
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
    reactions: [],
    echoHint: "Amy says it in a cute baby voice!",
  },
  {
    id: "robot",
    emoji: "🤖",
    label: "Robot Amy",
    tagline: "Friendly learning robot",
    voice: { detuneCents: 0, playbackRate: 1.0, ringModHz: 58 },
    theme: {
      ...MODE_THEME_DEFAULTS,
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
    reactions: [],
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
      ...MODE_THEME_DEFAULTS,
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
    reactions: [],
    echoHint: "Alien Amy from outer space!",
  },
  {
    id: "monster",
    emoji: "🦖",
    label: "Monster Amy",
    tagline: "Big silly roar",
    voice: { detuneCents: -600, playbackRate: 0.8, lowPassHz: 2200, highPassHz: 90 },
    theme: {
      ...MODE_THEME_DEFAULTS,
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
    reactions: [],
    echoHint: "Monster Amy goes ROAR!",
  },
  {
    id: "ghost",
    emoji: "👻",
    label: "Ghost Amy",
    tagline: "Spooky silly echo",
    voice: {
      detuneCents: -200,
      playbackRate: 0.95,
      echoDelaySec: 0.22,
      echoMix: 0.32,
      reverbDelaySec: 0.38,
      reverbMix: 0.28,
    },
    theme: {
      ...MODE_THEME_DEFAULTS,
      listeningGlow: "bg-white/35",
      speakingGlow: "bg-slate-200/40",
      thinkingGlow: "bg-white/20",
      ringBorderListening: "border-white/60",
      ringBorderSpeaking: "border-slate-100/70",
      haloPulseSec: 1.6,
      fastBounce: false,
      gentleBounce: false,
      giantBounce: false,
      floatMotion: true,
      cosmicParticles: false,
      monsterParticles: false,
      digitalPulse: false,
      eyeSparkle: false,
      brightPurplePulse: false,
      ghostParticles: true,
      whiteGlow: true,
      transparentEffect: true,
      micButtonGradient: "from-slate-300 via-white/80 to-slate-400",
      micButtonRecording: "from-white/70 via-slate-200 to-slate-300",
      pageAccent: "bg-white/12",
    },
    reactions: [],
    echoHint: "Boo! Amy echoes with a ghostly whisper!",
  },
  {
    id: "space",
    emoji: "🚀",
    label: "Space Amy",
    tagline: "Mission control voice",
    voice: {
      detuneCents: 200,
      playbackRate: 1.0,
      radioBandLowHz: 420,
      radioBandHighHz: 3200,
      transmissionDelaySec: 0.05,
    },
    theme: {
      ...MODE_THEME_DEFAULTS,
      listeningGlow: "bg-indigo-500/35",
      speakingGlow: "bg-violet-500/42",
      thinkingGlow: "bg-blue-500/25",
      ringBorderListening: "border-indigo-300/75",
      ringBorderSpeaking: "border-violet-300/80",
      haloPulseSec: 1.1,
      fastBounce: false,
      gentleBounce: false,
      giantBounce: false,
      floatMotion: false,
      cosmicParticles: false,
      monsterParticles: false,
      digitalPulse: true,
      eyeSparkle: false,
      brightPurplePulse: false,
      spaceParticles: true,
      orbitingStars: true,
      micButtonGradient: "from-indigo-600 via-violet-600 to-blue-700",
      micButtonRecording: "from-indigo-500 via-violet-600 to-indigo-800",
      pageAccent: "bg-indigo-500/20",
    },
    reactions: [],
    echoHint: "Houston — Amy received your transmission!",
  },
  {
    id: "magic",
    emoji: "🦄",
    label: "Magic Amy",
    tagline: "Sparkly spell voice",
    voice: {
      detuneCents: 300,
      playbackRate: 1.1,
      shimmerHz: 6.5,
      shimmerDepthCents: 45,
      lowPassHz: 7200,
    },
    theme: {
      ...MODE_THEME_DEFAULTS,
      listeningGlow: "bg-fuchsia-400/35",
      speakingGlow: "bg-pink-400/45",
      thinkingGlow: "bg-violet-300/28",
      ringBorderListening: "border-fuchsia-200/80",
      ringBorderSpeaking: "border-pink-200/85",
      haloPulseSec: 1.2,
      fastBounce: false,
      gentleBounce: true,
      giantBounce: false,
      floatMotion: false,
      cosmicParticles: false,
      monsterParticles: false,
      digitalPulse: false,
      eyeSparkle: true,
      brightPurplePulse: false,
      magicParticles: true,
      rainbowGlow: true,
      micButtonGradient: "from-fuchsia-500 via-pink-500 to-violet-500",
      micButtonRecording: "from-pink-400 via-fuchsia-500 to-purple-600",
      pageAccent: "bg-fuchsia-400/20",
    },
    reactions: [],
    echoHint: "Abracadabra — magic Amy sparkles!",
  },
  {
    id: "frog",
    emoji: "🐸",
    label: "Frog Amy",
    tagline: "Ribbit hop fun",
    voice: {
      detuneCents: -400,
      playbackRate: 1.0,
      resonanceHz: 320,
      resonanceQ: 4.2,
      lowPassHz: 4800,
    },
    theme: {
      ...MODE_THEME_DEFAULTS,
      listeningGlow: "bg-emerald-400/38",
      speakingGlow: "bg-green-500/42",
      thinkingGlow: "bg-lime-400/25",
      ringBorderListening: "border-emerald-300/80",
      ringBorderSpeaking: "border-green-300/85",
      haloPulseSec: 0.65,
      fastBounce: false,
      gentleBounce: false,
      giantBounce: false,
      floatMotion: false,
      cosmicParticles: false,
      monsterParticles: false,
      digitalPulse: false,
      eyeSparkle: false,
      brightPurplePulse: false,
      frogParticles: true,
      hopAnimation: true,
      micButtonGradient: "from-emerald-500 via-green-500 to-lime-600",
      micButtonRecording: "from-green-400 via-emerald-500 to-green-700",
      pageAccent: "bg-emerald-500/20",
    },
    reactions: [],
    echoHint: "Ribbit! Amy hops your words back!",
  },
] as const;

export const TALKING_AMY_SECRET_MODES: readonly TalkingAmyMode[] = [
  {
    id: "rainbow",
    emoji: "🌈",
    label: "Rainbow Amy",
    tagline: "Secret color burst",
    secret: true,
    voice: {
      detuneCents: 250,
      playbackRate: 1.12,
      wobbleHz: 4.2,
      wobbleDepthCents: 90,
      shimmerHz: 8,
      shimmerDepthCents: 35,
    },
    theme: {
      ...MODE_THEME_DEFAULTS,
      listeningGlow: "bg-gradient-to-br from-pink-400/30 via-amber-300/30 to-cyan-400/30",
      speakingGlow: "bg-gradient-to-br from-rose-400/40 via-violet-400/35 to-sky-400/40",
      thinkingGlow: "bg-fuchsia-300/25",
      ringBorderListening: "border-pink-300/70",
      ringBorderSpeaking: "border-cyan-300/75",
      haloPulseSec: 0.8,
      fastBounce: true,
      gentleBounce: false,
      giantBounce: false,
      floatMotion: true,
      cosmicParticles: false,
      monsterParticles: false,
      digitalPulse: false,
      eyeSparkle: true,
      brightPurplePulse: false,
      magicParticles: true,
      rainbowGlow: true,
      featuredGlow: true,
      micButtonGradient: "from-pink-500 via-amber-400 to-cyan-500",
      micButtonRecording: "from-rose-400 via-fuchsia-500 to-sky-500",
      pageAccent: "bg-gradient-to-r from-pink-500/20 via-amber-400/15 to-cyan-500/20",
    },
    reactions: [],
    echoHint: "Secret Rainbow Amy — color explosion!",
  },
  {
    id: "lightning",
    emoji: "⚡",
    label: "Lightning Amy",
    tagline: "Secret electric zap",
    secret: true,
    voice: {
      detuneCents: 150,
      playbackRate: 1.05,
      ringModHz: 42,
      highPassHz: 280,
      lowPassHz: 5200,
    },
    theme: {
      ...MODE_THEME_DEFAULTS,
      listeningGlow: "bg-yellow-300/40",
      speakingGlow: "bg-amber-400/50",
      thinkingGlow: "bg-yellow-200/30",
      ringBorderListening: "border-yellow-200/85",
      ringBorderSpeaking: "border-amber-200/90",
      haloPulseSec: 0.45,
      fastBounce: true,
      gentleBounce: false,
      giantBounce: false,
      floatMotion: false,
      cosmicParticles: false,
      monsterParticles: false,
      digitalPulse: true,
      eyeSparkle: false,
      brightPurplePulse: true,
      micButtonGradient: "from-yellow-400 via-amber-500 to-orange-600",
      micButtonRecording: "from-amber-300 via-yellow-500 to-orange-600",
      pageAccent: "bg-amber-400/25",
    },
    reactions: [],
    echoHint: "Secret Lightning Amy — zap zap!",
  },
  {
    id: "galaxy",
    emoji: "🪐",
    label: "Galaxy Amy",
    tagline: "Secret cosmic echo",
    secret: true,
    voice: {
      detuneCents: -150,
      playbackRate: 0.92,
      echoDelaySec: 0.28,
      echoMix: 0.42,
      wobbleHz: 3.2,
      wobbleDepthCents: 120,
      lowPassHz: 3600,
    },
    theme: {
      ...MODE_THEME_DEFAULTS,
      listeningGlow: "bg-indigo-700/40",
      speakingGlow: "bg-violet-700/48",
      thinkingGlow: "bg-purple-800/32",
      ringBorderListening: "border-indigo-400/70",
      ringBorderSpeaking: "border-violet-400/80",
      haloPulseSec: 1.5,
      fastBounce: false,
      gentleBounce: false,
      giantBounce: false,
      floatMotion: true,
      cosmicParticles: true,
      monsterParticles: false,
      digitalPulse: false,
      eyeSparkle: false,
      brightPurplePulse: false,
      spaceParticles: true,
      orbitingStars: true,
      micButtonGradient: "from-indigo-800 via-violet-900 to-purple-950",
      micButtonRecording: "from-violet-700 via-indigo-800 to-purple-900",
      pageAccent: "bg-indigo-700/28",
    },
    reactions: [],
    echoHint: "Secret Galaxy Amy — cosmic echo!",
  },
] as const;

/** Regular modes shown in the voice picker. */
export const TALKING_AMY_MODES = TALKING_AMY_REGULAR_MODES;

export const TALKING_AMY_SECRET_MODE_IDS = TALKING_AMY_SECRET_MODES.map(
  (m) => m.id,
) as readonly TalkingAmySecretModeId[];

/** All collectible Amy variants (9 regular + 3 secret = 12). */
export const TALKING_AMY_COLLECTIBLE_IDS: readonly TalkingAmyModeId[] = [
  ...TALKING_AMY_REGULAR_MODES.map((m) => m.id),
  ...TALKING_AMY_SECRET_MODE_IDS,
];

export const TALKING_AMY_DEFAULT_MODE: TalkingAmyRegularModeId = "chipmunk";

const MODE_BY_ID = new Map<TalkingAmyModeId, TalkingAmyMode>([
  ...TALKING_AMY_REGULAR_MODES.map((m) => [m.id, m] as const),
  ...TALKING_AMY_SECRET_MODES.map((m) => [m.id, m] as const),
]);

export function isTalkingAmySecretModeId(id: TalkingAmyModeId): id is TalkingAmySecretModeId {
  return TALKING_AMY_SECRET_MODE_IDS.includes(id as TalkingAmySecretModeId);
}

export function getTalkingAmyMode(id: TalkingAmyModeId): TalkingAmyMode {
  return MODE_BY_ID.get(id) ?? MODE_BY_ID.get(TALKING_AMY_DEFAULT_MODE)!;
}

export function resolveTalkingAmyPlaybackMode(
  selected: TalkingAmyRegularModeId,
  activeSecret: TalkingAmySecretModeId | null,
): TalkingAmyModeId {
  return activeSecret ?? selected;
}

export function pickTalkingAmyReaction(mode: TalkingAmyMode): string {
  return pickWeightedTalkingAmyReaction(mode.id);
}

/** Legacy export — chipmunk base preset rate for tests. */
export const TALKING_AMY_ECHO_RATE = getTalkingAmyMode("chipmunk").voice.playbackRate;

export function getChipmunkPlaybackRate(recordingDurationSec: number): number {
  if (!Number.isFinite(recordingDurationSec) || recordingDurationSec <= 0) {
    return TALKING_AMY_ECHO_RATE;
  }
  if (recordingDurationSec < 2) return 1.45;
  if (recordingDurationSec <= 5) return 1.35;
  return 1.2;
}
