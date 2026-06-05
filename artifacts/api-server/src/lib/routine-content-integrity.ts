/**
 * Presentation-layer content integrity — titles, notes, and explanations only.
 * Does not modify timing, scheduling, validators, or engine decisions.
 */
import type { AgeGroup } from "./routine-templates.js";
import {
  isSleepItem,
  parseTimeToMins,
  type RoutineScheduleItem,
} from "./routine-scheduler.js";

export type ContentIntegrityOpts = {
  sleepMins: number;
  wakeMins?: number;
  ageGroup?: AgeGroup;
};

const GENERIC_PLAY_TITLE_RE =
  /\b(play\s+time|puzzles?\s+or\s+calm\s+games?|calm\s+play(?:\s+together)?|creative\s+(?:play|project)|quiet\s+indoor\s+play|indoor\s+creative\s+play|building\s+blocks\s+play|adventure\s+time|outdoor\s+play|family\s+outing)\b/i;

const PACK_BAG_RE =
  /\b(pack\s+(school\s+)?bag|pack\s+backpack|verify\s+books)\b/i;
const LAY_OUT_CLOTHES_RE = /\blay\s+out\s+clothes\b/i;
const LAY_OUT_UNIFORM_RE =
  /\blay\s+out\s+(uniform|socks|shoes)|saves\s+\d+\s+morning\s+minutes\b/i;
const EVENING_PREP_RE =
  /\b(evening\s+prep|tidy\s+(room|space)|organize\s+materials|prepare\s+(school\s+materials|for\s+tomorrow))\b/i;
const AUTONOMY_NOTES_RE = /\bautonomy:/i;
const INDEPENDENCE_NOTES_RE =
  /\b(independence\s+task|child-led\s+steps|get\s+ready\s+on\s+your\s+own|self[- ]?care)\b/i;

const MEAL_NOTES_RE =
  /\b(breakfast|oatmeal|idli|sambar|khichdi|warm\s+milk|fruit\s+mash|soaked\s+nuts|morning\s+meal|proper\s+(morning\s+)?meal|meal\s+options?|steamed\s+vegetables|fruit\b|includes\s+a\s+proper\s+morning\s+meal)\b/i;

const GENERIC_EXPLANATION_RE =
  /\b(added\s+to\s+keep\s+the\s+day\s+flowing\s+naturally|keeps\s+the\s+day\s+flowing|smooth\s+transition|balanced\s+routine|healthy\s+rhythm|balances\s+the\s+day\s+with\s+varied\s+activity\s+types)\b/i;

const CODING_TITLE_RE =
  /\b(coding\s*&\s*logic\s+puzzles?|scratch|code\.org|computational\s+thinking)\b/i;

const PRESCHOOL_AGE_GROUPS = new Set<AgeGroup>(["infant", "toddler", "preschool"]);

const ENV_AQI_HEADLINE_RE =
  /\bair\s+quality\s+is\s+(good|moderate|unhealthy|very\s+poor|poor)[^.]*\.?/gi;
const ENV_AQI_ACTION_RES: Array<{ re: RegExp; bullet: string }> = [
  {
    re: /\b(prefer\s+indoor\s+play|stay\s+indoors|indoor\s+play\s+keeps\s+lungs)\b/i,
    bullet: "Prefer indoor play",
  },
  {
    re: /\b(limit\s+outdoor\s+time|aim\s+for\s+about\s+(\d+)\s+minutes?\s+outside|keep\s+outdoor\s+sessions\s+shorter)\b/i,
    bullet: "Limit outdoor time",
  },
  {
    re: /\b(offer\s+water|hydration|sip\s+water)\b/i,
    bullet: "Encourage hydration",
  },
  {
    re: /\b(use\s+(a\s+)?mask|use\s+protection)\b/i,
    bullet: "Use protection if going outside",
  },
  {
    re: /\b(check\s+local\s+air\s+quality)\b/i,
    bullet: "Check local air quality updates",
  },
  {
    re: /\b(avoid\s+heavy\s+running|lighter\s+activity)\b/i,
    bullet: "Keep outdoor activity light",
  },
  {
    re: /\b(prefer\s+light\s+walking|calm\s+play)\b/i,
    bullet: "Prefer light walking or calm play",
  },
  {
    re: /\b(hot\s+day|afternoon\s+heat|heat\s+protection|stay\s+indoors.*sip\s+water)\b/i,
    bullet: "Stay cool and hydrated",
  },
  {
    re: /\b(windy\s+day|weather\s+is\s+not\s+suitable|cozy\s+indoor)\b/i,
    bullet: "Choose indoor options when weather is challenging",
  },
];

function combinedText(item: RoutineScheduleItem): string {
  return [item.activity, item.notes ?? "", item.meal ?? ""].filter(Boolean).join(" ");
}

