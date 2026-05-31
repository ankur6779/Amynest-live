import { eq } from "drizzle-orm";
import {
  db,
  userCoachIntelligenceTable,
  type UserCoachIntelligenceRow,
} from "@workspace/db";
import {
  applyCoachIntelligenceEvent,
  createEmptyCoachIntelligence,
  renderCoachIntelligencePromptBlock,
  buildPublicCoachIntelligenceView,
  type CoachIntelligenceEvent,
  type CoachIntelligenceSnapshot,
  type CoachIntelligencePublicView,
} from "@workspace/coach-journey";

function normalizeSnapshot(raw: unknown): CoachIntelligenceSnapshot {
  if (!raw || typeof raw !== "object") return createEmptyCoachIntelligence();
  const s = raw as CoachIntelligenceSnapshot;
  if (s.version !== 1 || !Array.isArray(s.winRecords)) return createEmptyCoachIntelligence();
  return {
    ...createEmptyCoachIntelligence(),
    ...s,
    profile: { ...createEmptyCoachIntelligence().profile, ...s.profile },
  };
}

export async function loadCoachIntelligence(userId: string): Promise<CoachIntelligenceSnapshot> {
  const [row] = await db
    .select()
    .from(userCoachIntelligenceTable)
    .where(eq(userCoachIntelligenceTable.userId, userId))
    .limit(1);
  if (!row) return createEmptyCoachIntelligence();
  return normalizeSnapshot(row.snapshot);
}

export async function saveCoachIntelligence(
  userId: string,
  snapshot: CoachIntelligenceSnapshot,
): Promise<void> {
  const now = new Date();
  await db
    .insert(userCoachIntelligenceTable)
    .values({
      userId,
      snapshot,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: userCoachIntelligenceTable.userId,
      set: { snapshot, updatedAt: now },
    });
}

export async function applyCoachIntelligenceEventForUser(
  userId: string,
  event: CoachIntelligenceEvent,
): Promise<CoachIntelligenceSnapshot> {
  const current = await loadCoachIntelligence(userId);
  const next = applyCoachIntelligenceEvent(current, event);
  await saveCoachIntelligence(userId, next);
  return next;
}

export async function getCoachIntelligenceRow(
  userId: string,
): Promise<UserCoachIntelligenceRow | null> {
  const [row] = await db
    .select()
    .from(userCoachIntelligenceTable)
    .where(eq(userCoachIntelligenceTable.userId, userId))
    .limit(1);
  return row ?? null;
}

export async function getCoachIntelligencePromptBlock(
  userId: string,
  goalId: string,
): Promise<string> {
  const snapshot = await loadCoachIntelligence(userId);
  return renderCoachIntelligencePromptBlock(snapshot, goalId);
}

export function getPublicCoachIntelligenceView(
  snapshot: CoachIntelligenceSnapshot,
  activeGoalId: string,
): CoachIntelligencePublicView {
  return buildPublicCoachIntelligenceView(snapshot, activeGoalId);
}
