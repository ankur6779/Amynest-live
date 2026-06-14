export const SCORE_CHECKLIST_IDS = [
  "breakfast",
  "protein",
  "dairy",
  "greens",
  "fruit",
  "water",
  "noJunk",
  "wholegrains",
] as const;

export type ScoreChecklistId = (typeof SCORE_CHECKLIST_IDS)[number];

export const SCORE_CHECKLIST_LABEL_KEYS: Record<ScoreChecklistId, string> = {
  breakfast: "nutrition_hub.score.checklist.breakfast",
  protein: "nutrition_hub.score.checklist.protein",
  dairy: "nutrition_hub.score.checklist.dairy",
  greens: "nutrition_hub.score.checklist.greens",
  fruit: "nutrition_hub.score.checklist.fruit",
  water: "nutrition_hub.score.checklist.water",
  noJunk: "nutrition_hub.score.checklist.no_junk",
  wholegrains: "nutrition_hub.score.checklist.wholegrains",
};

export function countChecked(checklist: Record<string, boolean>): number {
  return SCORE_CHECKLIST_IDS.filter((id) => checklist[id]).length;
}

export function computeNutritionScore(checklist: Record<string, boolean>): {
  score: number;
  checked: number;
  total: number;
} {
  const total = SCORE_CHECKLIST_IDS.length;
  const checked = countChecked(checklist);
  const score = Math.round((checked / total) * 100);
  return { score, checked, total };
}

export function sanitizeChecklist(raw: unknown): Record<string, boolean> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, boolean> = {};
  for (const id of SCORE_CHECKLIST_IDS) {
    if (Object.prototype.hasOwnProperty.call(raw, id) && (raw as Record<string, unknown>)[id] === true) {
      out[id] = true;
    }
  }
  return out;
}