function isMealBlock(item: RoutineScheduleItem): boolean {
  const cat = (item.category ?? "").toLowerCase();
  if (cat === "meal" || cat === "tiffin" || cat === "feeding") return true;
  if (item.meal) return true;
  if (/\b(breakfast|lunch|dinner|wake-up\s+nutrition|morning\s+meal|snack|refuel)\b/i.test(item.activity)) {
    return true;
  }
  return false;
}

function isPrepPurpose(text: string, item: RoutineScheduleItem): boolean {
  if (
    item.culturalTag === "autonomy_evening" ||
    item.culturalTag === "autonomy_morning" ||
    item.activityMeta?.autonomyFriendly
  ) {
    return true;
  }
  return (
    PACK_BAG_RE.test(text) ||
    LAY_OUT_CLOTHES_RE.test(text) ||
    LAY_OUT_UNIFORM_RE.test(text) ||
    EVENING_PREP_RE.test(text) ||
    AUTONOMY_NOTES_RE.test(text) ||
    INDEPENDENCE_NOTES_RE.test(text)
  );
}

function prepTitleFromText(text: string): string | null {
  if (PACK_BAG_RE.test(text)) return "Pack school bag";
  if (LAY_OUT_UNIFORM_RE.test(text)) return "School prep";
  if (LAY_OUT_CLOTHES_RE.test(text)) return "Tomorrow ready";
  if (EVENING_PREP_RE.test(text) || AUTONOMY_NOTES_RE.test(text)) {
    return "Evening preparation";
  }
  if (INDEPENDENCE_NOTES_RE.test(text)) return "Get ready on your own";
  return null;
}

function isPlayLikeTitle(activity: string): boolean {
  return GENERIC_PLAY_TITLE_RE.test(activity);
}

function isTrulyPlayful(item: RoutineScheduleItem): boolean {
  const text = combinedText(item);
  if (isPrepPurpose(text, item)) return false;
  if (isMealBlock(item) && MEAL_NOTES_RE.test(text)) return true;
  const cat = (item.category ?? "").toLowerCase();
  if (cat === "meal" || cat === "school" || cat === "sleep") return false;
  if (/\b(outdoor|park|cricket|soccer|puzzle|craft|drawing|building)\b/i.test(text) && !isPrepPurpose(text, item)) {
    return true;
  }
  return !isPrepPurpose(text, item) && !MEAL_NOTES_RE.test(text);
}

/** Derive display title from activity purpose, autonomy, bedtime, school-prep, and meal context. */
export function resolveSemanticDisplayTitle(
  item: RoutineScheduleItem,
): string {
  const text = combinedText(item);
  const prepTitle = prepTitleFromText(text);

  if (prepTitle && (isPlayLikeTitle(item.activity) || isPrepPurpose(text, item))) {
    return prepTitle;
  }

  if (prepTitle && !isTrulyPlayful(item)) {
    return prepTitle;
  }

  return item.activity;
}

/** Meal notes override play-like titles. */
export function resolveMealDisplayTitle(item: RoutineScheduleItem): string {
  const notes = item.notes ?? "";
  const hasMealSignal =
    isMealBlock(item) ||
    MEAL_NOTES_RE.test(notes) ||
    MEAL_NOTES_RE.test(item.activity) ||
    Boolean(item.meal);

  if (!hasMealSignal || !isPlayLikeTitle(item.activity)) {
    return item.activity;
  }

  const clock = parseTimeToMins(item.time);
  if (clock < 8 * 60) return "Wake-up Nutrition";
  if (clock < 11 * 60) return "Breakfast";
  if (clock < 14 * 60) return "Morning meal";
  if (/\bfamily\b/i.test(item.activity)) return "Family breakfast";
  return "Breakfast";
}

const PRESCHOOL_CODING_REPLACEMENTS: Array<{ re: RegExp; label: string }> = [
  { re: /\bcoding\s*&\s*logic\s+puzzles?\b/i, label: "Problem-solving games" },
  { re: /\bscratch\b/i, label: "Pattern play" },
  { re: /\bcode\.org\b/i, label: "Building challenges" },
  { re: /\bcomputational\s+thinking\b/i, label: "Thinking games" },
  { re: /\bsudoku\b/i, label: "Number puzzles" },
  { re: /\blogic\s+grid\s+puzzles?\b/i, label: "Pattern puzzles" },
];

/** Presentation-only age banding for study/coding labels. */
export function validateAgeAppropriatePresentation(
  activity: string,
  ageGroup?: AgeGroup,
): string {
  if (!ageGroup || !PRESCHOOL_AGE_GROUPS.has(ageGroup)) return activity;
  if (!CODING_TITLE_RE.test(activity)) return activity;

  let result = activity;
  for (const { re, label } of PRESCHOOL_CODING_REPLACEMENTS) {
    result = result.replace(re, label);
  }
  return result.trim();
}

