// Smart Study Zone — adaptive 6-level age-band system with country
// localization and a programmatic question dataset (1000+ unique items
// across the 6×6 level/subject grid). Pure helpers, no I/O.

export type Level = 1 | 2 | 3 | 4 | 5 | 6;

export const LEVELS: Level[] = [1, 2, 3, 4, 5, 6];

export interface AgeBand {
  level: Level;
  /** Age range that maps to this level (inclusive). */
  minAge: number;
  maxAge: number;
  label: string;
}

export const AGE_BANDS: AgeBand[] = [
  { level: 1, minAge: 2,  maxAge: 3,  label: "Basic recognition" },
  { level: 2, minAge: 4,  maxAge: 5,  label: "Simple counting & logic" },
  { level: 3, minAge: 6,  maxAge: 7,  label: "Basic operations" },
  { level: 4, minAge: 8,  maxAge: 10, label: "Intermediate math & reasoning" },
  { level: 5, minAge: 11, maxAge: 13, label: "Advanced concepts" },
  { level: 6, minAge: 14, maxAge: 15, label: "Pre-algebra & logic" },
];

/** Map child age (years) to a starting level. Clamps below 2 → 1, above 15 → 6. */
export function levelForAge(ageYears: number): Level {
  if (!Number.isFinite(ageYears)) return 1;
  if (ageYears < 2) return 1;
  for (const b of AGE_BANDS) {
    if (ageYears >= b.minAge && ageYears <= b.maxAge) return b.level;
  }
  return 6;
}

/** Allowed range for adaptive bumping — keeps a 5-year-old from sliding into pre-algebra. */
export function levelRangeForAge(ageYears: number): { min: Level; max: Level } {
  const base = levelForAge(ageYears);
  // Allow bump up by 1 (gifted) and down by 1 (struggling), but never out of the band by more than 1.
  const min = Math.max(1, base - 1) as Level;
  const max = Math.min(6, base + 1) as Level;
  return { min, max };
}

// ─── Country localization ────────────────────────────────────────────────────

export type Country = "IN" | "US" | "UK" | "AU" | "NZ" | "AE" | "DEFAULT";

export interface CountryProfile {
  country: Country;
  currency: string;       // Symbol (₹, $, £, د.إ)
  currencyName: string;   // Plural name (rupees, dollars, pounds, dirhams)
  fruit: string;          // Common fruit
  fruitEmoji: string;
  treat: string;          // School-time snack/treat
  place: string;          // School-area place noun
}

export const COUNTRY_PROFILES: Record<Country, CountryProfile> = {
  IN:      { country: "IN",      currency: "₹",   currencyName: "rupees",  fruit: "mango",  fruitEmoji: "🥭", treat: "laddoo",  place: "school bag" },
  US:      { country: "US",      currency: "$",   currencyName: "dollars", fruit: "apple",  fruitEmoji: "🍎", treat: "cookie",  place: "school bus" },
  UK:      { country: "UK",      currency: "£",   currencyName: "pounds",  fruit: "apple",  fruitEmoji: "🍎", treat: "biscuit", place: "school bus" },
  AU:      { country: "AU",      currency: "$",   currencyName: "dollars", fruit: "apple",  fruitEmoji: "🍎", treat: "cookie",  place: "school bus" },
  NZ:      { country: "NZ",      currency: "$",   currencyName: "dollars", fruit: "apple",  fruitEmoji: "🍎", treat: "cookie",  place: "school bus" },
  AE:      { country: "AE",      currency: "د.إ", currencyName: "dirhams", fruit: "date",   fruitEmoji: "🌴", treat: "date",    place: "mall" },
  DEFAULT: { country: "DEFAULT", currency: "₹",   currencyName: "rupees",  fruit: "mango",  fruitEmoji: "🥭", treat: "laddoo",  place: "school bag" },
};

