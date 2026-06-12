import type { BadgeId, HealthGameId, HealthLevelId, QuestId, XpTier } from "./types";

export const HEALTH_LAB_DISCLAIMER =
  "Amy Health Lab is designed for wellness, learning, healthy habits and fun. It is not a medical assessment tool.";

export const XP_BY_TIER: Record<XpTier, number> = {
  bronze: 25,
  silver: 50,
  gold: 75,
  platinum: 100,
  perfect: 150,
};

export const HEALTH_LEVELS: {
  id: HealthLevelId;
  name: string;
  xpRequired: number;
  avatarId: string;
}[] = [
  { id: 1, name: "Healthy Explorer", xpRequired: 0, avatarId: "explorer" },
  { id: 2, name: "Focus Hero", xpRequired: 800, avatarId: "focus-hero" },
  { id: 3, name: "Balance Champion", xpRequired: 1800, avatarId: "balance-champ" },
  { id: 4, name: "Mind Ninja", xpRequired: 3200, avatarId: "mind-ninja" },
  { id: 5, name: "Amy Wellness Master", xpRequired: 4800, avatarId: "wellness-master" },
  { id: 6, name: "Zen Guardian", xpRequired: 6600, avatarId: "zen-guardian" },
  { id: 7, name: "Galaxy Wellness Hero", xpRequired: 10000, avatarId: "galaxy-hero" },
  { id: 8, name: "Cosmic Explorer", xpRequired: 14000, avatarId: "cosmic-explorer" },
  { id: 9, name: "Stellar Champion", xpRequired: 19000, avatarId: "stellar-champion" },
  { id: 10, name: "Universe Guardian", xpRequired: 25000, avatarId: "universe-guardian" },
];

export const PRESTIGE_XP_PER_LEVEL = 5000;

export const STREAK_MILESTONES = [1, 3, 7, 14, 30, 60, 100] as const;

export const FLAMINGO_MIN_DURATION = [15, 20, 25, 30, 45] as const;

export const GAMES: {
  id: HealthGameId;
  title: string;
  subtitle: string;
  emoji: string;
  theme: string;
  sensor: "touch" | "motion" | "aggregate";
  durationHint: string;
}[] = [
  {
    id: "breath-control",
    title: "Balloon Journey Adventure",
    subtitle: "Hold steady — soar from trees to the universe",
    emoji: "🎈",
    theme: "from-sky-400 via-indigo-500 to-violet-700",
    sensor: "touch",
    durationHint: "Up to 60 sec",
  },
  {
    id: "flamingo-balance",
    title: "Sky Island Survival",
    subtitle: "Stand on one leg — weather the wind gusts",
    emoji: "🦩",
    theme: "from-pink-400 via-rose-500 to-orange-400",
    sensor: "motion",
    durationHint: "15–90 sec",
  },
  {
    id: "reaction-time",
    title: "Rocket Launch Academy",
    subtitle: "Launch rockets — tap when the signal turns go",
    emoji: "🚀",
    theme: "from-red-500 via-amber-500 to-emerald-500",
    sensor: "touch",
    durationHint: "5 rounds",
  },
  {
    id: "freeze-statue",
    title: "Crystal Garden Challenge",
    subtitle: "Dance with Amy — freeze to grow crystals",
    emoji: "🗿",
    theme: "from-emerald-400 via-teal-500 to-cyan-600",
    sensor: "motion",
    durationHint: "5 rounds",
  },
  {
    id: "finger-stability",
    title: "Crystal Core Reactor",
    subtitle: "Stabilize the energy core — don't let it crack",
    emoji: "💎",
    theme: "from-violet-500 via-purple-600 to-fuchsia-600",
    sensor: "touch",
    durationHint: "20 sec",
  },
  {
    id: "calmness-meter",
    title: "Amy Wellness Report",
    subtitle: "Your wellness signature — powered by your adventures",
    emoji: "✨",
    theme: "from-amber-400 via-violet-500 to-indigo-700",
    sensor: "aggregate",
    durationHint: "Daily snapshot",
  },
];

export const BREATH_MILESTONES = [
  { seconds: 5, label: "Tree", emoji: "🌳" },
  { seconds: 10, label: "Cloud", emoji: "☁️" },
  { seconds: 20, label: "Mountain", emoji: "⛰️" },
  { seconds: 30, label: "Space", emoji: "🌌" },
  { seconds: 45, label: "Galaxy", emoji: "🪐" },
  { seconds: 60, label: "Universe", emoji: "🌟" },
] as const;

export const REACTION_TIERS = [
  { maxMs: 200, label: "Lightning Ninja", emoji: "⚡" },
  { maxMs: 300, label: "Rocket Pilot", emoji: "🚀" },
  { maxMs: 400, label: "Space Cadet", emoji: "👨‍🚀" },
  { maxMs: Infinity, label: "Explorer", emoji: "🔭" },
] as const;

