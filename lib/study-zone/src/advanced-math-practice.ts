// Advanced math (Class 6–10) — programmatic practice question generators.
// Complements basic math generators in levels.ts and static pools in topic-practice.ts.

import type { Level, SmartQuestion } from "./levels";
import { rng } from "./levels";

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

function buildNumericOptions(answer: number, r: () => number): string[] {
  const set = new Set<number>([answer]);
  for (const o of [1, -1, 2, -2, 3, -3, 5, -5]) {
    if (set.size >= 4) break;
    const v = answer + o;
    if (Number.isFinite(v)) set.add(v);
  }
  return shuffleInPlace(Array.from(set).map(String), r);
}

function q(
  topicId: string,
  level: Level,
  seq: number,
  text: string,
  answer: string,
  options: string[],
  hint?: string,
): SmartQuestion {
  return {
    id: `${topicId}-L${level}-gen-${seq}-${answer}`,
    level,
    subject: topicId as SmartQuestion["subject"],
    q: text,
    options: shuffleInPlace([...options], () => Math.random()),
    answer,
    hint,
  };
}

function genAlgebraBasics(level: Level, r: () => number, seq: number): SmartQuestion {
  if (level <= 4) {
    const a = pickInt(r, 1, 12);
    const sum = pickInt(r, a + 1, 20);
    const ans = sum - a;
    return q("algebra-basics", level, seq, `Solve x + ${a} = ${sum}`, String(ans), buildNumericOptions(ans, r), `Subtract ${a} from both sides.`);
  }
  if (level === 5) {
    const coef = pickInt(r, 2, 5);
    const ans = pickInt(r, 2, 9);
    const rhs = coef * ans;
    return q("algebra-basics", level, seq, `If ${coef}x = ${rhs}, then x = ?`, String(ans), buildNumericOptions(ans, r), `Divide both sides by ${coef}.`);
  }
  const a = pickInt(r, 2, 6);
  const b = pickInt(r, 1, 8);
  const c = pickInt(r, 5, 20);
  const ans = (c - b) / a;
  const ansInt = Number.isInteger(ans) ? ans : pickInt(r, 2, 5);
  const rhs = a * ansInt + b;
  return q("algebra-basics", level, seq, `${a}x + ${b} = ${rhs}  →  x = ?`, String(ansInt), buildNumericOptions(ansInt, r), "Isolate x step by step.");
}

function genLinearEquations(level: Level, r: () => number, seq: number): SmartQuestion {
  const roll = pickInt(r, 0, 3);
  if (roll === 0) {
    return q("linear-equations", level, seq, "In y = mx + c, what is 'm'?", "slope", shuffleInPlace(["y-intercept", "slope", "constant", "variable"], r), "m is the gradient.");
  }
  if (roll === 1) {
    const m = pickInt(r, 1, 5);
    const c = pickInt(r, 1, 9);
    return q("linear-equations", level, seq, `In y = ${m}x + ${c}, the y-intercept is?`, String(c), buildNumericOptions(c, r));
  }
  const a = pickInt(r, 2, 5);
  const b = pickInt(r, 1, 7);
  const ans = pickInt(r, 2, 8);
  const rhs = a * ans + b;
  return q("linear-equations", level, seq, `Solve: ${a}x + ${b} = ${rhs}`, String(ans), buildNumericOptions(ans, r), "Get x alone.");
}

function genQuadraticEquations(level: Level, r: () => number, seq: number): SmartQuestion {
  const roll = pickInt(r, 0, 2);
  if (roll === 0) {
    return q("quadratic-equations", level, seq, "General form of a quadratic equation?", "ax²+bx+c=0", shuffleInPlace(["ax+b=0", "ax²+bx+c=0", "x²=0", "ax³+b=0"], r));
  }
  if (roll === 1) {
    return q("quadratic-equations", level, seq, "Graph of a quadratic equation is called?", "Parabola", shuffleInPlace(["Hyperbola", "Parabola", "Ellipse", "Circle"], r));
  }
  // Factorisable: (x-p)(x-q)=0
  const p = pickInt(r, 1, 5);
  const qv = pickInt(r, 1, 5);
  const sum = p + qv;
  const prod = p * qv;
  return q(
    "quadratic-equations", level, seq,
    `Roots of x² − ${sum}x + ${prod} = 0?`,
    `${p} and ${qv}`,
    shuffleInPlace([`${p} and ${qv}`, `${p + 1} and ${qv}`, `${p} and ${qv + 1}`, "0 and 0"], r),
    "Factor the quadratic.",
  );
}