export function profileFor(country: string | null | undefined): CountryProfile {
  if (!country) return COUNTRY_PROFILES.DEFAULT;
  const key = country.toUpperCase() as Country;
  return COUNTRY_PROFILES[key] ?? COUNTRY_PROFILES.DEFAULT;
}

/** Replace {currency}, {currencyName}, {fruit}, {fruitEmoji}, {treat}, {place} tokens. */
export function localize(text: string, country: string | null | undefined): string {
  const p = profileFor(country);
  return text
    .replace(/\{currency\}/g, p.currency)
    .replace(/\{currencyName\}/g, p.currencyName)
    .replace(/\{fruit\}/g, p.fruit)
    .replace(/\{fruitEmoji\}/g, p.fruitEmoji)
    .replace(/\{treat\}/g, p.treat)
    .replace(/\{place\}/g, p.place);
}

// ─── Subjects ────────────────────────────────────────────────────────────────

export type SmartSubjectId =
  | "addition"
  | "subtraction"
  | "multiplication"
  | "division"
  | "fractions"
  | "word-problems";

export const SMART_SUBJECTS: { id: SmartSubjectId; title: string; emoji: string; blurb: string }[] = [
  { id: "addition",       title: "Addition",       emoji: "➕", blurb: "Putting numbers together." },
  { id: "subtraction",    title: "Subtraction",    emoji: "➖", blurb: "Taking away from a group." },
  { id: "multiplication", title: "Multiplication", emoji: "✖️", blurb: "Adding the same number many times." },
  { id: "division",       title: "Division",       emoji: "➗", blurb: "Sharing equally or splitting." },
  { id: "fractions",      title: "Fractions",      emoji: "🍰", blurb: "Parts of a whole." },
  { id: "word-problems",  title: "Word Problems",  emoji: "📝", blurb: "Real-life maths stories." },
];

export interface SmartQuestion {
  /** Stable id used for anti-repetition tracking. */
  id: string;
  level: Level;
  subject: SmartSubjectId;
  q: string;
  options: string[];
  /** The string value of the correct option (matches one entry in `options`). */
  answer: string;
  hint?: string;
}

// ─── Deterministic RNG ───────────────────────────────────────────────────────

