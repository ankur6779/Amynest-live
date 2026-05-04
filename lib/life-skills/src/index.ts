// ─── Life Skills Mode — shared data + helpers ────────────────────────────────
// Used by both web (artifacts/kidschedule) and mobile (artifacts/amynest-mobile).
// Pure data, no platform deps. English-only.

export type LifeSkillLang = "en";

export type LifeSkillAgeBand = "toddler" | "preschool" | "kid" | "teen";

export type LifeSkillCategory =
  | "hygiene"
  | "social"
  | "responsibility"
  | "emotional"
  | "money"
  | "time"
  | "self_care"
  | "chores";

export type LifeSkillDifficulty = "easy" | "medium" | "hard";

export interface LocalizedText { en: string }

export interface LifeSkillTask {
  id: string;
  ageBand: LifeSkillAgeBand;
  category: LifeSkillCategory;
  difficulty: LifeSkillDifficulty;
  title: LocalizedText;
  description: LocalizedText;
  parentTip: LocalizedText;
}

// ─── Age band helper ──────────────────────────────────────────────────────────
export function ageBandForLifeSkills(ageYears: number): LifeSkillAgeBand {
  if (ageYears <= 4) return "toddler";
  if (ageYears <= 6) return "preschool";
  if (ageYears <= 10) return "kid";
  return "teen";
}

export function ageBandLabel(band: LifeSkillAgeBand, _lang: LifeSkillLang = "en"): string {
  const map: Record<LifeSkillAgeBand, string> = {
    toddler:   "2–4 yrs",
    preschool: "5–6 yrs",
    kid:       "7–10 yrs",
    teen:      "11–15 yrs",
  };
  return map[band];
}

// ─── Categories ───────────────────────────────────────────────────────────────
export const CATEGORY_EMOJI: Record<LifeSkillCategory, string> = {
  hygiene: "🧼",
  social: "🤝",
  responsibility: "📋",
  emotional: "💗",
  money: "💰",
  time: "⏰",
  self_care: "🧴",
  chores: "🧹",
};

export const CATEGORY_LABEL: Record<LifeSkillCategory, LocalizedText> = {
  hygiene:        { en: "Hygiene" },
  social:         { en: "Social" },
  responsibility: { en: "Responsibility" },
  emotional:      { en: "Emotional" },
  money:          { en: "Money" },
  time:           { en: "Time" },
  self_care:      { en: "Self-care" },
  chores:         { en: "Chores" },
};

export const POINTS_BY_DIFFICULTY: Record<LifeSkillDifficulty, number> = {
  easy: 5,
  medium: 10,
  hard: 15,
};

export const DIFFICULTY_LABEL: Record<LifeSkillDifficulty, LocalizedText> = {
  easy:   { en: "Easy" },
  medium: { en: "Medium" },
  hard:   { en: "Hard" },
};

// ─── Task bank ────────────────────────────────────────────────────────────────
const T = (
  id: string,
  ageBand: LifeSkillAgeBand,
  category: LifeSkillCategory,
  difficulty: LifeSkillDifficulty,
  title: LocalizedText,
  description: LocalizedText,
  parentTip: LocalizedText,
): LifeSkillTask => ({ id, ageBand, category, difficulty, title, description, parentTip });

