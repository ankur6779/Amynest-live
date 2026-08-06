/**
 * Local mission completion for Today (Sprint 3A).
 * Persists via Amy Memory only — no direct localStorage writes.
 */

import { ensureAmyMemory, readAmyMemory, updateAmyMemory } from "@/v2/amy-memory";
import type { TodayMissionCompletion } from "./types";

/** @deprecated Legacy key — migrated into Amy Memory; kept for test cleanup greps. */
export const V2_TODAY_MISSION_COMPLETION_KEY = "amynest.v2.today.mission.completion";

export function localDateKey(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function readMissionCompletion(): TodayMissionCompletion | null {
  const memory = readAmyMemory();
  if (!memory?.mission.missionId || !memory.mission.dateKey || !memory.mission.completedAt) {
    return null;
  }
  return {
    guestId: memory.mission.completedForGuestId ?? memory.identity.guestId ?? "anonymous",
    missionId: memory.mission.missionId,
    dateKey: memory.mission.dateKey,
    completedAt: memory.mission.completedAt,
  };
}

export function isMissionCompletedToday(args: {
  guestId: string;
  missionId: string;
  now?: Date;
}): boolean {
  const saved = readMissionCompletion();
  if (!saved) return false;
  return (
    saved.guestId === args.guestId &&
    saved.missionId === args.missionId &&
    saved.dateKey === localDateKey(args.now ?? new Date())
  );
}

export function markMissionCompleted(args: {
  guestId: string;
  missionId: string;
  now?: Date;
}): TodayMissionCompletion {
  const now = args.now ?? new Date();
  const record: TodayMissionCompletion = {
    guestId: args.guestId,
    missionId: args.missionId,
    dateKey: localDateKey(now),
    completedAt: now.toISOString(),
  };
  ensureAmyMemory();
  updateAmyMemory(
    {
      mission: {
        missionId: record.missionId,
        dateKey: record.dateKey,
        completedAt: record.completedAt,
        completedForGuestId: record.guestId,
      },
      speech: {
        todayMissionStatus: "completed",
        lastPracticeAt: record.completedAt,
      },
      activity: {
        lastActivityAt: record.completedAt,
        recentSummary: `Completed mission ${record.missionId}`,
      },
    },
    {
      source: "mission_bridge",
      sectionSources: {
        mission: "mission_bridge",
        speech: "mission_bridge",
      },
    },
  );
  return record;
}

export function clearMissionCompletion(): void {
  if (!readAmyMemory()) return;
  updateAmyMemory(
    {
      mission: {
        missionId: null,
        dateKey: null,
        completedAt: null,
        completedForGuestId: null,
      },
      speech: {
        todayMissionStatus: "unknown",
        lastPracticeAt: null,
      },
    },
    {
      source: "mission_bridge",
      sectionSources: {
        mission: "mission_bridge",
        speech: "mission_bridge",
      },
    },
  );
}
