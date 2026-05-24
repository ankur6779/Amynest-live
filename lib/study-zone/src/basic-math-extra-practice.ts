// Basic math extras (Class 1–3) — geometry & time/calendar programmatic practice.

import type { Level, SmartQuestion } from "./levels";
import { rng } from "./levels";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

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

function q(
  topicId: string,
  level: Level,
  seq: number,
  text: string,
  answer: string,
  options: string[],
  r: () => number,
  hint?: string,
): SmartQuestion {
  return {
    id: `${topicId}-L${level}-gen-${seq}-${answer.slice(0, 8)}`,
    level,
    subject: topicId as SmartQuestion["subject"],
    q: text,
    options: shuffleInPlace([...options], r),
    answer,
    hint,
  };
}

function genGeometryBasics(level: Level, r: () => number, seq: number): SmartQuestion {
  const maxRoll = level <= 2 ? 2 : 3;
  const roll = pickInt(r, 0, maxRoll);
  if (roll === 0) {
    const shapes = [
      { name: "triangle", sides: "3", corners: "3" },
      { name: "square", sides: "4", corners: "4" },
      { name: "rectangle", sides: "4", corners: "4" },
      { name: "circle", sides: "0", corners: "0" },
    ];
    const s = shapes[pickInt(r, 0, shapes.length - 1)]!;
    if (s.name === "circle") {
      return q("geometry-basics", level, seq, "A circle has ___ corners.", "0",
        ["0", "1", "2", "4"], r, "A circle is round with no corners.");
    }
    return q("geometry-basics", level, seq, `How many sides does a ${s.name} have?`, s.sides,
      shuffleInPlace(["2", "3", "4", "5"], r), r);
  }
  if (roll === 1) {
    const items = [
      { item: "wheel", shape: "Circle" },
      { item: "dice face", shape: "Square" },
      { item: "book cover", shape: "Rectangle" },
      { item: "pizza slice", shape: "Triangle" },
    ];
    const it = items[pickInt(r, 0, items.length - 1)]!;
    return q("geometry-basics", level, seq, `What shape is a ${it.item} like?`, it.shape,
      shuffleInPlace(["Circle", "Square", "Rectangle", "Triangle"], r), r);
  }
  if (roll === 2) {
    return q("geometry-basics", level, seq, "A square has ___ equal sides.", "4",
      ["2", "3", "4", "6"], r);
  }
  const a = pickInt(r, 40, 100);
  const b = pickInt(r, 30, 90);
  const third = 180 - a - b;
  if (third <= 0) return genGeometryBasics(level, r, seq);
  return q("geometry-basics", level, seq,
    `Triangle angles: ${a}° and ${b}°. Third angle?`, `${third}°`,
    shuffleInPlace([`${third}°`, `${third + 10}°`, `${Math.max(0, third - 10)}°`, "90°"], r), r,
    "Angles in a triangle add to 180°.");
}

function genTimeCalendar(level: Level, r: () => number, seq: number): SmartQuestion {
  const maxRoll = level <= 2 ? 2 : 4;
  const roll = pickInt(r, 0, maxRoll);
  if (roll === 0) {
    return q("time-calendar", level, seq, "How many days are in a week?", "7",
      shuffleInPlace(["5", "6", "7", "8"], r), r);
  }
  if (roll === 1) {
    return q("time-calendar", level, seq, "How many months in a year?", "12",
      shuffleInPlace(["10", "11", "12", "13"], r), r);
  }
  if (roll === 2) {
    return q("time-calendar", level, seq, "The short hand on a clock shows?", "Hours",
      shuffleInPlace(["Minutes", "Hours", "Seconds", "Days"], r), r, "Short hand = hour hand.");
  }
  if (roll === 3) {
    const i = pickInt(r, 0, 10);
    const next = MONTHS[i + 1] ?? "January";
    return q("time-calendar", level, seq, `Which month comes after ${MONTHS[i]}?`, next,
      shuffleInPlace([MONTHS[Math.max(0, i - 1)]!, next, MONTHS[Math.min(11, i + 2)]!, MONTHS[(i + 5) % 12]!], r), r);
  }
  const dayIdx = pickInt(r, 0, 5);
  const nextDay = DAYS[dayIdx + 1]!;
  return q("time-calendar", level, seq, `Which day comes after ${DAYS[dayIdx]}?`, nextDay,
    shuffleInPlace([DAYS[Math.max(0, dayIdx - 1)]!, nextDay, DAYS[Math.min(6, dayIdx + 2)]!, "Sunday"], r), r);
}

export const BASIC_MATH_EXTRA_GENERATORS: Record<string, (level: Level, r: () => number, seq: number) => SmartQuestion> = {
  "geometry-basics": genGeometryBasics,
  "time-calendar": genTimeCalendar,
};

export const BASIC_MATH_EXTRA_PRACTICE_SUBJECTS = new Set<string>(Object.keys(BASIC_MATH_EXTRA_GENERATORS));

export function isBasicMathExtraPracticeSubject(id: string): boolean {
  return BASIC_MATH_EXTRA_PRACTICE_SUBJECTS.has(id);
}

export interface BasicMathExtraPickInput {
  level: Level;
  subject: string;
  exclude?: string[] | Set<string>;
  count?: number;
  seed?: number;
}

export function pickBasicMathExtraQuestions(input: BasicMathExtraPickInput): SmartQuestion[] {
  const gen = BASIC_MATH_EXTRA_GENERATORS[input.subject];
  if (!gen) return [];
  const count = Math.max(1, Math.min(20, input.count ?? 5));
  const exclude = input.exclude instanceof Set ? input.exclude : new Set(input.exclude ?? []);
  const baseSeed = input.seed ?? Date.now();
  const rand = rng(baseSeed ^ ((input.level * 0x9e37) + input.subject.length));
  const out: SmartQuestion[] = [];
  const localIds = new Set<string>();
  let attempts = 0;
  const maxAttempts = count * 10 + 20;
  while (out.length < count && attempts < maxAttempts) {
    attempts++;
    const qn = gen(input.level, rand, out.length);
    if (exclude.has(qn.id) || localIds.has(qn.id)) continue;
    localIds.add(qn.id);
    out.push(qn);
  }
  return out;
}

export const BASIC_MATH_EXTRA_PRACTICE_TOPICS: { id: string; title: string; emoji: string }[] = [
  { id: "geometry-basics", title: "Basic Shapes", emoji: "🔷" },
  { id: "time-calendar", title: "Time & Calendar", emoji: "🕐" },
];
