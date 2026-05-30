import { queueClientLog } from "@/lib/client-logs";
import { isCapacitorIosShell } from "@/lib/device-lite";
import { isNativeAmyNestShell } from "@/lib/native-shell";

export type CoachContentAnalyticsEvent =
  | "category_opened"
  | "premium_item_viewed"
  | "locked_item_clicked"
  | "upgrade_prompt_shown";

export type AudioLessonAnalyticsEvent =
  | "audio_category_opened"
  | "audio_premium_item_viewed"
  | "audio_locked_item_clicked"
  | "audio_upgrade_prompt_shown";

type ContentGatingPayload = {
  event: CoachContentAnalyticsEvent | AudioLessonAnalyticsEvent;
  surface: "amy_coach" | "audio_lessons";
  categoryId?: string;
  goalId?: string;
  lessonId?: string;
  itemIndex?: number;
  totalCount?: number;
  isPremium?: boolean;
  extra?: Record<string, string | number | boolean>;
};

function detectPlatform(): string {
  if (isCapacitorIosShell()) return "ios";
  if (isNativeAmyNestShell()) return "android";
  return "web";
}

const seenKeys = new Set<string>();

function dedupeKey(payload: ContentGatingPayload): string {
  return [
    payload.surface,
    payload.event,
    payload.categoryId ?? "",
    payload.goalId ?? "",
    payload.lessonId ?? "",
  ].join(":");
}

/** Amy Coach + Audio Lessons catalog / gating funnel telemetry. */
export function trackContentGatingEvent(payload: ContentGatingPayload): void {
  const key = dedupeKey(payload);
  if (
    (payload.event === "premium_item_viewed" ||
      payload.event === "audio_premium_item_viewed") &&
    seenKeys.has(key)
  ) {
    return;
  }
  seenKeys.add(key);

  queueClientLog({
    type: "info",
    message: payload.event,
    context: `content_gating:${payload.surface}`,
    route: typeof window !== "undefined" ? window.location.pathname : undefined,
    meta: {
      ...payload,
      platform: detectPlatform(),
      at: new Date().toISOString(),
    },
  });

  if (import.meta.env.DEV) {
    console.info("[content-gating]", payload);
  }
}

export function trackCoachCategoryOpened(
  categoryId: string,
  totalCount: number,
  isPremium: boolean,
): void {
  trackContentGatingEvent({
    event: "category_opened",
    surface: "amy_coach",
    categoryId,
    totalCount,
    isPremium,
  });
}

export function trackCoachPremiumItemViewed(
  categoryId: string,
  goalId: string,
  itemIndex: number,
  isPremium: boolean,
): void {
  if (isPremium) return;
  trackContentGatingEvent({
    event: "premium_item_viewed",
    surface: "amy_coach",
    categoryId,
    goalId,
    itemIndex,
    isPremium,
  });
}

export function trackCoachLockedClick(
  categoryId: string,
  goalId: string,
  itemIndex: number,
): void {
  trackContentGatingEvent({
    event: "locked_item_clicked",
    surface: "amy_coach",
    categoryId,
    goalId,
    itemIndex,
    isPremium: false,
  });
  trackContentGatingEvent({
    event: "upgrade_prompt_shown",
    surface: "amy_coach",
    categoryId,
    goalId,
    itemIndex,
    extra: { source: "coach_goal" },
  });
}

export function trackAudioCategoryOpened(
  categoryId: string,
  totalCount: number,
  isPremium: boolean,
): void {
  trackContentGatingEvent({
    event: "audio_category_opened",
    surface: "audio_lessons",
    categoryId,
    totalCount,
    isPremium,
  });
}

export function trackAudioPremiumItemViewed(
  categoryId: string,
  lessonId: string,
  itemIndex: number,
  isPremium: boolean,
): void {
  if (isPremium) return;
  trackContentGatingEvent({
    event: "audio_premium_item_viewed",
    surface: "audio_lessons",
    categoryId,
    lessonId,
    itemIndex,
    isPremium,
  });
}

export function trackAudioLockedClick(
  categoryId: string,
  lessonId: string,
  itemIndex: number,
): void {
  trackContentGatingEvent({
    event: "audio_locked_item_clicked",
    surface: "audio_lessons",
    categoryId,
    lessonId,
    itemIndex,
    isPremium: false,
  });
  trackContentGatingEvent({
    event: "audio_upgrade_prompt_shown",
    surface: "audio_lessons",
    categoryId,
    lessonId,
    itemIndex,
    extra: { source: "audio_lesson" },
  });
}
