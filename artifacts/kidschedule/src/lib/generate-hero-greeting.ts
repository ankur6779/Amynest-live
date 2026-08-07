/**
 * Dynamic Hero Greeting Engine — context-aware, anti-repetition greeting pairs
 * for the dashboard hero banner.
 */

export interface HeroGreetingContext {
  displayName?: string;
  weatherCondition?: string;
  weatherCode?: number;
  isDay?: boolean;
  /** Seven-day journey completed days count, or hub life-skills streak. */
  journeyStreak?: number;
  /** Routine completion streak (days). */
  routineStreak?: number;
  behaviorLoggedToday?: boolean;
  now?: Date;
}

export interface HeroGreeting {
  id: string;
  title: string;
  subtitle: string;
}

type GreetingCategory = "contextual" | "progress" | "inspirational";
type TimeSlot = "morning" | "afternoon" | "evening" | "late_night";
type WeatherTone = "sunny" | "rainy" | "cloudy" | "foggy" | "neutral";

interface GreetingCandidate {
  id: string;
  title: string;
  subtitle: string;
  category: GreetingCategory;
}

interface StoredGreetingRecord {
  id: string;
  title: string;
  subtitle: string;
  shownAt: string;
}

const STORAGE_KEY = "amynest:hero-greeting-history:v1";
const MAX_HISTORY = 20;
const COOLDOWN_DAYS = 7;

const CATEGORY_WEIGHTS: Record<GreetingCategory, number> = {
  contextual: 0.7,
  progress: 0.2,
  inspirational: 0.1,
};

function interpolate(template: string, name?: string): string {
  if (!name) return template.replace(/,?\s*\{name\}/g, "").replace(/\{name\}/g, "").trim();
  return template.replace(/\{name\}/g, name);
}

function getTimeSlot(date: Date): TimeSlot {
  const hour = date.getHours();
  if (hour >= 5 && hour < 11) return "morning";
  if (hour >= 11 && hour < 16) return "afternoon";
  if (hour >= 16 && hour < 21) return "evening";
  return "late_night";
}

function getWeatherTone(condition?: string, code?: number): WeatherTone {
  const c = (condition ?? "").toLowerCase();
  if (c === "sunny" || c === "heatwave" || c === "humid") return "sunny";
  if (c === "rainy" || c === "stormy") return "rainy";
  if (c === "cloudy" || c === "windy" || c === "cold") return "cloudy";
  if (c === "foggy") return "foggy";
  if (code != null) {
    if ([51, 52, 53, 54, 55, 56, 57, 61, 62, 63, 64, 65, 66, 67, 80, 81, 82, 95, 96, 99].includes(code)) {
      return "rainy";
    }
    if (code === 45 || code === 48) return "foggy";
    if (code >= 2 && code <= 3) return "cloudy";
    if (code === 0 || code === 1) return "sunny";
  }
  return "neutral";
}

function getDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function readHistory(): StoredGreetingRecord[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredGreetingRecord[];
    return Array.isArray(parsed) ? parsed.slice(0, MAX_HISTORY) : [];
  } catch {
    return [];
  }
}

function writeHistory(records: StoredGreetingRecord[]): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records.slice(0, MAX_HISTORY)));
  } catch {
    /* ignore quota errors */
  }
}

function isWithinCooldown(shownAt: string, now: Date): boolean {
  const shown = new Date(shownAt);
  if (Number.isNaN(shown.getTime())) return false;
  const diffMs = now.getTime() - shown.getTime();
  return diffMs < COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
}

