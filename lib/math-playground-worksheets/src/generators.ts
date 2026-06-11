import { seededRandom } from "@workspace/math-playground";
import type { ObjectKind, WorksheetLevel, WorksheetProblem } from "@workspace/math-playground";

const OBJECT_KINDS: ObjectKind[] = ["apple", "star", "flower", "block", "toy", "cookie"];

function randInt(rng: () => number, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

function pickKind(rng: () => number): ObjectKind {
  return OBJECT_KINDS[Math.floor(rng() * OBJECT_KINDS.length)] ?? "apple";
}

function levelRange(level: WorksheetLevel): [number, number] {
  switch (level) {
    case 1:
      return [1, 5];
    case 2:
      return [3, 10];
    case 3:
      return [6, 15];
    case 4:
      return [10, 20];
    default:
      return [1, 5];
  }
}

function distractors(rng: () => number, answer: number, count: number): number[] {
  const choices = new Set<number>([answer]);
  while (choices.size < count + 1) {
    const delta = randInt(rng, -3, 3) || 1;
    choices.add(Math.max(0, answer + delta));
  }
  return [...choices].sort((a, b) => a - b);
}

export function generateCountingProblems(
  seed: number,
  level: WorksheetLevel,
  count: number,
): WorksheetProblem[] {
  const rng = seededRandom(seed);
  const [min, max] = levelRange(level);
  const problems: WorksheetProblem[] = [];

  for (let i = 0; i < count; i++) {
    const n = randInt(rng, min, max);
    const kind = pickKind(rng);
    const variant = i % 3;

    if (variant === 0) {
      problems.push({
        id: `count-${seed}-${i}`,
        type: "count_objects",
        promptKey: "ws_count_objects",
        promptParams: { count: n, objects: kind },
        answer: n,
        visual: { objectKind: kind, objectCount: n },
      });
    } else if (variant === 1) {
      problems.push({
        id: `circle-${seed}-${i}`,
        type: "circle_number",
        promptKey: "ws_circle_number",
        promptParams: { count: n },
        answer: n,
        choices: distractors(rng, n, 3),
        visual: { objectKind: kind, objectCount: n },
      });
    } else {
      problems.push({
        id: `match-${seed}-${i}`,
        type: "match_quantity",
        promptKey: "ws_match_quantity",
        promptParams: { count: n },
        answer: n,
        choices: distractors(rng, n, 3),
        visual: { objectKind: kind, objectCount: n },
      });
    }
  }

  return problems;
}

export function generateAdditionProblems(
  seed: number,
  level: WorksheetLevel,
  count: number,
): WorksheetProblem[] {
  const rng = seededRandom(seed + 11);
  const [min, max] = levelRange(level);
  const problems: WorksheetProblem[] = [];

  for (let i = 0; i < count; i++) {
    const a = randInt(rng, min, max);
    const b = randInt(rng, min, max);
    const sum = a + b;
    const kind = pickKind(rng);
    const variant = i % 3;

    if (variant === 0) {
      problems.push({
        id: `add-vis-${seed}-${i}`,
        type: "visual_addition",
        promptKey: "ws_visual_addition",
        promptParams: { a, b, objects: kind },
        answer: sum,
        visual: { objectKind: kind, objectCount: a, groups: 2, perGroup: b },
      });
    } else if (variant === 1) {
      problems.push({
        id: `add-num-${seed}-${i}`,
        type: "number_addition",
        promptKey: "ws_number_addition",
        promptParams: { a, b },
        answer: sum,
      });
    } else {
      const missing = rng() > 0.5 ? a : b;
      const known = missing === a ? b : a;
      problems.push({
        id: `add-miss-${seed}-${i}`,
        type: "missing_addend",
        promptKey: "ws_missing_addend",
        promptParams: { known, sum, missingSide: missing === a ? "first" : "second" },
        answer: missing,
        choices: distractors(rng, missing, 3),
      });
    }
  }

  return problems;
}

export function generateSubtractionProblems(
  seed: number,
  level: WorksheetLevel,
  count: number,
): WorksheetProblem[] {
  const rng = seededRandom(seed + 22);
  const [min, max] = levelRange(level);
  const problems: WorksheetProblem[] = [];

  for (let i = 0; i < count; i++) {
    const a = randInt(rng, min + 2, max + 5);
    const b = randInt(rng, min, Math.min(max, a - 1));
    const diff = a - b;
    const kind = pickKind(rng);

    if (i % 2 === 0) {
      problems.push({
        id: `sub-cross-${seed}-${i}`,
        type: "cross_out_subtract",
        promptKey: "ws_cross_out",
        promptParams: { total: a, remove: b, objects: kind },
        answer: diff,
        visual: { objectKind: kind, objectCount: a },
      });
    } else {
      problems.push({
        id: `sub-rem-${seed}-${i}`,
        type: "find_remaining",
        promptKey: "ws_find_remaining",
        promptParams: { a, b },
        answer: diff,
      });
    }
  }

  return problems;
}

export function generateMultiplicationProblems(
  seed: number,
  level: WorksheetLevel,
  count: number,
): WorksheetProblem[] {
  const rng = seededRandom(seed + 33);
  const maxGroup = level <= 2 ? 3 : level === 3 ? 5 : 8;
  const problems: WorksheetProblem[] = [];

  for (let i = 0; i < count; i++) {
    const groups = randInt(rng, 2, maxGroup);
    const perGroup = randInt(rng, 2, maxGroup);
    const product = groups * perGroup;
    const kind = pickKind(rng);
    const variant = i % 3;

    if (variant === 0) {
      problems.push({
        id: `mul-grp-${seed}-${i}`,
        type: "groups_multiply",
        promptKey: "ws_groups_multiply",
        promptParams: { groups, each: perGroup, objects: kind },
        answer: product,
        visual: { objectKind: kind, objectCount: perGroup, groups, perGroup },
      });
    } else if (variant === 1) {
      problems.push({
        id: `mul-arr-${seed}-${i}`,
        type: "array_multiply",
        promptKey: "ws_array_multiply",
        promptParams: { groups, each: perGroup },
        answer: product,
      });
    } else {
      problems.push({
        id: `mul-rep-${seed}-${i}`,
        type: "repeated_addition",
        promptKey: "ws_repeated_addition",
        promptParams: { groups, each: perGroup },
        answer: product,
      });
    }
  }

  return problems;
}

export function generateDivisionProblems(
  seed: number,
  level: WorksheetLevel,
  count: number,
): WorksheetProblem[] {
  const rng = seededRandom(seed + 44);
  const maxGroup = level <= 2 ? 3 : level === 3 ? 5 : 8;
  const problems: WorksheetProblem[] = [];

  for (let i = 0; i < count; i++) {
    const recipients = randInt(rng, 2, maxGroup);
    const each = randInt(rng, 2, maxGroup);
    const total = recipients * each;
    const kind = pickKind(rng);
    const variant = i % 3;

    if (variant === 0) {
      problems.push({
        id: `div-share-${seed}-${i}`,
        type: "sharing_division",
        promptKey: "ws_sharing",
        promptParams: { total, children: recipients, objects: kind },
        answer: each,
        visual: { objectKind: kind, objectCount: total, groups: recipients, perGroup: each },
      });
    } else if (variant === 1) {
      problems.push({
        id: `div-grp-${seed}-${i}`,
        type: "grouping_division",
        promptKey: "ws_grouping",
        promptParams: { total, groupSize: each },
        answer: recipients,
      });
    } else {
      problems.push({
        id: `div-eq-${seed}-${i}`,
        type: "equal_distribution",
        promptKey: "ws_equal_share",
        promptParams: { total, recipients },
        answer: each,
      });
    }
  }

  return problems;
}

export function generatePatternProblems(
  seed: number,
  level: WorksheetLevel,
  count: number,
): WorksheetProblem[] {
  const rng = seededRandom(seed + 55);
  const step = level <= 1 ? 1 : level === 2 ? 2 : level === 3 ? 3 : 5;
  const problems: WorksheetProblem[] = [];

  for (let i = 0; i < count; i++) {
    const start = randInt(rng, 1, 10);
    const seq = [start, start + step, start + step * 2, null];
    const answer = start + step * 3;
    const variant = i % 3;

    if (variant === 0) {
      problems.push({
        id: `pat-seq-${seed}-${i}`,
        type: "complete_sequence",
        promptKey: "ws_complete_sequence",
        promptParams: { seq: seq.filter((v) => v !== null).join(", ") },
        answer,
        choices: distractors(rng, answer, 3),
      });
    } else if (variant === 1) {
      problems.push({
        id: `pat-miss-${seed}-${i}`,
        type: "missing_pattern",
        promptKey: "ws_missing_pattern",
        promptParams: { before: start + step, after: start + step * 3 },
        answer: start + step * 2,
        choices: distractors(rng, start + step * 2, 3),
      });
    } else {
      problems.push({
        id: `pat-cont-${seed}-${i}`,
        type: "continue_pattern",
        promptKey: "ws_continue_pattern",
        promptParams: { step },
        answer,
        choices: distractors(rng, answer, 3),
      });
    }
  }

  return problems;
}
