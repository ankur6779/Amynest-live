import type { PhonicsV2StageId } from "./content/journey-stages";
import { PHONICS_V2_STAGES } from "./content/journey-stages";

export type PhonicsV2JourneyProgress = {
  masteredStages: PhonicsV2StageId[];
  lastCompletedAt?: number;
};

const STORAGE_PREFIX = "amynest:phonics-v2-journey:";

export function defaultV2JourneyProgress(): PhonicsV2JourneyProgress {
  return { masteredStages: [] };
}

export function loadV2JourneyProgress(childId: number): PhonicsV2JourneyProgress {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${childId}`);
    if (!raw) return defaultV2JourneyProgress();
    return { ...defaultV2JourneyProgress(), ...JSON.parse(raw) };
  } catch {
    return defaultV2JourneyProgress();
  }
}

export function saveV2JourneyProgress(
  childId: number,
  progress: PhonicsV2JourneyProgress,
): void {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${childId}`, JSON.stringify(progress));
  } catch {
    /* quota */
  }
}

export function markV2StageComplete(
  progress: PhonicsV2JourneyProgress,
  stageId: PhonicsV2StageId,
): PhonicsV2JourneyProgress {
  if (progress.masteredStages.includes(stageId)) return progress;
  return {
    masteredStages: [...progress.masteredStages, stageId],
    lastCompletedAt: Date.now(),
  };
}

export function masteredStageOrders(progress: PhonicsV2JourneyProgress): number[] {
  return progress.masteredStages
    .map((id) => PHONICS_V2_STAGES.find((s) => s.id === id)?.order)
    .filter((o): o is number => o != null);
}