function genGeometryTriangles(level: Level, r: () => number, seq: number): SmartQuestion {
  const roll = pickInt(r, 0, 2);
  if (roll === 0) {
    return q("geometry-triangles", level, seq, "Sum of angles in a triangle?", "180°", shuffleInPlace(["90°", "180°", "270°", "360°"], r));
  }
  if (roll === 1) {
    return q("geometry-triangles", level, seq, "Triangle with all sides equal?", "Equilateral", shuffleInPlace(["Scalene", "Isosceles", "Equilateral", "Right"], r));
  }
  const a = pickInt(r, 30, 80);
  const b = pickInt(r, 30, 80);
  const third = 180 - a - b;
  if (third <= 0) return genGeometryTriangles(level, r, seq);
  return q("geometry-triangles", level, seq, `Two angles are ${a}° and ${b}°, the third is?`, `${third}°`, shuffleInPlace([`${third}°`, `${third + 10}°`, `${third - 10}°`, "90°"], r), "Angles in a triangle sum to 180°.");
}

function genMensuration(level: Level, r: () => number, seq: number): SmartQuestion {
  const roll = pickInt(r, 0, 2);
  if (roll === 0) {
    const l = pickInt(r, 3, 12);
    const b = pickInt(r, 2, 10);
    const area = l * b;
    return q("mensuration", level, seq, `Area of a rectangle with l=${l}, b=${b}?`, String(area), buildNumericOptions(area, r), "Area = length × breadth.");
  }
  if (roll === 1) {
    const side = pickInt(r, 3, 10);
    const perim = 4 * side;
    return q("mensuration", level, seq, `Perimeter of a square with side ${side}?`, String(perim), buildNumericOptions(perim, r));
  }
  return q("mensuration", level, seq, "Area of circle formula?", "πr²", shuffleInPlace(["2πr", "πr²", "πd", "4πr"], r));
}

function genTrigonometryBasics(level: Level, r: () => number, seq: number): SmartQuestion {
  const roll = pickInt(r, 0, 3);
  const table: Record<number, { q: string; a: string; opts: string[] }> = {
    0: { q: "sin 30° = ?", a: "1/2", opts: ["0", "1/2", "√3/2", "1"] },
    1: { q: "tan 45° = ?", a: "1", opts: ["0", "1/2", "1", "√3"] },
    2: { q: "cos 0° = ?", a: "1", opts: ["0", "1/2", "1", "√3/2"] },
    3: { q: "opposite / hypotenuse = ?", a: "sin", opts: ["sin", "cos", "tan", "cot"] },
  };
  const t = table[roll]!;
  return q("trigonometry-basics", level, seq, t.q, t.a, shuffleInPlace(t.opts, r), "Remember SOH-CAH-TOA.");
}

function genStatisticsBasics(level: Level, r: () => number, seq: number): SmartQuestion {
  const roll = pickInt(r, 0, 2);
  if (roll === 0) {
    const a = pickInt(r, 1, 6);
    const b = pickInt(r, 2, 8);
    const c = pickInt(r, 3, 10);
    const mean = Math.round((a + b + c) / 3 * 10) / 10;
    const meanStr = Number.isInteger(mean) ? String(mean) : mean.toFixed(1);
    return q("statistics-basics", level, seq, `Mean of ${a}, ${b}, ${c} = ?`, meanStr, buildNumericOptions(Number(meanStr), r), "Add all values and divide by count.");
  }
  if (roll === 1) {
    return q("statistics-basics", level, seq, "Median of 1, 3, 5, 7, 9 = ?", "5", shuffleInPlace(["3", "5", "7", "4"], r), "Middle value when ordered.");
  }
  return q("statistics-basics", level, seq, "Mode of 2, 3, 3, 5, 3 = ?", "3", shuffleInPlace(["2", "3", "5", "4"], r), "Most frequent value.");
}