export const FLAMINGO_DIFFICULTIES = [
  "Beginner",
  "Explorer",
  "Champion",
  "Elite",
  "Master",
] as const;

export const BADGES: {
  id: BadgeId;
  name: string;
  emoji: string;
  description: string;
  secret?: boolean;
}[] = [
  { id: "first-challenge", name: "First Challenge", emoji: "🎯", description: "Complete your first Health Lab activity" },
  { id: "first-perfect", name: "First Perfect", emoji: "💫", description: "Earn a Perfect score on any challenge" },
  { id: "streak-7", name: "7-Day Streak", emoji: "🔥", description: "Play Health Lab 7 days in a row" },
  { id: "streak-30", name: "30-Day Streak", emoji: "🌈", description: "Play Health Lab 30 days in a row" },
  { id: "balance-master", name: "Balance Master", emoji: "🦩", description: "8 balance sessions averaging 80+ focus" },
  { id: "focus-master", name: "Focus Master", emoji: "🎯", description: "8 focus sessions averaging 80+ focus" },
  { id: "calmness-master", name: "Calmness Master", emoji: "🧘", description: "8 calmness sessions averaging 80+ calmness" },
  { id: "reaction-ninja", name: "Reaction Ninja", emoji: "⚡", description: "Lightning-fast reactions" },
  { id: "crystal-guardian", name: "Crystal Guardian", emoji: "💎", description: "Master finger stability" },
  { id: "galaxy-hero", name: "Galaxy Hero", emoji: "🌟", description: "Reach Galaxy Wellness Hero level" },
  { id: "still-finger-master", name: "Still Finger Master", emoji: "🎈", description: "Hold breath control for 30+ seconds" },
  { id: "flamingo-king", name: "Flamingo King", emoji: "👑", description: "Balance like a champion" },
  { id: "statue-master", name: "Statue Master", emoji: "🗿", description: "Freeze perfectly 5 times" },
  { id: "secret-midnight-scientist", name: "Midnight Scientist", emoji: "🌙", description: "Play after 8pm", secret: true },
  { id: "secret-perfect-week", name: "Perfect Week", emoji: "💎", description: "7-day streak with daily quests done", secret: true },
  { id: "secret-golden-touch", name: "Golden Touch", emoji: "✨", description: "Score perfect on Golden Challenge day", secret: true },
];

export const DAILY_QUESTS: {
  id: QuestId;
  title: string;
  description: string;
  target: number;
  coinReward: number;
  xpReward: number;
}[] = [
  { id: "complete-3", title: "Triple Play", description: "Complete 3 activities today", target: 3, coinReward: 15, xpReward: 30 },
  { id: "complete-all-6", title: "Full Lab Tour", description: "Try all 6 challenges today", target: 6, coinReward: 30, xpReward: 60 },
  { id: "beat-pb", title: "New Record", description: "Beat a personal best today", target: 1, coinReward: 20, xpReward: 40 },
  { id: "maintain-streak", title: "Streak Keeper", description: "Keep your daily streak alive", target: 1, coinReward: 10, xpReward: 20 },
  { id: "earn-300-xp", title: "XP Hunter", description: "Earn 300 XP today", target: 300, coinReward: 25, xpReward: 50 },
  { id: "complete-under-5min", title: "Speed Scientist", description: "Complete 3 activities in under 5 minutes", target: 3, coinReward: 20, xpReward: 45 },
];

export const AVATAR_EMOJIS: Record<string, string> = {
  explorer: "🧑‍🔬",
  "focus-hero": "🦸",
  "balance-champ": "🏆",
  "mind-ninja": "🥷",
  "wellness-master": "⭐",
  "zen-guardian": "🧘",
  "galaxy-hero": "🌌",
  "cosmic-explorer": "🪐",
  "stellar-champion": "☄️",
  "universe-guardian": "👑",
};

export function getGameById(id: HealthGameId) {
  return GAMES.find((g) => g.id === id)!;
}

export function getLevelForXp(totalXp: number, prestige = 0): (typeof HEALTH_LEVELS)[number] {
  const effectiveXp = totalXp + prestige * PRESTIGE_XP_PER_LEVEL;
  let current = HEALTH_LEVELS[0];
  for (const level of HEALTH_LEVELS) {
    if (effectiveXp >= level.xpRequired) current = level;
    else break;
  }
  return current;
}

export function getNextLevel(currentLevel: HealthLevelId) {
  const idx = HEALTH_LEVELS.findIndex((l) => l.id === currentLevel);
  return idx >= 0 && idx < HEALTH_LEVELS.length - 1 ? HEALTH_LEVELS[idx + 1] : null;
}

export function getPrestigeTier(prestige: number): string {
  if (prestige >= 5) return "Legendary Scientist";
  if (prestige >= 3) return "Master Researcher";
  if (prestige >= 1) return "Senior Explorer";
  return "";
}
