/**
 * Phase 4 — Amy feels alive with local, dynamic wording.
 * No backend, no gamification — time-of-day + salt rotation only.
 */
import type { GameDef } from "@/lib/games";
import { SKILL_TAG } from "@/lib/game-hub-meta";

function hourBucket(now = new Date()): "morning" | "afternoon" | "evening" {
  const h = now.getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

function pick<T>(items: readonly T[], salt: number): T {
  return items[Math.abs(Math.floor(salt)) % items.length]!;
}

const GREETINGS = {
  morning: [
    "Good morning! Ready for a bright little adventure?",
    "Sunrise brains are warm — let's play gently!",
    "Hello, sunshine! Amy picked something fun for you.",
  ],
  afternoon: [
    "Hi there! Perfect time for a quick brain stretch.",
    "Afternoon energy — let's make it playful!",
    "Amy's here with a cosy challenge just for you.",
  ],
  evening: [
    "Evening calm — a soft game before wind-down?",
    "Hello, star! One kind adventure before bedtime vibes.",
    "Amy saved a gentle game for this part of the day.",
  ],
} as const;

const HERO_TIPS = [
  "Tap Play when you feel ready — no rush.",
  "Short and sweet — every try helps your brain grow.",
  "Mistakes are practice in disguise. You've got this!",
  "Amy believes in you — one game at a time.",
];

const LIMIT_WARM = [
  "You played beautifully today. Rest those clever eyes — more tomorrow!",
  "Daily adventure complete. Amy is so proud of your focus!",
  "Great session! Come back tomorrow for a fresh adventure.",
];

const CONTINUE_EMPTY = [
  "Your adventure trail starts with one game — tap Play above!",
  "Nothing to continue yet. Today's Adventure is waiting!",
];

const LOADING_LINES = [
  "Getting your adventure ready…",
  "Amy is setting the stage…",
  "Almost there — sparkles incoming…",
];

const EXIT_LINES = [
  "Want to keep playing a little longer?",
  "Pause for now, or stay and finish this round?",
];

/** Hub greeting under hero — rotates by day part + date salt. */
export function getAmyGreeting(now = new Date()): string {
  const bucket = hourBucket(now);
  const salt = now.getDate() + now.getMonth() * 31 + (bucket === "morning" ? 1 : bucket === "afternoon" ? 2 : 3);
  return pick(GREETINGS[bucket], salt);
}

export function getAmyHeroTip(game: GameDef | undefined, now = new Date()): string {
  if (!game) return pick(HERO_TIPS, now.getDate());
  const skill = SKILL_TAG[game.category];
  const tailored = [
    `Today's focus: ${skill.toLowerCase()}. ${pick(HERO_TIPS, game.title.length)}`,
    `${game.emoji} ${game.title} is a lovely ${skill.toLowerCase()} stretch.`,
    pick(HERO_TIPS, game.title.length + now.getHours()),
  ];
  return pick(tailored, now.getDate() + game.title.length);
}

export function getAmyLimitMessage(now = new Date()): string {
  return pick(LIMIT_WARM, now.getDate() + 5);
}

export function getAmyContinueEmpty(now = new Date()): string {
  return pick(CONTINUE_EMPTY, now.getDate());
}

export function getAmyLoadingLine(salt = 0): string {
  return pick(LOADING_LINES, salt + 3);
}

export function getAmyExitPrompt(now = new Date()): string {
  return pick(EXIT_LINES, now.getMinutes());
}

export function getAmyCelebrationLine(perfect: boolean, salt = 0): string {
  if (perfect) {
    return pick(
      ["Amy is cheering — that was sparkling!", "Perfect shine! Amy is so proud!", "Wow — Amy's doing a happy dance!"],
      salt,
    );
  }
  return pick(
    ["Amy loved how hard you tried!", "Amy says: every round makes you stronger!", "Beautiful effort — Amy noticed!"],
    salt + 2,
  );
}