function buildCandidatePool(ctx: HeroGreetingContext, now: Date): GreetingCandidate[] {
  const name = ctx.displayName?.trim();
  const slot = getTimeSlot(now);
  const weather = getWeatherTone(ctx.weatherCondition, ctx.weatherCode);
  const day = now.getDay();
  const pool: GreetingCandidate[] = [];

  const push = (
    id: string,
    title: string,
    subtitle: string,
    category: GreetingCategory,
  ) => {
    pool.push({
      id,
      title: interpolate(title, name),
      subtitle: interpolate(subtitle, name),
      category,
    });
  };

  const timeTitles: Record<TimeSlot, string[]> = {
    morning: [
      "☀️ Good morning, {name}",
      "🌤️ A fresh day begins, {name}",
      "✨ Ready for a great day?",
      "🌞 Let's start strong today",
      "🌻 Small moments create big growth",
      "🌅 Another beautiful day to guide and grow",
    ],
    afternoon: [
      "🌤️ Hope your day is going smoothly",
      "✨ You're doing great today",
      "🌱 Every little effort matters",
      "💛 Parenting is progress, not perfection",
      "🌼 A few mindful moments can change everything",
      "🌿 You're showing up — that counts",
      "💫 Steady beats perfect every time",
    ],
    evening: [
      "🌙 Good evening, {name}",
      "✨ Let's make tonight a little easier",
      "💜 Time to slow down and reconnect",
      "🌟 Another day of progress",
      "🌙 Small wins deserve celebration",
      "💫 You made it through today",
      "🕯️ Tonight can feel gentler",
    ],
    late_night: [
      "🌌 The day is winding down",
      "🌙 A little calm goes a long way",
      "✨ Rest is productive too",
      "💜 Tomorrow starts with tonight's rest",
      "🌙 Quiet hours are yours now",
    ],
  };

  const timeSubtitles: Record<TimeSlot, string[]> = {
    morning: [
      "A calm start creates a smoother day.",
      "One gentle step at a time.",
      "You've got this — take it at your pace.",
      "Small routines build steady confidence.",
    ],
    afternoon: [
      "You're showing up — that already matters.",
      "Keep breathing; you're doing enough.",
      "Progress often hides in ordinary moments.",
      "A pause now can reset the whole afternoon.",
    ],
    evening: [
      "Tonight can feel lighter than yesterday.",
      "Celebrate what went well, however small.",
      "Connection beats perfection every time.",
      "You've earned a softer pace now.",
    ],
    late_night: [
      "Rest is part of the work you do.",
      "Tomorrow gets easier when tonight feels calm.",
      "You don't have to solve everything tonight.",
      "Quiet moments still count as progress.",
    ],
  };

  timeTitles[slot].forEach((title, i) => {
    timeSubtitles[slot].forEach((subtitle, j) => {
      push(`time:${slot}:${i}:${j}`, title, subtitle, "contextual");
    });
  });

  const weatherTitles: Record<WeatherTone, string[]> = {
    sunny: [
      "☀️ Sunshine makes everything brighter",
      "🌞 Perfect day for outdoor moments",
      "✨ A bright day brings new opportunities",
    ],
    rainy: [
      "🌧️ Cozy indoor moments can be magical",
      "☔ A slower day can be a special day",
      "💜 Rainy days are perfect for connection",
    ],
    cloudy: ["☁️ A gentle day ahead", "🌤️ Every day has its own rhythm"],
    foggy: ["🌫️ Take today one step at a time", "✨ Clarity often comes gradually"],
    neutral: [
      "🌤️ Today has its own gentle rhythm",
      "✨ You're exactly where you need to be",
      "🌿 Meet today with calm curiosity",
    ],
  };

  const weatherSubtitles: Record<WeatherTone, string[]> = {
    sunny: [
      "Let the light set an easy pace today.",
      "Bright skies, steady hearts.",
      "Fresh air can refresh the whole mood.",
    ],
    rainy: [
      "Indoor warmth can feel just as nourishing.",
      "Slow days still hold beautiful moments.",
      "Connection travels well on quiet days.",
    ],
    cloudy: [
      "Soft skies invite a softer pace.",
      "Not every day needs to be loud to matter.",
    ],
    foggy: [
      "One step at a time is enough today.",
      "Gentle clarity often arrives slowly.",
    ],
    neutral: [
      "Meet today with curiosity, not pressure.",
      "Your presence is the anchor your child feels.",
    ],
  };

  weatherTitles[weather].forEach((title, i) => {
    weatherSubtitles[weather].forEach((subtitle, j) => {
      push(`weather:${weather}:${i}:${j}`, title, subtitle, "contextual");
    });
  });

  const weekdayTitles: Record<number, string[]> = {
    1: ["🚀 Let's start the week with confidence"],
    2: ["🌱 Momentum is growing"],
    3: ["⭐ Halfway there"],
    4: ["✨ Small steps still count"],
    5: ["🎉 The weekend is almost here"],
    6: ["🌈 Time for meaningful family moments"],
    0: ["💜 A perfect day to prepare for the week ahead"],
  };

  const weekdaySubtitles: Record<number, string[]> = {
    1: ["Monday courage sets the tone for the week."],
    2: ["Consistency compounds in quiet ways."],
    3: ["You're further along than it may feel."],
    4: ["Steady beats perfect every time."],
    5: ["You've earned a gentler landing soon."],
    6: ["Presence is the best weekend gift."],
    0: ["A little planning tonight can ease tomorrow."],
  };

  (weekdayTitles[day] ?? []).forEach((title, i) => {
    (weekdaySubtitles[day] ?? []).forEach((subtitle, j) => {
      push(`dow:${day}:${i}:${j}`, title, subtitle, "contextual");
    });
  });

  const streak = Math.max(ctx.journeyStreak ?? 0, ctx.routineStreak ?? 0);
  if (streak > 7) {
    push("progress:streak7", "A steady week of showing up", "Your presence is what they feel most.", "progress");
    push("progress:streak7b", "Amy notices your quiet consistency", "Small returns become care over time.", "progress");
  } else if (streak > 3) {
    push("progress:streak3", "A few steady days already", "Small returns count as care.", "progress");
    push("progress:streak3b", "Rhythm is forming gently", "Showing up — even imperfectly — matters.", "progress");
  }

  if (ctx.behaviorLoggedToday === true) {
    push("progress:behavior-yes", "Today’s note is held", "What you shared helps Amy support you.", "progress");
    push("progress:behavior-yes2", "A quiet pattern is taking shape", "Your observations guide the next step.", "progress");
  } else if (ctx.behaviorLoggedToday === false) {
    push("progress:behavior-no", "One small note is enough today", "Only if you want — Amy will remember what you share.", "progress");
    push("progress:behavior-no2", "A gentle observation can help later", "No pressure — share only what feels true.", "progress");
  }

  const inspirationalTitles = [
    "💜 You're doing better than you think",
    "✨ Gentle parenting is strong parenting",
    "🌟 Your child feels your care",
    "🌻 Progress rarely looks linear",
    "💫 Presence beats perfection",
    "🌼 You don't have to do it all today",
    "🌤️ Breathe — you're enough as you are",
    "💛 Small kindnesses ripple outward",
  ];

  const inspirationalSubtitles = [
    "Trust the pace you're already setting.",
    "Warmth lands even on messy days.",
    "Your steadiness is a gift they carry.",
    "Showing up counts, even imperfectly.",
    "Rest and grace belong in your toolkit too.",
    "One connected moment can reset the day.",
    "You're building something lasting, quietly.",
    "Compassion for yourself helps everyone.",
  ];

  inspirationalTitles.forEach((title, i) => {
    inspirationalSubtitles.forEach((subtitle, j) => {
      push(`inspire:${i}:${j}`, title, subtitle, "inspirational");
    });
  });

  return pool;
}