/** Mulberry32 — small, fast, deterministic PRNG for stable per-seed output. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickInt(r: () => number, lo: number, hi: number): number {
  return Math.floor(r() * (hi - lo + 1)) + lo;
}

function shuffleInPlace<T>(arr: T[], r: () => number): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}

function buildOptions(answer: number, r: () => number): string[] {
  // Three near-distractors (±1, ±2) plus the correct answer; clamp to ≥0.
  const set = new Set<number>([answer]);
  const offsets = [1, -1, 2, -2, 3, -3];
  shuffleInPlace(offsets, r);
  for (const o of offsets) {
    if (set.size >= 4) break;
    const v = answer + o;
    if (v >= 0) set.add(v);
  }
  const opts = Array.from(set).map(String);
  return shuffleInPlace(opts, r);
}

// ─── Per-subject question generators ─────────────────────────────────────────
// Each generator returns ONE question. The per-level numeric ranges follow the
// spec: L1 counting, L2 single-digit, L3 two-digit, L4 mid-three-digit/×÷,
// L5 algebraic/percent, L6 mixed-operation/fractions.

function genAddition(level: Level, r: () => number, country: string): SmartQuestion {
  let a: number, b: number;
  switch (level) {
    case 1: a = pickInt(r, 1, 3);   b = 0;                           break; // counting
    case 2: a = pickInt(r, 1, 5);   b = pickInt(r, 1, 5);            break;
    case 3: a = pickInt(r, 6, 19);  b = pickInt(r, 1, 9);            break;
    case 4: a = pickInt(r, 20, 89); b = pickInt(r, 11, 30);          break;
    case 5: a = pickInt(r, 100, 499); b = pickInt(r, 50, 250);       break;
    case 6: a = pickInt(r, 500, 999); b = pickInt(r, 100, 499);      break;
  }
  const ans = a + b;
  if (level === 1) {
    const q = localize(`Count ${a} ${a === 1 ? "{fruit}" : "{fruit}s"} {fruitEmoji}`, country);
    return {
      id: `add-L1-count-${a}-${country}`,
      level, subject: "addition", q,
      options: shuffleInPlace([String(a), String(a + 1), String(Math.max(0, a - 1))], r),
      answer: String(a),
    };
  }
  return {
    id: `add-L${level}-${a}-${b}`,
    level, subject: "addition",
    q: `${a} + ${b} = ?`,
    options: buildOptions(ans, r),
    answer: String(ans),
    hint: `Count ${a}, then ${b} more.`,
  };
}

function genSubtraction(level: Level, r: () => number, country: string): SmartQuestion {
  let a: number, b: number;
  switch (level) {
    case 1: { a = pickInt(r, 2, 5);   const x = pickInt(r, 1, a); b = x; break; }
    case 2: { a = pickInt(r, 5, 10);  b = pickInt(r, 1, a);             break; }
    case 3: { a = pickInt(r, 10, 30); b = pickInt(r, 1, 9);             break; }
    case 4: { a = pickInt(r, 50, 199); b = pickInt(r, 10, 49);          break; }
    case 5: { a = pickInt(r, 200, 599); b = pickInt(r, 50, 199);        break; }
    case 6: { a = pickInt(r, 600, 999); b = pickInt(r, 100, 499);       break; }
  }
  const ans = a - b;
  if (level === 1) {
    const q = localize(`Which is bigger? ${a} or ${b}`, country);
    const big = Math.max(a, b);
    return {
      id: `sub-L1-bigger-${a}-${b}`,
      level, subject: "subtraction", q,
      options: shuffleInPlace([String(a), String(b)], r),
      answer: String(big),
    };
  }
  return {
    id: `sub-L${level}-${a}-${b}`,
    level, subject: "subtraction",
    q: `${a} - ${b} = ?`,
    options: buildOptions(ans, r),
    answer: String(ans),
    hint: `Take ${b} away from ${a}.`,
  };
}

function genMultiplication(level: Level, r: () => number, country: string): SmartQuestion {
  let a: number, b: number;
  switch (level) {
    case 1: case 2: { a = pickInt(r, 1, 3); b = pickInt(r, 1, 3); break; }
    case 3: { a = pickInt(r, 2, 5);   b = pickInt(r, 2, 5);   break; }
    case 4: { a = pickInt(r, 3, 9);   b = pickInt(r, 3, 9);   break; }
    case 5: { a = pickInt(r, 6, 15);  b = pickInt(r, 3, 12);  break; }
    case 6: { a = pickInt(r, 11, 25); b = pickInt(r, 6, 15);  break; }
  }
  const ans = a * b;
  return {
    id: `mul-L${level}-${a}x${b}`,
    level, subject: "multiplication",
    q: `${a} × ${b} = ?`,
    options: buildOptions(ans, r),
    answer: String(ans),
    hint: `Add ${a} a total of ${b} times.`,
  };
}

function genDivision(level: Level, r: () => number, country: string): SmartQuestion {
  // Build divisible pairs so the answer is always an integer.
  let b: number, ans: number;
  switch (level) {
    case 1: case 2: { b = pickInt(r, 1, 2); ans = pickInt(r, 1, 3); break; }
    case 3: { b = pickInt(r, 2, 5);   ans = pickInt(r, 2, 5);   break; }
    case 4: { b = pickInt(r, 2, 9);   ans = pickInt(r, 3, 12);  break; }
    case 5: { b = pickInt(r, 3, 12);  ans = pickInt(r, 4, 15);  break; }
    case 6: { b = pickInt(r, 4, 15);  ans = pickInt(r, 8, 25);  break; }
  }
  const a = b * ans;
  return {
    id: `div-L${level}-${a}/${b}`,
    level, subject: "division",
    q: `${a} ÷ ${b} = ?`,
    options: buildOptions(ans, r),
    answer: String(ans),
    hint: `Share ${a} into ${b} equal groups.`,
  };
}

function genFractions(level: Level, r: () => number, country: string): SmartQuestion {
  // L1-L3 → identification; L4+ → arithmetic on fractions.
  if (level <= 3) {
    const denom = pickInt(r, 2, 4);
    const numer = 1;
    const q = localize(`What fraction is shown when you cut a {treat} into ${denom} equal parts and take ${numer}?`, country);
    const correct = `${numer}/${denom}`;
    const distractors = [`${numer}/${denom + 1}`, `${denom}/${numer + denom}`, `${numer + 1}/${denom}`];
    return {
      id: `frac-L${level}-id-${numer}-${denom}-${country}`,
      level, subject: "fractions", q,
      options: shuffleInPlace([correct, ...distractors], r),
      answer: correct,
      hint: "Numerator over denominator — top is the parts you take.",
    };
  }
  // L4-L6: add two fractions with common denominator (keep math kid-friendly).
  const denom = level === 6 ? pickInt(r, 4, 8) : pickInt(r, 2, 6);
  const a = pickInt(r, 1, denom - 1);
  const b = pickInt(r, 1, denom - a);
  const sum = a + b;
  // Reduce sum/denom.
  function gcd(x: number, y: number): number { return y === 0 ? x : gcd(y, x % y); }
  const g = gcd(sum, denom);
  const ans = `${sum / g}/${denom / g}`;
  const distractors = [
    `${sum}/${denom * 2}`,
    `${a + b}/${a + denom}`,
    `${sum + 1}/${denom}`,
  ];
  return {
    id: `frac-L${level}-add-${a}-${b}-${denom}`,
    level, subject: "fractions",
    q: `${a}/${denom} + ${b}/${denom} = ?`,
    options: shuffleInPlace([ans, ...distractors], r),
    answer: ans,
    hint: "Same denominator → add the tops, keep the bottom.",
  };
}

function genWordProblems(level: Level, r: () => number, country: string): SmartQuestion {
  switch (level) {
    case 1:
    case 2: {
      const n = pickInt(r, 2, 6);
      const q = localize(`Anya has ${n} {fruit}s {fruitEmoji}. How many {fruit}s does Anya have?`, country);
      return {
        id: `wp-L${level}-count-${n}-${country}`,
        level, subject: "word-problems", q,
        options: shuffleInPlace([String(n), String(n + 1), String(Math.max(0, n - 1))], r),
        answer: String(n),
      };
    }
    case 3: {
      const a = pickInt(r, 5, 15);
      const b = pickInt(r, 2, 9);
      const ans = a + b;
      const q = localize(`Ravi has ${a} {fruit}s. His friend gives him ${b} more. How many {fruit}s now?`, country);
      return {
        id: `wp-L3-add-${a}-${b}-${country}`,
        level, subject: "word-problems", q,
        options: buildOptions(ans, r),
        answer: String(ans),
        hint: `Add ${a} and ${b}.`,
      };
    }
    case 4: {
      const price = pickInt(r, 5, 25);
      const qty = pickInt(r, 3, 8);
      const ans = price * qty;
      const q = localize(`A {treat} costs ${price} {currencyName}. How much for ${qty} {treat}s?`, country);
      return {
        id: `wp-L4-cost-${price}-${qty}-${country}`,
        level, subject: "word-problems", q,
        options: buildOptions(ans, r),
        answer: String(ans),
        hint: `Multiply ${price} by ${qty}.`,
      };
    }
    case 5: {
      const total = pickInt(r, 50, 200);
      const pct = [10, 20, 25, 50][pickInt(r, 0, 3)]!;
      const ans = Math.round((total * pct) / 100);
      const q = localize(`A {place} has ${total} {fruit}s. ${pct}% are ripe. How many ripe {fruit}s?`, country);
      return {
        id: `wp-L5-pct-${total}-${pct}-${country}`,
        level, subject: "word-problems", q,
        options: buildOptions(ans, r),
        answer: String(ans),
        hint: `Find ${pct}% of ${total}.`,
      };
    }
    case 6: {
      // Two-step problem.
      const each = pickInt(r, 6, 15);
      const groups = pickInt(r, 3, 8);
      const extra = pickInt(r, 5, 30);
      const ans = each * groups + extra;
      const q = localize(`${groups} kids each pack ${each} {treat}s, then add ${extra} extra. Total?`, country);
      return {
        id: `wp-L6-2step-${each}-${groups}-${extra}-${country}`,
        level, subject: "word-problems", q,
        options: buildOptions(ans, r),
        answer: String(ans),
        hint: `First ${each} × ${groups}, then add ${extra}.`,
      };
    }
  }
}

const GENERATORS: Record<SmartSubjectId, (l: Level, r: () => number, c: string) => SmartQuestion> = {
  "addition":       genAddition,
  "subtraction":    genSubtraction,
  "multiplication": genMultiplication,
  "division":       genDivision,
  "fractions":      genFractions,
  "word-problems":  genWordProblems,
};

// ─── Public entry: pick adaptive batch ───────────────────────────────────────

export interface PickInput {
  level: Level;
  subject: SmartSubjectId;
  country?: string | null;
  /** Question ids the child has already seen — used for anti-repetition. */
  exclude?: string[] | Set<string>;
  count?: number;
  /** Deterministic seed (e.g. Date.now() at request time). */
  seed?: number;
}

