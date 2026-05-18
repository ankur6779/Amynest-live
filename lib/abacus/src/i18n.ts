export type AbacusLevelSlug = "numbers" | "addition" | "subtraction" | "multidigit" | "mental";

/** Compatible with i18next `TFunction` (key + optional default / options). */
export type AbacusTranslateFn = (
  key: string | string[],
  defaultValue?: string | Record<string, unknown>,
  options?: Record<string, unknown>,
) => string;

/** Keys in en.json live under `screens.abacus`; UI code uses the `abacus.*` shorthand. */
export const ABACUS_I18N_PREFIX = "screens.abacus";

export const ABACUS_I18N_DEFAULTS: Record<string, string> = {
  loading: "Loading abacus…",
  age_not_eligible: "The Abacus PRO Zone is for kids age 4–10. {{name}} can come back later!",
  step: "Step",
  back: "Back",
  next: "Next",
  amy_voice: "Amy's voice",
  stop_voice: "Stop voice",
  show_on_abacus: "Show on the abacus",
  check: "Check",
  submit: "Submit answer",
  new_problem: "New problem",
  hint: "Hint",
  reset: "Reset",
  correct: "Correct!",
  correct_lower: "correct",
  try_again: "Try again",
  answer_was: "the answer was {{n}}",
  points: "points",
  levels: "levels",
  level_unlocked: "Next level unlocked!",
  need_pct: "Need {{pct}}% to unlock the next level.",
  your_answer: "Your answer",
  mental_intro: "No abacus this time — picture it in your head and answer.",
  tutor_intro: "Stuck on a problem? Ask Amy — she's a kind abacus tutor.",
  tutor_placeholder: "Type your question for Amy…",
  ask_amy: "Ask Amy",
  thinking: "Amy is thinking…",
  label_perfect: "Perfect score!",
  label_great: "Great job!",
  label_good: "Good work!",
  label_keep_going: "Keep practising!",
  mode_learn: "Learn",
  mode_practice: "Practice",
  mode_challenge: "Challenge",
  mode_mental: "Mental",
  mode_tutor: "AI Tutor",
  level_numbers: "Level 1: Numbers",
  level_addition: "Level 2: Addition",
  level_subtraction: "Level 3: Subtraction",
  level_multidigit: "Level 4: Big numbers",
  level_mental: "Level 5: Mental math",
  weekly_leaderboard: "Weekly Leaderboard",
  your_rank: "#{{rank}} of {{total}}",
  no_scores_yet: "No scores yet this week — be the first!",
  you: "you",
  pts: "pts",
};

const LEVEL_SLUGS: readonly AbacusLevelSlug[] = [
  "numbers",
  "addition",
  "subtraction",
  "multidigit",
  "mental",
];

export function isAbacusLevelSlug(slug: string): slug is AbacusLevelSlug {
  return (LEVEL_SLUGS as readonly string[]).includes(slug);
}

/** Map `abacus.step` / `screens.abacus.step` → `screens.abacus.step`. */
export function resolveAbacusI18nKey(key: string): string {
  if (key.startsWith(`${ABACUS_I18N_PREFIX}.`)) return key;
  if (key.startsWith("abacus.")) return `screens.${key}`;
  return `${ABACUS_I18N_PREFIX}.${key}`;
}

type AbacusTranslateOptions = Record<string, unknown> & { defaultValue?: string };

/**
 * Translate an Abacus label. Accepts shorthand keys (`abacus.step`) and resolves
 * them to `screens.abacus.step` where strings are defined in en.json.
 */
export function abacusTranslate(
  t: AbacusTranslateFn,
  key: string,
  defaultOrOptions?: string | AbacusTranslateOptions,
  maybeOptions?: AbacusTranslateOptions,
): string {
  const fullKey = resolveAbacusI18nKey(key);
  const suffix = fullKey.slice(ABACUS_I18N_PREFIX.length + 1);

  let defaultValue: string | undefined;
  let options: AbacusTranslateOptions | undefined;

  if (typeof defaultOrOptions === "string") {
    defaultValue = defaultOrOptions;
    options = maybeOptions;
  } else if (defaultOrOptions && typeof defaultOrOptions === "object") {
    options = defaultOrOptions;
    defaultValue = defaultOrOptions.defaultValue;
  } else {
    options = maybeOptions;
  }

  defaultValue = defaultValue ?? ABACUS_I18N_DEFAULTS[suffix];

  if (options && Object.keys(options).length > 0) {
    return t(fullKey, { defaultValue, ...options });
  }
  return t(fullKey, defaultValue);
}

export function abacusLevelLabelKey(slug: AbacusLevelSlug): string {
  return resolveAbacusI18nKey(`abacus.level_${slug}`);
}

export function abacusLevelLabelDefault(slug: AbacusLevelSlug): string {
  return ABACUS_I18N_DEFAULTS[`level_${slug}`] ?? slug;
}