export const LIFE_SKILL_TASKS: LifeSkillTask[] = [
  // ── TODDLER (2–4) ─────────────────────────────────────────────────────────
  T("tod-hyg-1", "toddler", "hygiene", "easy",
    { en: "Wash your hands before eating", },
    { en: "Use soap and rinse for 20 seconds before any meal.", },
    { en: "Sing a short song with them while they wash — makes it fun.", }),
  T("tod-self-1", "toddler", "self_care", "easy",
    { en: "Eat your meal yourself", },
    { en: "Try eating with a spoon without help today.", },
    { en: "Spills are okay! Praise effort, not neatness.", }),
  T("tod-resp-1", "toddler", "responsibility", "easy",
    { en: "Put your toys back in the box", },
    { en: "After playing, put every toy back where it belongs.", },
    { en: "Clean up alongside them — they copy what you do.", }),
  T("tod-soc-1", "toddler", "social", "easy",
    { en: "Say 'please' and 'thank you'", },
    { en: "Use these magic words at every meal today.", },
    { en: "Model it yourself — children mirror your manners.", }),
  T("tod-emo-1", "toddler", "emotional", "easy",
    { en: "Name your feeling", },
    { en: "Point to a face emoji that matches how you feel.", },
    { en: "Reflect back: 'You feel happy, that's wonderful.'", }),
  T("tod-hyg-2", "toddler", "hygiene", "medium",
    { en: "Brush your teeth twice today", },
    { en: "Once after waking up, once before sleep.", },
    { en: "Brush yours alongside theirs — make it a duet.", }),

  // ── PRESCHOOL (5–6) ──────────────────────────────────────────────────────
  T("pre-self-1", "preschool", "self_care", "easy",
    { en: "Dress yourself today", },
    { en: "Pick out and put on your own clothes without help.", },
    { en: "Lay out 2 outfit choices — gives autonomy without overwhelm.", }),
  T("pre-soc-1", "preschool", "social", "easy",
    { en: "Share a toy with someone", },
    { en: "Pick one toy and let a friend or sibling play with it.", },
    { en: "Use a timer to make sharing fair: '5 mins each'.", }),
  T("pre-resp-1", "preschool", "responsibility", "easy",
    { en: "Follow a 3-step instruction", },
    { en: "Example: 'Pick up the cup, take it to the kitchen, put it in the sink.'", },
    { en: "Give instructions slowly and let them repeat back.", }),
  T("pre-emo-1", "preschool", "emotional", "medium",
    { en: "Talk about something that made you happy", },
    { en: "Share one happy moment from today at dinner.", },
    { en: "Share yours first — it makes them feel safe to open up.", }),
  T("pre-chr-1", "preschool", "chores", "easy",
    { en: "Help set the dinner table", },
    { en: "Place spoons, plates, or napkins — your choice.", },
    { en: "Praise the help, not the perfection.", }),
  T("pre-hyg-1", "preschool", "hygiene", "easy",
    { en: "Take a bath without resistance", },
    { en: "Get in, scrub, rinse — all in good cheer today.", },
    { en: "Add a fun bath toy or song to make it pleasant.", }),

  // ── KID (7–10) ───────────────────────────────────────────────────────────
  T("kid-time-1", "kid", "time", "medium",
    { en: "Pack your school bag yourself", },
    { en: "Check the timetable and pack everything for tomorrow.", },
    { en: "Make a small checklist they tick off the first few times.", }),
  T("kid-resp-1", "kid", "responsibility", "medium",
    { en: "Finish homework before screen time", },
    { en: "Complete all assignments before any TV/phone today.", },
    { en: "Sit nearby quietly — your presence is calming, not policing.", }),
  T("kid-money-1", "kid", "money", "medium",
    { en: "Save 2 coins in a jar today", },
    { en: "Drop any 2 small coins into your savings jar.", },
    { en: "Talk about what they're saving for — connect saving to a goal.", }),
  T("kid-chr-1", "kid", "chores", "medium",
    { en: "Make your bed in the morning", },
    { en: "Straighten the sheet, fluff the pillow, fold the blanket.", },
    { en: "Don't redo their work — celebrate their version.", }),
  T("kid-soc-1", "kid", "social", "easy",
    { en: "Greet 3 family members today", },
    { en: "Look in their eyes and say 'Good morning' or 'How are you?'", },
    { en: "Eye contact is a key skill — don't rush it.", }),
  T("kid-hyg-1", "kid", "hygiene", "easy",
    { en: "Trim and clean your nails", },
    { en: "Check both hands and feet today.", },
    { en: "Help with tools, but let them do the inspection.", }),

  // ── TEEN (11–15) ─────────────────────────────────────────────────────────
  T("teen-time-1", "teen", "time", "hard",
    { en: "Plan tomorrow in 5 minutes", },
    { en: "Write down top 3 tasks for tomorrow before bed.", },
    { en: "Don't critique their list — discuss only if they ask.", }),
  T("teen-resp-1", "teen", "responsibility", "hard",
    { en: "Make one decision independently today", },
    { en: "Pick one small choice (meal, outfit, activity) and own it.", },
    { en: "Even if you disagree — let it stand. Confidence is built here.", }),
  T("teen-money-1", "teen", "money", "medium",
    { en: "Track today's spending", },
    { en: "Note every rupee you spend today in a notes app.", },
    { en: "Review together at week-end without judgement.", }),
  T("teen-emo-1", "teen", "emotional", "medium",
    { en: "Take 5 deep breaths when frustrated", },
    { en: "Pause before reacting — try this once today.", },
    { en: "Practice it yourself out loud sometimes — they notice.", }),
  T("teen-soc-1", "teen", "social", "medium",
    { en: "Help someone without being asked", },
    { en: "Spot one chance to help at home or school today.", },
    { en: "Notice and name it: 'I saw what you did, that was kind.'", }),
  T("teen-self-1", "teen", "self_care", "medium",
    { en: "Sleep on time today", },
    { en: "Be in bed by your target time — phone away 30 mins before.", },
    { en: "Model it yourself. No screens at the dinner table either.", }),
];

