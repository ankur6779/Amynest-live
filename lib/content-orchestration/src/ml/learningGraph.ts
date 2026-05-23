import type { SkillKey } from "../types-v2.js";
import type {
  ChildFamilySnapshot,
  ChildProgressOnGraph,
  LearningGraph,
  LearningGraphEdge,
  LearningGraphNode,
} from "./types-family.js";

const DEFAULT_EDGES: LearningGraphEdge[] = [
  { from: "phonics", to: "cognitive" },
  { from: "motor_skills", to: "cognitive" },
  { from: "cognitive", to: "social" },
];

const NODES: LearningGraphNode[] = [
  { skill: "phonics", moduleId: "phonics" },
  { skill: "motor_skills", moduleId: "motor_skills" },
  { skill: "cognitive", moduleId: "cognitive" },
  { skill: "social", moduleId: "social_emotional" },
];

export function buildLearningGraph(
  snapshots: ChildFamilySnapshot[],
): LearningGraph {
  const childProgressMapping: Record<string, ChildProgressOnGraph> = {};
  const masteryCount: Partial<Record<SkillKey, number>> = {};

  for (const s of snapshots) {
    const mastered: SkillKey[] = [];
    const inProgress: SkillKey[] = [];
    for (const node of NODES) {
      const level = s.profile.skills[node.skill].level;
      if (level >= 4) {
        mastered.push(node.skill);
        masteryCount[node.skill] = (masteryCount[node.skill] ?? 0) + 1;
      } else if (level >= 2) {
        inProgress.push(node.skill);
      }
    }
    childProgressMapping[s.childId] = {
      childId: s.childId,
      masteredSkills: mastered,
      inProgressSkills: inProgress,
    };
  }

  const sharedKnowledgeAreas = NODES.filter(
    (n) => (masteryCount[n.skill] ?? 0) >= 2,
  ).map((n) => n.skill);

  return {
    nodes: NODES,
    edges: DEFAULT_EDGES,
    childProgressMapping,
    sharedKnowledgeAreas,
  };
}

export function hasSiblingMastered(
  graph: LearningGraph,
  skill: SkillKey,
  excludeChildId: string,
): boolean {
  for (const [cid, progress] of Object.entries(graph.childProgressMapping)) {
    if (cid === excludeChildId) continue;
    if (progress.masteredSkills.includes(skill)) return true;
  }
  return false;
}

export function reusableContentSkills(
  graph: LearningGraph,
): SkillKey[] {
  return [...graph.sharedKnowledgeAreas];
}
