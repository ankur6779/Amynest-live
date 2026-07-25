/**
 * Reflection entity (Phase 3 §5.1 / Pack 5).
 * Snapshot linkage is read-only — never mutates historical snapshots.
 */

export const REFLECTION_MILESTONE_IDS = [
  "reflection_milestone_1",
  "reflection_milestone_5",
  "reflection_milestone_12",
] as const;

export type ReflectionMilestoneId = (typeof REFLECTION_MILESTONE_IDS)[number];

export type ReflectionEntry = {
  reflectionId: string;
  profileId: string;
  /** Opaque link to the sky that was active when saved. */
  snapshotVersion: string;
  promptId: string;
  body: string;
  createdAt: string;
  /** Content-pack / prompt-pack compatibility marker. */
  reflectionSchemaVersion: "1";
};

export type ReflectionStoreState = {
  profileId: string;
  entries: ReflectionEntry[];
  /** Emitted milestone ids — exactly once (Pack 5 Addendum A). */
  emittedMilestones: ReflectionMilestoneId[];
  /** Local timeline peek items of type reflection. */
  timelineItems: ReflectionTimelineItem[];
};

export type ReflectionTimelineItem = {
  itemId: string;
  profileId: string;
  type: "reflection";
  occurredAt: string;
  reflectionId: string;
  snapshotVersion: string;
};

export type ReflectionComposerDraft = {
  promptId: string;
  body: string;
  updatedAt: string;
};

export function milestoneIdForCount(count: number): ReflectionMilestoneId | null {
  if (count === 1) return "reflection_milestone_1";
  if (count === 5) return "reflection_milestone_5";
  if (count === 12) return "reflection_milestone_12";
  return null;
}