// ─── Pickers ──────────────────────────────────────────────────────────────────
export function tasksFor(ageBand: LifeSkillAgeBand): LifeSkillTask[] {
  return LIFE_SKILL_TASKS.filter((t) => t.ageBand === ageBand);
}

function dateSeed(date: string, key: string | number): number {
  let h = 0;
  const s = `${date}|${key}`;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Pick the day's tasks. Deterministic per (date, child). Tries to vary
 *  category from yesterday's pick when `previousIds` are provided. */
export function pickDailyLifeSkillTasks(opts: {
  ageBand: LifeSkillAgeBand;
  date: string;
  childKey: string | number;
  count?: number;
  previousIds?: string[];
}): LifeSkillTask[] {
  const { ageBand, date, childKey, count = 2, previousIds = [] } = opts;
  const pool = tasksFor(ageBand);
  if (pool.length === 0) return [];
  const seed = dateSeed(date, childKey);
  // Order pool by a seeded shuffle; deprioritize tasks done in the prior set.
  const annotated = pool.map((t, i) => ({
    t,
    score: ((seed + i * 31) ^ (Math.imul(seed, i + 7))) & 0x7fffffff,
    recent: previousIds.includes(t.id) ? 1 : 0,
  }));
  annotated.sort((a, b) => a.recent - b.recent || a.score - b.score);
  const picks: LifeSkillTask[] = [];
  const seenCats = new Set<LifeSkillCategory>();
  for (const { t } of annotated) {
    if (picks.length >= count) break;
    if (!seenCats.has(t.category)) {
      picks.push(t);
      seenCats.add(t.category);
    }
  }
  // Fill if categories ran out.
  for (const { t } of annotated) {
    if (picks.length >= count) break;
    if (!picks.find((p) => p.id === t.id)) picks.push(t);
  }
  return picks.slice(0, count);
}

// ─── Insight & guidance helpers ───────────────────────────────────────────────
export interface CategoryStat { done: number; skipped: number }

export function buildAmyLifeSkillInsight(
  byCategory: Partial<Record<LifeSkillCategory, CategoryStat>>,
  childName: string,
  lang: LifeSkillLang = "en",
): string {
  const entries = (Object.entries(byCategory) as [LifeSkillCategory, CategoryStat | undefined][])
    .filter(([, v]) => (v?.done ?? 0) + (v?.skipped ?? 0) >= 1)
    .map(([c, v]) => ({ c, done: v!.done, total: v!.done + v!.skipped }));
  if (entries.length === 0) {
    const t: LocalizedText = {
      en: `${childName} hasn't started any life skill tasks yet. Tap one above to begin!`,
    };
    return t[lang];
  }
  entries.sort((a, b) => (b.done / Math.max(1, b.total)) - (a.done / Math.max(1, a.total)));
  const best = entries[0]!;
  const bestLabel = CATEGORY_LABEL[best.c][lang];
  const t: LocalizedText = {
    en: `${childName} is improving in ${bestLabel} — keep up the daily practice!`,
  };
  return t[lang];
}

// ─── Tiny UI dictionary used by both web + mobile components ─────────────────
export const UI_LABELS = {
  sectionTitle:  { en: "Life Skills Mode" },
  sectionDesc:   { en: "Daily real-life skills for ages 2–15", },
  todayTitle:    { en: "Today's Life Skills" },
  markDone:      { en: "Mark Done" },
  skip:          { en: "Skip" },
  done:          { en: "Done" },
  skipped:       { en: "Skipped" },
  parentTip:     { en: "Parent Tip" },
  amyInsight:    { en: "Amy AI Insight" },
  category:      { en: "Category" },
  difficulty:    { en: "Difficulty" },
  points:        { en: "Points" },
  totalPoints:   { en: "Total Points" },
  progressByCat: { en: "Progress by Category" },
  language:      { en: "Language" },
  noneToday:     { en: "All today's skills are done. Come back tomorrow!", },
  dayStreak:     { en: "day streak" },
  best:          { en: "best" },
  rolePlayTitle: { en: "Role-play this skill" },
  show:          { en: "Show" },
  hide:          { en: "Hide" },
  noScenarios:   { en: "No scenarios yet." },
} as const satisfies Record<string, LocalizedText>;

export type UILabelKey = keyof typeof UI_LABELS;

export function uiLabel(key: UILabelKey, _lang: LifeSkillLang = "en"): string {
  return UI_LABELS[key].en;
}

// ─── Streak & weekly bar helpers ─────────────────────────────────────────────
// Pure functions used by both client + server so the streak math is
// guaranteed identical no matter who computes it.

/** Format a Date as YYYY-MM-DD in local time. */
export function formatLifeSkillDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDays(d: Date, n: number): Date {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
}

/**
 * Compute the current consecutive-day streak ending today (or yesterday if
 * the user hasn't logged anything yet today). Any day with ≥ 1 completed
 * skill counts. A gap of even one day resets the streak.
 *
 * `dates` may contain duplicates and ordering doesn't matter.
 */
export function computeLifeSkillStreak(
  dates: readonly string[],
  today: Date = new Date(),
): { current: number; best: number } {
  const set = new Set<string>();
  for (const raw of dates) {
    if (typeof raw === "string" && raw.length >= 10) set.add(raw.slice(0, 10));
  }
  if (set.size === 0) return { current: 0, best: 0 };

  // Best streak — scan sorted dates and count longest consecutive run.
  const sorted = Array.from(set).sort();
  let best = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]! + "T00:00:00");
    const cur = new Date(sorted[i]! + "T00:00:00");
    const diff = Math.round((cur.getTime() - prev.getTime()) / 86_400_000);
    if (diff === 1) {
      run += 1;
      if (run > best) best = run;
    } else {
      run = 1;
    }
  }

  // Current streak — count back from today (or yesterday if no entry today).
  const todayKey = formatLifeSkillDate(today);
  const yKey = formatLifeSkillDate(addDays(today, -1));
  let cursor: Date;
  if (set.has(todayKey)) cursor = new Date(today);
  else if (set.has(yKey)) cursor = addDays(today, -1);
  else return { current: 0, best };

  let current = 0;
  while (set.has(formatLifeSkillDate(cursor))) {
    current += 1;
    cursor = addDays(cursor, -1);
  }
  return { current, best };
}