function isBedtimeZone(clockMins: number, sleepMins: number): boolean {
  return clockMins >= sleepMins - 90 && clockMins < sleepMins;
}

const BEDTIME_INAPPROPRIATE_TITLE_RE =
  /\b(play\s+time|adventure\s+time|outdoor\s+play|creative\s+project|family\s+outing)\b/i;

/** Final 90 minutes before sleep — calm, prep-appropriate labels only. */
export function normalizeBedtimeDisplayTitles(
  item: RoutineScheduleItem,
  sleepMins: number,
): string {
  const clock = parseTimeToMins(item.time);
  if (!isBedtimeZone(clock, sleepMins) || isSleepItem(item)) {
    return item.activity;
  }

  const text = combinedText(item);
  const prepTitle = prepTitleFromText(text);
  if (prepTitle) return prepTitle;

  if (BEDTIME_INAPPROPRIATE_TITLE_RE.test(item.activity) && !isTrulyPlayful(item)) {
    if (/\bpack\b/i.test(text)) return "Tomorrow ready";
    if (/\b(uniform|school)\b/i.test(text)) return "School prep";
    if (/\b(tidy|organize|prep)\b/i.test(text)) return "Evening preparation";
    return "Calm play";
  }

  if (isPlayLikeTitle(item.activity) && !isTrulyPlayful(item)) {
    return prepTitleFromText(text) ?? "Calm play";
  }

  return item.activity;
}

function extractAqiHeadline(notes: string): string | null {
  const matches = [...notes.matchAll(ENV_AQI_HEADLINE_RE)];
  if (matches.length === 0) return null;
  const first = matches[0]![0].trim().replace(/\s+/g, " ");
  if (/unhealthy|very\s+poor|poor/i.test(first)) {
    return "Air quality is unhealthy today.";
  }
  if (/moderate/i.test(first)) {
    return "Air quality is moderate today.";
  }
  return "Air quality is good today.";
}

function extractOutdoorLimitMins(notes: string): number | null {
  const m = notes.match(/aim\s+for\s+about\s+(\d+)\s+minutes?\s+outside/i);
  return m ? Number(m[1]) : null;
}

/** Merge duplicate AQI, weather, hydration, and heat messages into one block. */
export function deduplicateEnvironmentalAdvice(notes: string | undefined): string | undefined {
  if (!notes?.trim()) return notes;

  const hasEnv =
    ENV_AQI_HEADLINE_RE.test(notes) ||
    ENV_AQI_ACTION_RES.some(({ re }) => re.test(notes));
  if (!hasEnv) return notes;

  const nonEnvParts: string[] = [];
  const sentences = notes.split(/(?<=[.!?])\s+/).filter(Boolean);
  for (const sentence of sentences) {
    const isEnv =
      ENV_AQI_HEADLINE_RE.test(sentence) ||
      ENV_AQI_ACTION_RES.some(({ re }) => re.test(sentence)) ||
      /\b(melatonin\s+window|dim\s+lights)\b/i.test(sentence);
    if (!isEnv) {
      nonEnvParts.push(sentence.trim());
    }
  }

  const bullets = new Set<string>();
  const headline = extractAqiHeadline(notes);
  const limitMins = extractOutdoorLimitMins(notes);

  for (const { re, bullet } of ENV_AQI_ACTION_RES) {
    if (re.test(notes)) {
      if (bullet === "Limit outdoor time" && limitMins != null) {
        bullets.add(`Limit outdoor time to ${limitMins} minutes`);
      } else {
        bullets.add(bullet);
      }
    }
  }

  if (bullets.size === 0 && !headline) {
    return notes;
  }

  const envBlock = [
    headline,
    ...[...bullets].map((b) => `• ${b}`),
  ]
    .filter(Boolean)
    .join("\n");

  const remainder = nonEnvParts.join(" ").trim();
  if (!remainder) return envBlock;
  return `${remainder} · ${envBlock.replace(/\n/g, " ")}`;
}

function findNextMealMins(
  items: RoutineScheduleItem[],
  index: number,
): number | null {
  for (let i = index + 1; i < items.length; i++) {
    const it = items[i]!;
    if (isMealBlock(it)) return parseTimeToMins(it.time);
  }
  return null;
}

function findPrevStudyIndex(items: RoutineScheduleItem[], index: number): boolean {
  for (let i = index - 1; i >= 0; i--) {
    const it = items[i]!;
    const cat = (it.category ?? "").toLowerCase();
    if (cat === "study" || /\b(homework|study|coding|logic|revision)\b/i.test(it.activity)) {
      return true;
    }
    if (isMealBlock(it)) break;
  }
  return false;
}

