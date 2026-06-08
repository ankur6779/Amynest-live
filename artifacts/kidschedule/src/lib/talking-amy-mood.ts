/**
 * Daily Amy mood + bedtime personality — cosmetic only, device-local.
 */

export type TalkingAmyMoodId = "happy" | "excited" | "sleepy" | "playful" | "curious";

export type TalkingAmyMoodProfile = {
  id: TalkingAmyMoodId;
  emoji: string;
  label: string;
  glowOverlay: string;
  ringAccent: string;
  idlePulseSec: number;
  reactions: readonly string[];
};

const MOODS: readonly TalkingAmyMoodProfile[] = [
  {
    id: "happy",
    emoji: "😊",
    label: "Happy Amy",
    glowOverlay: "bg-amber-300/25",
    ringAccent: "border-amber-200/50",
    idlePulseSec: 2.4,
    reactions: ["I'm so happy you're here!", "Best day with you!", "Smiles all around!"],
  },
  {
    id: "excited",
    emoji: "🤩",
    label: "Excited Amy",
    glowOverlay: "bg-fuchsia-400/28",
    ringAccent: "border-fuchsia-300/55",
    idlePulseSec: 1.6,
    reactions: ["I can't wait to hear you!", "This is gonna be fun!", "Let's go go go!"],
  },
  {
    id: "sleepy",
    emoji: "😴",
    label: "Sleepy Amy",
    glowOverlay: "bg-indigo-400/22",
    ringAccent: "border-indigo-300/45",
    idlePulseSec: 3.2,
    reactions: ["Cozy echo time…", "Soft and snuggly!", "Gentle giggles only."],
  },
  {
    id: "playful",
    emoji: "😜",
    label: "Playful Amy",
    glowOverlay: "bg-lime-400/22",
    ringAccent: "border-lime-300/50",
    idlePulseSec: 1.9,
    reactions: ["Silly time!", "Make me laugh!", "Boing boing fun!"],
  },
  {
    id: "curious",
    emoji: "🧐",
    label: "Curious Amy",
    glowOverlay: "bg-sky-400/24",
    ringAccent: "border-sky-300/50",
    idlePulseSec: 2.1,
    reactions: ["What will you say?", "I'm all ears!", "Tell me something new!"],
  },
] as const;

function localDateKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function hashDayKey(key: string): number {
  let h = 0;
  for (let i = 0; i < key.length; i++) {
    h = (h * 31 + key.charCodeAt(i)) >>> 0;
  }
  return h;
}

export const BEDTIME_HOUR = 20;

export function isTalkingAmyBedtime(date = new Date()): boolean {
  return date.getHours() >= BEDTIME_HOUR;
}

export function getDailyTalkingAmyMood(date = new Date()): TalkingAmyMoodProfile {
  const idx = hashDayKey(localDateKey(date)) % MOODS.length;
  const base = MOODS[idx] ?? MOODS[0]!;
  if (isTalkingAmyBedtime(date)) {
    return MOODS.find((m) => m.id === "sleepy") ?? base;
  }
  return base;
}

export function pickMoodReaction(mood: TalkingAmyMoodProfile): string {
  const list = mood.reactions;
  return list[Math.floor(Math.random() * list.length)] ?? list[0] ?? "Hi friend!";
}

export function getBedtimeAnimationScale(): number {
  return 0.85;
}

export function getBedtimeGlowOpacity(base: number): number {
  return Math.min(base, 0.42);
}