/**
 * Return the last 7 calendar days (oldest first) flagged by whether any
 * skill was completed that day. Drives the weekly progress bar UI.
 */
export function buildLifeSkillWeeklyBar(
  dates: readonly string[],
  today: Date = new Date(),
): Array<{ date: string; completed: boolean }> {
  const set = new Set<string>();
  for (const raw of dates) {
    if (typeof raw === "string" && raw.length >= 10) set.add(raw.slice(0, 10));
  }
  const out: Array<{ date: string; completed: boolean }> = [];
  for (let i = 6; i >= 0; i--) {
    const d = formatLifeSkillDate(addDays(today, -i));
    out.push({ date: d, completed: set.has(d) });
  }
  return out;
}

// ─── Role-play scenarios ─────────────────────────────────────────────────────
// One scenario per age band so caregivers always have a concrete prompt
// they can act out with the child after finishing today's skill.

export interface RolePlayScenario {
  id: string;
  ageBand: LifeSkillAgeBand;
  title: LocalizedText;
  setup: LocalizedText;
  childLine: LocalizedText;
  parentPrompt: LocalizedText;
}

export const ROLE_PLAY_SCENARIOS: RolePlayScenario[] = [
  {
    id: "rp-tod-1",
    ageBand: "toddler",
    title: {
      en: "Sharing the snack",
    },
    setup: {
      en: "Pretend two stuffed animals both want the same biscuit.",
    },
    childLine: {
      en: "Say: 'Let's share — one piece for you, one for me!'",
    },
    parentPrompt: {
      en: "Praise the moment they break the biscuit themselves.",
    },
  },
  {
    id: "rp-pre-1",
    ageBand: "preschool",
    title: {
      en: "Asking for help politely",
    },
    setup: {
      en: "Pretend the child can't reach a toy on a high shelf.",
    },
    childLine: {
      en: "Say: 'Excuse me, can you please help me reach the toy?'",
    },
    parentPrompt: {
      en: "Model both polite and rude versions — let them pick the better one.",
    },
  },
  {
    id: "rp-kid-1",
    ageBand: "kid",
    title: {
      en: "Asking for the bill at a shop",
    },
    setup: {
      en: "You're the shopkeeper, they're buying notebooks worth ₹120.",
    },
    childLine: {
      en: "Say: 'Bhaiya, kitne hue? Can I have the bill please?'",
    },
    parentPrompt: {
      en: "Hand back the right change — let them count it before pocketing.",
    },
  },
  {
    id: "rp-teen-1",
    ageBand: "teen",
    title: {
      en: "Saying no to a friend's bad idea",
    },
    setup: {
      en: "Pretend a friend wants them to skip class to hang out.",
    },
    childLine: {
      en: "Say: 'Not today — I have a test tomorrow. Let's plan for Sunday.'",
    },
    parentPrompt: {
      en: "Discuss why a firm but friendly 'no' protects both their goals and the friendship.",
    },
  },
];

export function rolePlaysFor(ageBand: LifeSkillAgeBand): RolePlayScenario[] {
  return ROLE_PLAY_SCENARIOS.filter((s) => s.ageBand === ageBand);
}
