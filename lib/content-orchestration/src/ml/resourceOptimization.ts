import type { ModuleId } from "../types.js";
import type { LearningGraph } from "./types-family.js";
import type { ChildFamilySnapshot } from "./types-family.js";
import { reusableContentSkills } from "./learningGraph.js";

export type SharedContentHint = {
  moduleId: ModuleId;
  contentIdSuffix: string;
  reusedFromChildId?: string;
  difficultyByChild: Record<string, import("../types.js").DifficultyLevel>;
};

/**
 * Reuse successful content patterns across siblings with per-child difficulty.
 */
export function suggestSharedContent(
  graph: LearningGraph,
  snapshots: ChildFamilySnapshot[],
): SharedContentHint[] {
  const skills = reusableContentSkills(graph);
  const hints: SharedContentHint[] = [];

  for (const skill of skills) {
    const node = graph.nodes.find((n) => n.skill === skill);
    if (!node?.moduleId) continue;

    const masterChild = Object.entries(graph.childProgressMapping).find(
      ([, p]) => p.masteredSkills.includes(skill),
    )?.[0];

    const difficultyByChild: Record<string, import("../types.js").DifficultyLevel> = {};
    for (const s of snapshots) {
      const level = s.profile.skills[skill].level;
      difficultyByChild[s.childId] =
        level >= 4 ? "hard" : level >= 2 ? "medium" : "easy";
    }

    hints.push({
      moduleId: node.moduleId,
      contentIdSuffix: `${skill}_family_pack`,
      reusedFromChildId: masterChild,
      difficultyByChild,
    });
  }

  return hints;
}