export const ADVANCED_MATH_GENERATORS: Record<string, (level: Level, r: () => number, seq: number) => SmartQuestion> = {
  "algebra-basics": genAlgebraBasics,
  "linear-equations": genLinearEquations,
  "quadratic-equations": genQuadraticEquations,
  "geometry-triangles": genGeometryTriangles,
  mensuration: genMensuration,
  "trigonometry-basics": genTrigonometryBasics,
  "statistics-basics": genStatisticsBasics,
};

export const ADVANCED_MATH_PRACTICE_SUBJECTS = new Set<string>(Object.keys(ADVANCED_MATH_GENERATORS));

export function isAdvancedMathPracticeSubject(id: string): boolean {
  return ADVANCED_MATH_PRACTICE_SUBJECTS.has(id);
}

export interface AdvancedMathPickInput {
  level: Level;
  subject: string;
  exclude?: string[] | Set<string>;
  count?: number;
  seed?: number;
}

export function pickAdvancedMathQuestions(input: AdvancedMathPickInput): SmartQuestion[] {
  const gen = ADVANCED_MATH_GENERATORS[input.subject];
  if (!gen) return [];
  const count = Math.max(1, Math.min(20, input.count ?? 5));
  const exclude = input.exclude instanceof Set ? input.exclude : new Set(input.exclude ?? []);
  const baseSeed = input.seed ?? Date.now();
  const r = rng(baseSeed ^ ((input.level * 0x9e37) + input.subject.length));
  const out: SmartQuestion[] = [];
  const localIds = new Set<string>();
  let attempts = 0;
  const maxAttempts = count * 10 + 20;
  while (out.length < count && attempts < maxAttempts) {
    attempts++;
    const qn = gen(input.level, r, out.length);
    if (exclude.has(qn.id) || localIds.has(qn.id)) continue;
    localIds.add(qn.id);
    out.push(qn);
  }
  return out;
}

/** UI metadata for advanced adaptive practice picker. */
export const ADVANCED_MATH_PRACTICE_TOPICS: { id: string; title: string; emoji: string }[] = [
  { id: "algebra-basics", title: "Algebra Basics", emoji: "🔤" },
  { id: "linear-equations", title: "Linear Equations", emoji: "📈" },
  { id: "quadratic-equations", title: "Quadratic Equations", emoji: "〰️" },
  { id: "geometry-triangles", title: "Triangles", emoji: "📐" },
  { id: "mensuration", title: "Mensuration", emoji: "📏" },
  { id: "trigonometry-basics", title: "Trigonometry", emoji: "📊" },
  { id: "statistics-basics", title: "Statistics", emoji: "📉" },
];

/** Practice topics shown in Smart Adaptive picker, by study mode. */
export function getPracticePickerTopics(mode: "basic" | "advanced"): { id: string; title: string; emoji: string }[] {
  if (mode === "advanced") return ADVANCED_MATH_PRACTICE_TOPICS;
  return [
    { id: "addition", title: "Addition", emoji: "➕" },
    { id: "subtraction", title: "Subtraction", emoji: "➖" },
    { id: "multiplication", title: "Multiplication", emoji: "✖️" },
    { id: "division", title: "Division", emoji: "➗" },
    { id: "fractions", title: "Fractions", emoji: "🍰" },
    { id: "word-problems", title: "Word Problems", emoji: "📝" },
    { id: "geometry-basics", title: "Basic Shapes", emoji: "🔷" },
    { id: "time-calendar", title: "Time & Calendar", emoji: "🕐" },
  ];
}
