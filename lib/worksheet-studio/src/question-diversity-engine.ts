import type { QuestionType } from "./types.js";
import { shuffleInPlace, dedupePrompts, randomizeOptions } from "./pagination.js";
import { getLpsStandard } from "./lps-standards.js";
import type { WorksheetClass, WorksheetDifficulty } from "./types.js";

export interface DiverseQuestionTemplate {
  type: QuestionType;
  prompt: string;
  options?: string[];
  emoji?: string;
  label?: string;
  answerLine?: boolean;
}

const ACTIVITY_ROTATION: QuestionType[] = [
  "colour", "circle", "match", "trace", "count", "draw", "reading", "writing",
  "beginning_sounds", "sorting", "pattern", "fill_blank", "math", "phonics",
];

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** Select diverse, non-repetitive questions balanced across activity types. */
export function diversifyQuestionTemplates(
  pool: DiverseQuestionTemplate[],
  targetCount: number,
  classLevel: WorksheetClass,
  difficulty: WorksheetDifficulty,
): DiverseQuestionTemplate[] {
  const standard = getLpsStandard(classLevel);
  const maxCount = Math.min(targetCount, standard.questionsPerPage[difficulty] * 4);
  const byType = new Map<QuestionType, DiverseQuestionTemplate[]>();

  for (const t of pool) {
    const list = byType.get(t.type) ?? [];
    list.push(t);
    byType.set(t.type, list);
  }

  const preferred = [...standard.preferredActivities];
  const rotation = [
    ...preferred,
    ...ACTIVITY_ROTATION.filter((t) => !preferred.includes(t)),
  ];

  const selected: DiverseQuestionTemplate[] = [];
  const usedPrompts = new Set<string>();
  const usedTypes = new Map<QuestionType, number>();
  let rotIdx = 0;

  while (selected.length < maxCount && rotIdx < maxCount * rotation.length) {
    const type = rotation[rotIdx % rotation.length]!;
    rotIdx += 1;
    const typeCount = usedTypes.get(type) ?? 0;
    if (typeCount >= 2) continue;

    const candidates = (byType.get(type) ?? []).filter(
      (c) => !usedPrompts.has(c.prompt.toLowerCase().trim()),
    );
    if (!candidates.length) continue;

    const pick = candidates[Math.floor(Math.random() * candidates.length)]!;
    usedPrompts.add(pick.prompt.toLowerCase().trim());
    usedTypes.set(type, typeCount + 1);
    selected.push({
      ...pick,
      options: randomizeOptions(pick.options),
    });
  }

  if (selected.length < maxCount) {
    const remaining = dedupePrompts(
      shuffleInPlace([...pool]).filter(
        (p) => !usedPrompts.has(p.prompt.toLowerCase().trim()),
      ),
    );
    for (const r of remaining) {
      if (selected.length >= maxCount) break;
      selected.push({ ...r, options: randomizeOptions(r.options) });
    }
  }

  return diversifyActivityOrder(selected);
}

/** Ensure no two adjacent questions share the same activity type. */
export function diversifyActivityOrder(templates: DiverseQuestionTemplate[]): DiverseQuestionTemplate[] {
  if (templates.length <= 1) return templates;
  const out: DiverseQuestionTemplate[] = [];
  const rest = [...templates];

  while (rest.length) {
    const prevType = out.at(-1)?.type;
    const idx = rest.findIndex((t) => t.type !== prevType);
    const pick = idx >= 0 ? rest.splice(idx, 1)[0]! : rest.shift()!;
    out.push(pick);
  }
  return out;
}

export function measureActivityDiversity(templates: DiverseQuestionTemplate[]): number {
  if (!templates.length) return 0;
  const types = new Set(templates.map((t) => t.type));
  const uniqueRatio = types.size / templates.length;
  const repetitionPenalty = templates.length - new Set(templates.map((t) => t.prompt.toLowerCase())).size;
  return Math.max(0, Math.min(100, Math.round(uniqueRatio * 100 - repetitionPenalty * 8)));
}