/**
 * Returns up to `count` adaptive, country-localized, non-repeated questions
 * for the requested (level, subject). Uses the programmatic generators which
 * have effectively unlimited variety per (level, subject) — when the seen-set
 * grows large the generator simply reseeds and tries more candidates.
 */
export function pickAdaptiveQuestions(input: PickInput): SmartQuestion[] {
  const count = Math.max(1, Math.min(20, input.count ?? 5));
  const country = (input.country ?? "DEFAULT").toUpperCase();
  const exclude = input.exclude instanceof Set
    ? input.exclude
    : new Set(input.exclude ?? []);
  const baseSeed = input.seed ?? Date.now();
  const r = rng(baseSeed ^ ((input.level * 0x9e37) + input.subject.length));
  const gen = GENERATORS[input.subject];
  const out: SmartQuestion[] = [];
  const localIds = new Set<string>();
  // Up to ~8× attempts before giving up (still returns whatever we got).
  const maxAttempts = count * 8 + 16;
  let attempts = 0;
  while (out.length < count && attempts < maxAttempts) {
    attempts++;
    const q = gen(input.level, r, country);
    if (exclude.has(q.id) || localIds.has(q.id)) continue;
    localIds.add(q.id);
    out.push(q);
  }
  return out;
}

// ─── Adaptive level bumping ──────────────────────────────────────────────────

export interface BumpInput {
  currentLevel: Level;
  ageYears: number;
  /** Most recent results, oldest → newest. Only the trailing window is examined. */
  recentResults: boolean[];
}

/**
 * Adaptive rule: 3 consecutive corrects → +1, 2 consecutive wrongs → −1,
 * clamped to the child's allowed `levelRangeForAge`.
 */
export function bumpLevel(input: BumpInput): Level {
  const range = levelRangeForAge(input.ageYears);
  const cur = Math.min(range.max, Math.max(range.min, input.currentLevel)) as Level;
  const tail = input.recentResults.slice(-3);
  if (tail.length >= 3 && tail.every((x) => x)) {
    return Math.min(range.max, (cur + 1) as Level) as Level;
  }
  const wrongTail = input.recentResults.slice(-2);
  if (wrongTail.length >= 2 && wrongTail.every((x) => !x)) {
    return Math.max(range.min, (cur - 1) as Level) as Level;
  }
  return cur;
}
