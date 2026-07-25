import type { OutcomeSignals } from "../outcomes/types.js";
import { journeyForSegment } from "./journeys.js";
import type {
  AudienceSegment,
  BehavioralPremiumTrigger,
  BuiltSegmentNotification,
  JourneyStepDefinition,
  SegmentPersonalization,
  SegmentRemoteConfig,
} from "./types.js";

function safeName(name: string): string {
  const trimmed = name?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : "your child";
}

export function buildSegmentPersonalization(
  signals: OutcomeSignals,
  timezone: string,
  locale = "en",
): SegmentPersonalization {
  let routineStatus: SegmentPersonalization["routineStatus"] = "none";
  if (signals.firstRoutineCompleted) {
    routineStatus = signals.routineCompletionRate7d > 0.3 ? "active" : "created";
  }
  return {
    childName: safeName(signals.childName),
    childAgeYears: null,
    isPremium: signals.isPremium,
    routineStatus,
    lastActivityDays: signals.daysSinceLastActive,
    locale,
    timezone,
  };
}

function applyCopy(
  step: JourneyStepDefinition,
  p: SegmentPersonalization,
  rc: SegmentRemoteConfig,
): { title: string; body: string } {
  const override = rc.copy[step.stepId] ?? rc.copy[step.titleKey];
  let title = override?.title ?? step.defaultTitle;
  let body = override?.body ?? step.defaultBody;
  const emoji = override?.emoji ?? step.emoji;

  title = title.replace(/\{childName\}/g, p.childName);
  body = body.replace(/\{childName\}/g, p.childName);

  if (emoji && !title.startsWith(emoji)) {
    title = `${emoji} ${title}`;
  }
  return { title, body };
}

/**
 * Pick the next eligible journey step based on hours since segment entry.
 */
export function pickEligibleJourneyStep(
  segment: AudienceSegment,
  hoursSinceEntry: number,
  signals: OutcomeSignals,
  behavioralTrigger: BehavioralPremiumTrigger = "none",
  completedStepIds: readonly string[] = [],
): { step: JourneyStepDefinition; stepIndex: number } | null {
  const journey = journeyForSegment(segment);
  if (!journey) return null;

  if (segment === "FREE_BEHAVIORAL") {
    if (behavioralTrigger === "none") return null;
    const step = journey.steps.find((s) => s.stepId === behavioralTrigger);
    if (!step) return null;
    const idx = journey.steps.indexOf(step);
    if (completedStepIds.includes(step.stepId)) return null;
    if (step.skipIf?.(signals)) return null;
    return { step, stepIndex: idx };
  }

  if (segment === "PREMIUM_USERS") {
    // Premium retention steps are event-driven; caller selects stepId explicitly.
    return null;
  }

  for (let i = journey.steps.length - 1; i >= 0; i--) {
    const step = journey.steps[i]!;
    if (hoursSinceEntry < step.delayHours) continue;
    if (completedStepIds.includes(step.stepId)) continue;
    if (step.skipIf?.(signals)) continue;
    return { step, stepIndex: i };
  }
  return null;
}

export function buildSegmentNotification(
  segment: AudienceSegment,
  step: JourneyStepDefinition,
  stepIndex: number,
  journeyId: string,
  signals: OutcomeSignals,
  timezone: string,
  rc: SegmentRemoteConfig,
  locale = "en",
  localDate?: string,
): BuiltSegmentNotification {
  const p = buildSegmentPersonalization(signals, timezone, locale);
  const { title, body } = applyCopy(step, p, rc);
  const date = localDate ?? new Date().toISOString().slice(0, 10);
  const dedupKey = `crm:${segment}:${step.stepId}:${date}`;

  const category =
    step.category === "conversion" ? "engagement" : "engagement";

  return {
    title,
    body,
    deepLink: step.deepLink,
    dedupKey,
    category: category as BuiltSegmentNotification["category"],
    journeyId,
    stepId: step.stepId,
    stepIndex,
    segment,
    goal: step.goal,
    monetization: step.category === "conversion",
    critical: false,
    data: {
      engine: "crm-segment-v1",
      segment,
      journeyId,
      journeyStepId: step.stepId,
      behavioralTrigger: step.stepId,
    },
  };
}

export function buildPremiumRetentionNotification(
  stepId: string,
  signals: OutcomeSignals,
  timezone: string,
  rc: SegmentRemoteConfig,
  locale = "en",
  localDate?: string,
): BuiltSegmentNotification | null {
  const journey = journeyForSegment("PREMIUM_USERS");
  if (!journey) return null;
  const step = journey.steps.find((s) => s.stepId === stepId);
  if (!step) return null;
  const idx = journey.steps.indexOf(step);
  return buildSegmentNotification(
    "PREMIUM_USERS",
    step,
    idx,
    journey.journeyId,
    signals,
    timezone,
    rc,
    locale,
    localDate,
  );
}
