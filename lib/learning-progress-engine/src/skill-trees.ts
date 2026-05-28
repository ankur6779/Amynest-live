import { SKILL_CATALOG, type SkillGraphEntry, type ProgressionStage } from "./skill-graph";

export interface SkillTreeNode {
  skillId: string;
  title: string;
  emoji: string;
  mastery: number;
  stage: ProgressionStage;
  locked: boolean;
  children: string[];
}

export interface SkillTreeBranch {
  id: string;
  title: string;
  emoji: string;
  nodes: SkillTreeNode[];
}

export const MATH_TREE_ROOTS = ["math_counting", "math_number_recognition", "math_patterns", "math_addition"];
export const LANGUAGE_TREE_ROOTS = [
  "language_letters",
  "phonics_letter_sounds",
  "phonics_blending",
  "language_simple_words",
  "language_reading",
];

function nodeFromEntry(
  def: (typeof SKILL_CATALOG)[0],
  entry: SkillGraphEntry | undefined,
  childIds: string[],
): SkillTreeNode {
  const mastery = entry?.mastery ?? 0;
  const stage = entry?.progressionStage ?? "not_started";
  const parentMastered =
    !def.parentSkillId ||
    (SKILL_CATALOG.find((s) => s.skillId === def.parentSkillId) &&
      entry !== undefined);
  return {
    skillId: def.skillId,
    title: def.title,
    emoji: def.emoji,
    mastery,
    stage,
    locked: def.parentSkillId != null && mastery === 0 && !parentMastered,
    children: childIds,
  };
}

export function buildSkillTrees(
  entries: Map<string, SkillGraphEntry>,
): { math: SkillTreeBranch; language: SkillTreeBranch } {
  const byId = new Map(SKILL_CATALOG.map((s) => [s.skillId, s]));

  const mathNodes = MATH_TREE_ROOTS.map((id) => {
    const def = byId.get(id)!;
    const kids = SKILL_CATALOG.filter((s) => s.parentSkillId === id).map((s) => s.skillId);
    return nodeFromEntry(def, entries.get(id), kids);
  });

  const langNodes = LANGUAGE_TREE_ROOTS.map((id) => {
    const def = byId.get(id)!;
    const kids = SKILL_CATALOG.filter((s) => s.parentSkillId === id).map((s) => s.skillId);
    return nodeFromEntry(def, entries.get(id), kids);
  });

  return {
    math: { id: "math", title: "Math", emoji: "🔢", nodes: mathNodes },
    language: { id: "language", title: "Language", emoji: "📖", nodes: langNodes },
  };
}
