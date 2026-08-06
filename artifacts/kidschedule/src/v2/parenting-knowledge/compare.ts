/**
 * compareKnowledge — developer diff for KnowledgeDefinition.
 * Pure. No ownership.
 */

import { freezeKnowledge } from "./freeze";
import type { KnowledgeDefinition, KnowledgeDiffEntry } from "./types";

export function compareKnowledge(
  before: KnowledgeDefinition,
  after: KnowledgeDefinition,
): ReadonlyArray<KnowledgeDiffEntry> {
  const out: KnowledgeDiffEntry[] = [];

  const push = (path: string, b: unknown, a: unknown) => {
    if (Object.is(b, a)) return;
    if (Array.isArray(b) && Array.isArray(a)) {
      if (b.length !== a.length) {
        out.push(
          freezeKnowledge({ path: path || "(root)", before: b, after: a }),
        );
        return;
      }
      for (let i = 0; i < b.length; i += 1) {
        push(`${path}[${i}]`, b[i], a[i]);
      }
      return;
    }
    if (
      b &&
      a &&
      typeof b === "object" &&
      typeof a === "object" &&
      !Array.isArray(b) &&
      !Array.isArray(a)
    ) {
      const bk = b as Record<string, unknown>;
      const ak = a as Record<string, unknown>;
      const keys = new Set([...Object.keys(bk), ...Object.keys(ak)]);
      for (const childKey of keys) {
        const childPath = path ? `${path}.${childKey}` : childKey;
        push(childPath, bk[childKey], ak[childKey]);
      }
      return;
    }
    out.push(freezeKnowledge({ path: path || "(root)", before: b, after: a }));
  };

  push("knowledgeId", before.knowledgeId, after.knowledgeId);
  push("problemId", before.problemId, after.problemId);
  push("ageBands", before.ageBands, after.ageBands);
  push("difficulty", before.difficulty, after.difficulty);
  push("rootCauses", before.rootCauses, after.rootCauses);
  push("understanding", before.understanding, after.understanding);
  push("corePrinciples", before.corePrinciples, after.corePrinciples);
  push("coachObjectives", before.coachObjectives, after.coachObjectives);
  push(
    "recommendedActions",
    before.recommendedActions,
    after.recommendedActions,
  );
  push("mistakesToAvoid", before.mistakesToAvoid, after.mistakesToAvoid);
  push("microTasks", before.microTasks, after.microTasks);
  push(
    "reflectionQuestions",
    before.reflectionQuestions,
    after.reflectionQuestions,
  );
  push("successSignals", before.successSignals, after.successSignals);
  push("relatedProblems", before.relatedProblems, after.relatedProblems);
  push("contentIds", before.contentIds, after.contentIds);
  push("version", before.version, after.version);

  return Object.freeze(out);
}
