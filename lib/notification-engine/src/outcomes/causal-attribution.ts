import type { OutcomeEventType } from "./types.js";

export interface AttributionRecord {
  notificationLogId: number;
  userId: string;
  openedAt: Date | null;
  sentAt: Date;
  outcomeEvent: OutcomeEventType;
  outcomeAt: Date;
  attributed: boolean;
  attributionWindowHours: number;
  upliftEligible: boolean;
}

export interface UpliftMetrics {
  treatmentOutcomes: number;
  treatmentSent: number;
  controlOutcomes: number;
  controlSent: number;
  absoluteUplift: number;
  relativeUplift: number;
}

const DEFAULT_WINDOW_HOURS = 48;

/**
 * Determine if an outcome was caused by a notification (causal attribution).
 * Requires outcome within attribution window after open (or send if unopened).
 */
export function attributeOutcome(input: {
  notificationLogId: number;
  userId: string;
  sentAt: Date;
  openedAt: Date | null;
  outcomeEvent: OutcomeEventType;
  outcomeAt: Date;
  windowHours?: number;
}): AttributionRecord {
  const windowHours = input.windowHours ?? DEFAULT_WINDOW_HOURS;
  const reference = input.openedAt ?? input.sentAt;
  const deltaMs = input.outcomeAt.getTime() - reference.getTime();
  const deltaHours = deltaMs / 3600000;

  const attributed = deltaHours >= 0 && deltaHours <= windowHours;

  return {
    notificationLogId: input.notificationLogId,
    userId: input.userId,
    openedAt: input.openedAt,
    sentAt: input.sentAt,
    outcomeEvent: input.outcomeEvent,
    outcomeAt: input.outcomeAt,
    attributed,
    attributionWindowHours: windowHours,
    upliftEligible: attributed && input.openedAt != null,
  };
}

export function computeUplift(
  treatment: { sent: number; outcomes: number },
  control: { sent: number; outcomes: number },
): UpliftMetrics {
  const treatmentRate = treatment.sent > 0 ? treatment.outcomes / treatment.sent : 0;
  const controlRate = control.sent > 0 ? control.outcomes / control.sent : 0;
  const absoluteUplift = treatmentRate - controlRate;
  const relativeUplift =
    controlRate > 0 ? (treatmentRate - controlRate) / controlRate : treatmentRate;

  return {
    treatmentOutcomes: treatment.outcomes,
    treatmentSent: treatment.sent,
    controlOutcomes: control.outcomes,
    controlSent: control.sent,
    absoluteUplift: Math.round(absoluteUplift * 1000) / 1000,
    relativeUplift: Math.round(relativeUplift * 1000) / 1000,
  };
}
