import type { FirstValueEventName } from "@workspace/analytics-taxonomy";
import { track } from "@/lib/analytics";
import { hasFirstRoutineActivationProgress } from "@/lib/activation-gate";
import { trackGrowthEvent } from "@/lib/growth-analytics";

const firedOnce = new Set<string>();

function onceKey(event: string, suffix: string): string {
  return `${event}:${suffix}`;
}

function emitFirstValueEvent(
  event: FirstValueEventName,
  props: Record<string, string | number | boolean | undefined>,
): void {
  track(event, props as never);
}

export type DashboardViewPayload = {
  userState?: string;
  hasTodayRoutine?: boolean;
  routineCount?: number;
  childCount?: number;
};

/** Fire once per dashboard mount when shell is ready. */
export function trackDashboardView(payload: DashboardViewPayload): void {
  const key = onceKey("dashboard_view", "session");
  if (firedOnce.has(key)) return;
  firedOnce.add(key);
  emitFirstValueEvent("dashboard_view", {
    user_state: payload.userState,
    has_today_routine: payload.hasTodayRoutine,
    routine_count: payload.routineCount,
    child_count: payload.childCount,
    source: "dashboard",
  });
}

export function trackRoutineCtaClicked(input: {
  source: string;
  screen?: string;
  childId?: number;
  userState?: string;
}): void {
  emitFirstValueEvent("routine_cta_clicked", {
    source: input.source,
    screen: input.screen ?? "/dashboard",
    child_id: input.childId,
    user_state: input.userState,
  });
}

export function trackRoutineGenerationCompleted(input: {
  routineId?: number;
  childId?: number;
  mode?: "ai" | "rule" | "fallback";
  itemCount?: number;
  source?: string;
  routineCountBefore?: number;
}): void {
  const isFirst =
    (input.routineCountBefore ?? 0) === 0 &&
    !hasFirstRoutineActivationProgress(input.routineCountBefore ?? 0);

  emitFirstValueEvent("routine_generation_completed", {
    routine_id: input.routineId,
    child_id: input.childId,
    mode: input.mode,
    item_count: input.itemCount,
    source: input.source,
    is_first_routine: isFirst,
  });

  emitFirstValueEvent("routine_saved", {
    routine_id: input.routineId,
    child_id: input.childId,
    source: input.source,
    is_first_routine: isFirst,
  });

  if (isFirst) {
    trackFirstValueAchieved({
      routineId: input.routineId,
      childId: input.childId,
      source: input.source,
    });
  }
}

export function trackRoutineOpened(input: {
  routineId?: number;
  childId?: number;
  dateMode?: "today" | "past" | "future";
  itemCount?: number;
  source?: string;
  isFirstRoutine?: boolean;
}): void {
  emitFirstValueEvent("routine_opened", {
    routine_id: input.routineId,
    child_id: input.childId,
    date_mode: input.dateMode,
    item_count: input.itemCount,
    source: input.source,
    is_first_routine: input.isFirstRoutine,
  });
}

export function trackRoutineShared(input: {
  routineId?: number;
  childId?: number;
  method: "whatsapp" | "copy" | "native" | "unknown";
  source?: string;
}): void {
  emitFirstValueEvent("routine_shared", {
    routine_id: input.routineId,
    child_id: input.childId,
    method: input.method,
    source: input.source,
  });
}

export function trackFirstValueAchieved(input: {
  routineId?: number;
  childId?: number;
  source?: string;
  minutesSinceSignup?: number;
}): void {
  const key = onceKey("first_value_achieved", String(input.routineId ?? "any"));
  if (firedOnce.has(key)) return;
  firedOnce.add(key);

  emitFirstValueEvent("first_value_achieved", {
    routine_id: input.routineId,
    child_id: input.childId,
    source: input.source,
    minutes_since_signup: input.minutesSinceSignup,
  });

  trackGrowthEvent("first_routine_generated", {
    routineId: input.routineId,
    childId: input.childId,
    source: input.source ?? "first_value",
  });
}

/** Reset dedupe state — tests only. */
export function resetFirstValueTelemetryForTests(): void {
  firedOnce.clear();
}