function findNextDinnerMins(
  items: RoutineScheduleItem[],
  index: number,
): number | null {
  for (let i = index + 1; i < items.length; i++) {
    const it = items[i]!;
    if (/\bdinner\b/i.test(it.activity) || (it.category ?? "").toLowerCase() === "meal" && parseTimeToMins(it.time) >= 17 * 60) {
      return parseTimeToMins(it.time);
    }
  }
  return null;
}

/** Replace repeated generic filler explanations with contextual copy. */
export class ExplanationDiversityGuard {
  private seenGenerics = new Map<string, number>();

  contextualize(
    notes: string | undefined,
    item: RoutineScheduleItem,
    index: number,
    allItems: RoutineScheduleItem[],
  ): string | undefined {
    if (!notes?.trim() || !GENERIC_EXPLANATION_RE.test(notes)) {
      return notes;
    }

    const key = notes.trim().toLowerCase();
    const count = (this.seenGenerics.get(key) ?? 0) + 1;
    this.seenGenerics.set(key, count);

    const clock = parseTimeToMins(item.time);
    const nextMeal = findNextMealMins(allItems, index);
    const nextDinner = findNextDinnerMins(allItems, index);
    const afterStudy = findPrevStudyIndex(allItems, index);

    let replacement: string;
    if (nextMeal != null && nextMeal - clock <= 90 && nextMeal - clock > 0) {
      replacement = "Provides movement before the next meal.";
    } else if (afterStudy) {
      replacement = "Offers a mental reset after focused learning.";
    } else if (nextDinner != null && nextDinner - clock <= 120 && nextDinner - clock > 0) {
      replacement = "Creates a calm transition into the evening.";
    } else if (clock < 12 * 60) {
      replacement = "Keeps the morning rhythm engaging.";
    } else if (clock < 17 * 60) {
      replacement = "Adds variety to the afternoon flow.";
    } else {
      replacement = "Supports a gentle wind-down toward bedtime.";
    }

    if (count > 1) {
      const variants = [
        replacement,
        "Fills a natural pause with something meaningful.",
        "Adds balance between busier parts of the day.",
      ];
      return variants[(count - 1) % variants.length]!;
    }

    return replacement;
  }
}

export function applyContentIntegrityToItem(
  item: RoutineScheduleItem,
  opts: ContentIntegrityOpts,
  guard: ExplanationDiversityGuard,
  index: number,
  allItems: RoutineScheduleItem[],
): { item: RoutineScheduleItem; changed: boolean; adjustments: string[] } {
  const adjustments: string[] = [];
  const originalActivity = item.activity;
  let working = { ...item };

  const mealTitle = resolveMealDisplayTitle(working);
  if (mealTitle !== working.activity) {
    adjustments.push(`meal title: ${working.activity} → ${mealTitle}`);
    working = { ...working, activity: mealTitle };
  }

  const semanticTitle = resolveSemanticDisplayTitle(working);
  if (semanticTitle !== working.activity) {
    adjustments.push(`semantic title: ${working.activity} → ${semanticTitle}`);
    working = { ...working, activity: semanticTitle };
  }

  const ageTitle = validateAgeAppropriatePresentation(working.activity, opts.ageGroup);
  if (ageTitle !== working.activity) {
    adjustments.push(`age label: ${working.activity} → ${ageTitle}`);
    working = { ...working, activity: ageTitle };
  }

  const bedtimeTitle = normalizeBedtimeDisplayTitles(working, opts.sleepMins);
  if (bedtimeTitle !== working.activity) {
    adjustments.push(`bedtime title: ${working.activity} → ${bedtimeTitle}`);
    working = { ...working, activity: bedtimeTitle };
  }

  let notes = deduplicateEnvironmentalAdvice(working.notes);
  notes = guard.contextualize(notes, working, index, allItems);

  const changed = working.activity !== originalActivity || notes !== item.notes;
  if (!changed) {
    return { item, changed: false, adjustments };
  }

  return {
    item: { ...working, notes },
    changed: true,
    adjustments,
  };
}

/** Full presentation pass — safe to run after scheduling and validation. */
export function applyRoutineContentIntegrity(
  items: RoutineScheduleItem[],
  opts: ContentIntegrityOpts,
): { items: RoutineScheduleItem[]; adjustments: string[] } {
  const guard = new ExplanationDiversityGuard();
  const adjustments: string[] = [];
  const sorted = [...items].sort(
    (a, b) => parseTimeToMins(a.time) - parseTimeToMins(b.time),
  );
  const indexByRef = new Map<RoutineScheduleItem, number>();
  sorted.forEach((it, i) => indexByRef.set(it, i));

  const out = items.map((item) => {
    const index = indexByRef.get(item) ?? 0;
    const result = applyContentIntegrityToItem(
      item,
      opts,
      guard,
      index,
      sorted,
    );
    adjustments.push(...result.adjustments);
    return result.item;
  });

  return { items: out, adjustments };
}
