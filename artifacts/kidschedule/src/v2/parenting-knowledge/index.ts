/**
 * Parenting Knowledge Schema (Phase 2.0).
 * Shared knowledge contract only. Not an engine. No AI. No Brain.
 */

export {
  PARENTING_KNOWLEDGE_SCHEMA_VERSION,
  type KnowledgeDefinition,
  type KnowledgeDiffEntry,
  type KnowledgeValidationIssue,
  type KnowledgeValidationResult,
} from "./types";

export { validateKnowledge } from "./validate";
export { compareKnowledge } from "./compare";
export { freezeKnowledge } from "./freeze";
