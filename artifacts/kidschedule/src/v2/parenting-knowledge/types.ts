/**
 * Parenting Knowledge Schema — Phase 2.0.
 * Canonical knowledge contract for Sleep, Tantrums, Eating, Learning, Baby Care.
 * IDs and structured data only. No generated copy. No prompts. No UI.
 */

/** Machine-only schema version for KnowledgeDefinition. */
export const PARENTING_KNOWLEDGE_SCHEMA_VERSION =
  "parenting_knowledge.v1" as const;

/**
 * Canonical Parenting Knowledge definition.
 * Every field is an ID or structured machine value — never prose / prompts / LLM output.
 */
export type KnowledgeDefinition = Readonly<{
  knowledgeId: string;
  problemId: string;
  /** Age band ids (e.g. age.0_6m, age.2_3y). */
  ageBands: ReadonlyArray<string>;
  /** Difficulty id (e.g. difficulty.low | difficulty.medium | difficulty.high). */
  difficulty: string;
  rootCauses: ReadonlyArray<string>;
  understanding: ReadonlyArray<string>;
  corePrinciples: ReadonlyArray<string>;
  coachObjectives: ReadonlyArray<string>;
  recommendedActions: ReadonlyArray<string>;
  mistakesToAvoid: ReadonlyArray<string>;
  microTasks: ReadonlyArray<string>;
  /** Question ids — not question text. */
  reflectionQuestions: ReadonlyArray<string>;
  successSignals: ReadonlyArray<string>;
  /** Related problemIds. */
  relatedProblems: ReadonlyArray<string>;
  contentIds: ReadonlyArray<string>;
  version: string;
}>;

export type KnowledgeValidationIssue = Readonly<{
  path: string;
  message: string;
}>;

export type KnowledgeValidationResult = Readonly<{
  ok: boolean;
  issues: ReadonlyArray<KnowledgeValidationIssue>;
}>;

export type KnowledgeDiffEntry = Readonly<{
  path: string;
  before: unknown;
  after: unknown;
}>;
