import type {
  AnalyticsEvent,
  AnalyticsSnapshot,
  ContentHistoryEntry,
  ModuleId,
} from "./types.js";

const events: AnalyticsEvent[] = [];

export function trackAnalyticsEvent(event: AnalyticsEvent): void {
  events.push(event);
  if (events.length > 10_000) events.shift();
}

export function getAnalyticsEvents(childId?: string): AnalyticsEvent[] {
  if (!childId) return [...events];
  return events.filter((e) => e.childId === childId);
}

export function clearAnalyticsEvents(): void {
  events.length = 0;
}

/**
 * Derives fatigue / repeat / engagement metrics from content history + events.
 */
export function computeAnalyticsSnapshot(
  history: ContentHistoryEntry[],
  moduleIds: ModuleId[],
): AnalyticsSnapshot {
  if (history.length === 0) {
    return {
      contentFatigueRate: 0,
      repeatExposurePct: 0,
      engagementByModule: Object.fromEntries(moduleIds.map((m) => [m, 0])) as Record<
        ModuleId,
        number
      >,
      dropOffAfterRepetition: 0,
    };
  }

  const repeated = history.filter((h) => h.seenCount > 1);
  const repeatExposurePct = (repeated.length / history.length) * 100;

  const fatigued = history.filter(
    (h) => h.seenCount >= 3 && (h.engagementScore ?? 50) < 40,
  );
  const contentFatigueRate = (fatigued.length / history.length) * 100;

  const engagementByModule = {} as Record<ModuleId, number>;
  for (const mid of moduleIds) {
    const modHistory = history.filter((h) => h.moduleId === mid);
    if (modHistory.length === 0) {
      engagementByModule[mid] = 0;
      continue;
    }
    const avg =
      modHistory.reduce((sum, h) => sum + (h.engagementScore ?? 50), 0) /
      modHistory.length;
    engagementByModule[mid] = Math.round(avg * 10) / 10;
  }

  const dropOffEvents = events.filter(
    (e) => e.type === "session_drop_off" || e.type === "content_skipped",
  );
  const afterRepeat = dropOffEvents.filter((e) => {
    const h = history.find(
      (x) => x.contentId === e.contentId && x.moduleId === e.moduleId,
    );
    return h && h.seenCount > 1;
  });
  const dropOffAfterRepetition =
    dropOffEvents.length > 0
      ? (afterRepeat.length / dropOffEvents.length) * 100
      : 0;

  return {
    contentFatigueRate: Math.round(contentFatigueRate * 10) / 10,
    repeatExposurePct: Math.round(repeatExposurePct * 10) / 10,
    engagementByModule,
    dropOffAfterRepetition: Math.round(dropOffAfterRepetition * 10) / 10,
  };
}

export function trackContentShown(
  childId: string,
  moduleId: ModuleId,
  contentId: string,
  metadata?: Record<string, unknown>,
): void {
  trackAnalyticsEvent({
    type: "content_shown",
    childId,
    moduleId,
    contentId,
    timestamp: new Date().toISOString(),
    metadata,
  });
}

export function trackPoolExhausted(
  childId: string,
  moduleId: ModuleId,
): void {
  trackAnalyticsEvent({
    type: "pool_exhausted",
    childId,
    moduleId,
    contentId: "",
    timestamp: new Date().toISOString(),
  });
}
