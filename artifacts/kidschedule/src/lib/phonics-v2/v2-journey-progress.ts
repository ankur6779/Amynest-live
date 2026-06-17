import type { PhonicsV2StageId } from "./content/journey-stages";
import { PHONICS_V2_STAGES } from "./content/journey-stages";
import { recordJourneyProgressionEvent } from "./journey-progression-telemetry";

export const JOURNEY_PROGRESSION_MODEL_VERSION = 2;

export type PhonicsV2JourneyProgress = {
  masteredStages: PhonicsV2StageId[];
  lastCompletedAt?: number;
  /** Bumped when mastery-based progression model is applied. */
  progressionModelVersion?: number;
};

const STORAGE_PREFIX = "amynest:phonics-v2-journey:";

export function defaultV2JourneyProgress(): PhonicsV2JourneyProgress {
  return { masteredStages: [], progressionModelVersion: JOURNEY_PROGRESSION_MODEL_VERSION };
}

function migrateProgressionModel(
  childId: number,
  progress: PhonicsV2JourneyProgress,
): PhonicsV2JourneyProgress {
  if (progress.progressionModelVersion === JOURNEY_PROGRESSION_MODEL_VERSION) {
    return progress;
  }

  // Preserve explicit activity marks; UI no longer treats age-order as completion.
  const next: PhonicsV2JourneyProgress = {
    ...progress,
    progressionModelVersion: JOURNEY_PROGRESSION_MODEL_VERSION,
  };
  saveV2JourneyProgress(childId, next);
  recordJourneyProgressionEvent("journey_progression_migrated", {
    childId,
    fromVersion: progress.progressionModelVersion ?? 1,
    toVersion: JOURNEY_PROGRESSION_MODEL_VERSION,
    preservedMasteredCount: progress.masteredStages.length,
  });
  return next;
}

export function loadV2JourneyProgress(childId: number): PhonicsV2JourneyProgress {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${childId}`);
    if (!raw) return defaultV2JourneyProgress();
    const parsed = { ...defaultV2JourneyProgress(), ...JSON.parse(raw) } as PhonicsV2JourneyProgress;
    return migrateProgressionModel(childId, parsed);
  } catch {
    return defaultV2JourneyProgress();
  }
}

export function saveV2JourneyProgress(
  childId: number,
  progress: PhonicsV2JourneyProgress,
): void {
  try {
    localStorage.setItem(
      `${STORAGE_PREFIX}${childId}`,
      JSON.stringify({
        ...progress,
        progressionModelVersion: JOURNEY_PROGRESSION_MODEL_VERSION,
      }),
    );
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
    ...progress,
    masteredStages: [...progress.masteredStages, stageId],
    lastCompletedAt: Date.now(),
    progressionModelVersion: JOURNEY_PROGRESSION_MODEL_VERSION,
  };
}

export function masteredStageOrders(progress: PhonicsV2JourneyProgress): number[] {
  return progress.masteredStages
    .map((id) => PHONICS_V2_STAGES.find((s) => s.id === id)?.order)
    .filter((o): o is number => o != null);
}