function filterEligible(
  pool: GreetingCandidate[],
  history: StoredGreetingRecord[],
  now: Date,
): GreetingCandidate[] {
  const last = history[0];
  const recentIds = new Set(
    history.filter((h) => isWithinCooldown(h.shownAt, now)).map((h) => h.id),
  );

  return pool.filter((candidate) => {
    if (last?.title === candidate.title) return false;
    if (last?.subtitle === candidate.subtitle) return false;
    if (recentIds.has(candidate.id)) return false;
    return true;
  });
}

function weightedPick(candidates: GreetingCandidate[]): GreetingCandidate {
  const totals = { contextual: 0, progress: 0, inspirational: 0 };
  for (const c of candidates) totals[c.category] += 1;

  const roll = Math.random();
  let target: GreetingCategory = "contextual";
  if (roll < CATEGORY_WEIGHTS.contextual) target = "contextual";
  else if (roll < CATEGORY_WEIGHTS.contextual + CATEGORY_WEIGHTS.progress) target = "progress";
  else target = "inspirational";

  const inCategory = candidates.filter((c) => c.category === target);
  const bucket = inCategory.length > 0 ? inCategory : candidates;
  return bucket[Math.floor(Math.random() * bucket.length)]!;
}

/** Exported for tests — counts unique greeting pairs across time and weather contexts. */
export function countHeroGreetingCombinations(ctx: HeroGreetingContext = {}): number {
  const unique = new Set<string>();
  const sampleTimes = [
    new Date("2026-06-13T07:00:00"),
    new Date("2026-06-13T13:00:00"),
    new Date("2026-06-13T18:00:00"),
    new Date("2026-06-13T23:00:00"),
  ];
  const weatherConditions = ["sunny", "rainy", "cloudy", "foggy", undefined];

  for (const now of sampleTimes) {
    for (const weatherCondition of weatherConditions) {
      const pool = buildCandidatePool({ ...ctx, now, weatherCondition }, now);
      for (const p of pool) unique.add(`${p.title}|||${p.subtitle}`);
    }
  }
  return unique.size;
}

export function generateHeroGreeting(ctx: HeroGreetingContext = {}): HeroGreeting {
  const now = ctx.now ?? new Date();
  const pool = buildCandidatePool(ctx, now);
  const history = readHistory();
  let eligible = filterEligible(pool, history, now);

  if (eligible.length === 0) {
    eligible = pool.filter((c) => c.id !== history[0]?.id);
  }
  if (eligible.length === 0) {
    eligible = pool;
  }

  const picked = weightedPick(eligible);
  const record: StoredGreetingRecord = {
    id: picked.id,
    title: picked.title,
    subtitle: picked.subtitle,
    shownAt: now.toISOString(),
  };
  writeHistory([record, ...history.filter((h) => h.id !== picked.id)]);

  return {
    id: picked.id,
    title: picked.title,
    subtitle: picked.subtitle,
  };
}

/** Stable key for when the greeting should refresh (day + significant weather). */
export function heroGreetingRefreshKey(ctx: Pick<HeroGreetingContext, "weatherCondition" | "now">): string {
  const now = ctx.now ?? new Date();
  return `${getDayKey(now)}:${ctx.weatherCondition ?? "unknown"}`;
}
