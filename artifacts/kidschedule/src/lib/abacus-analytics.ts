import { track, type AnalyticsEventName, type AnalyticsEventProps } from "@/lib/analytics";

export type AbacusMode = "learn" | "practice" | "challenge" | "mental" | "tutor" | "warmup";

export type AbacusAnalyticsContext = {
  childId: number;
  age: number;
  language?: string;
  subscription?: "free" | "premium" | "trial" | "unknown";
  level?: number;
};

function connectivity(): "online" | "offline" {
  if (typeof navigator === "undefined") return "online";
  return navigator.onLine ? "online" : "offline";
}

function device(): string {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent || "";
  if (/AmyNestAndroid/i.test(ua)) return "android_webview";
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "web";
}

function base(ctx: AbacusAnalyticsContext) {
  return {
    childId: ctx.childId,
    age: ctx.age,
    language: ctx.language,
    subscription: ctx.subscription ?? "unknown",
    connectivity: connectivity(),
    device: device(),
    level: ctx.level,
  };
}

function emit<E extends AnalyticsEventName>(
  name: E,
  props: AnalyticsEventProps<E>,
): void {
  try {
    track(name, props);
  } catch {
    /* analytics must never break gameplay */
  }
}

export function trackAbacusHomeOpen(ctx: AbacusAnalyticsContext): void {
  emit("abacus_home_open", base(ctx));
}

export function trackAbacusModeStarted(ctx: AbacusAnalyticsContext, mode: AbacusMode): void {
  emit("abacus_mode_started", { ...base(ctx), mode });
}

export function trackAbacusModeCompleted(
  ctx: AbacusAnalyticsContext,
  mode: AbacusMode,
  extra?: { accuracy?: number; duration_ms?: number; mistakes?: number },
): void {
  emit("abacus_mode_completed", { ...base(ctx), mode, ...extra });
}

export function trackAbacusMentalCompleted(
  ctx: AbacusAnalyticsContext,
  correct: boolean,
  duration_ms?: number,
): void {
  emit("abacus_mental_completed", { ...base(ctx), correct, duration_ms });
}

export function trackAbacusChallengeCompleted(
  ctx: AbacusAnalyticsContext,
  input: { accuracy: number; points: number; passed: boolean; duration_ms?: number },
): void {
  emit("abacus_challenge_completed", { ...base(ctx), ...input });
}

export function trackAbacusPracticeCompleted(
  ctx: AbacusAnalyticsContext,
  correct: boolean,
  duration_ms?: number,
): void {
  emit("abacus_practice_completed", { ...base(ctx), correct, duration_ms });
}

export function trackAbacusLessonCompleted(ctx: AbacusAnalyticsContext, steps?: number): void {
  emit("abacus_lesson_completed", { ...base(ctx), steps });
}

export function trackAbacusTutorOpened(ctx: AbacusAnalyticsContext): void {
  emit("abacus_tutor_opened", base(ctx));
}

export function trackAbacusTutorQuestion(
  ctx: AbacusAnalyticsContext,
  question_len: number,
  language?: string,
): void {
  emit("abacus_tutor_question", { ...base(ctx), question_len, language });
}

export function trackAbacusLevelUnlocked(ctx: AbacusAnalyticsContext, unlocked_level: number): void {
  emit("abacus_level_unlocked", { ...base(ctx), unlocked_level });
}

export function trackAbacusPremiumClicked(ctx: AbacusAnalyticsContext, source?: string): void {
  emit("abacus_premium_clicked", { ...base(ctx), source });
}

export function trackAbacusPremiumBlocked(
  ctx: AbacusAnalyticsContext,
  source?: string,
  action?: string,
): void {
  emit("abacus_premium_blocked", { ...base(ctx), source, action });
}

export function trackAbacusQuitMidSession(
  ctx: AbacusAnalyticsContext,
  mode: AbacusMode,
  duration_ms?: number,
): void {
  emit("abacus_quit_mid_session", { ...base(ctx), mode, duration_ms });
}

export function trackAbacusSessionDuration(
  ctx: AbacusAnalyticsContext,
  duration_ms: number,
  mode?: AbacusMode,
): void {
  emit("abacus_session_duration", { ...base(ctx), duration_ms, mode });
}

export function trackAbacusWarmupStarted(ctx: AbacusAnalyticsContext): void {
  emit("abacus_warmup_started", base(ctx));
}

export function trackAbacusWarmupCompleted(
  ctx: AbacusAnalyticsContext,
  bonus_points?: number,
): void {
  emit("abacus_warmup_completed", { ...base(ctx), bonus_points });
}

export function trackAbacusAgeOverride(
  ctx: AbacusAnalyticsContext,
  level: number,
  by: "parent" | "child_confirmed" = "parent",
): void {
  emit("abacus_age_override", { ...base(ctx), level, by });
}

export function trackAbacusMissionStarted(ctx: AbacusAnalyticsContext, step?: string): void {
  emit("abacus_mission_started", { ...base(ctx), step });
}

export function trackAbacusMissionCompleted(
  ctx: AbacusAnalyticsContext,
  gems?: number,
  stars?: number,
): void {
  emit("abacus_mission_completed", { ...base(ctx), gems, stars });
}

export function trackAbacusGamePlayed(
  ctx: AbacusAnalyticsContext,
  game: string,
  base_mode?: "practice" | "mental" | "challenge",
): void {
  emit("abacus_game_played", { ...base(ctx), game, base_mode });
}

export function trackAbacusHintUsed(ctx: AbacusAnalyticsContext): void {
  emit("abacus_hint_used", base(ctx));
}

export function trackAbacusPerfectSession(
  ctx: AbacusAnalyticsContext,
  mode?: AbacusMode,
): void {
  emit("abacus_perfect_session", { ...base(ctx), mode });
}

export function trackAbacusCollectionUnlock(ctx: AbacusAnalyticsContext, item: string): void {
  emit("abacus_collection_unlock", { ...base(ctx), item });
}

export function trackAbacusThinkingTime(
  ctx: AbacusAnalyticsContext,
  duration_ms: number,
  correct?: boolean,
): void {
  emit("abacus_thinking_time", { ...base(ctx), duration_ms, correct });
}

export function trackAbacusDnaUpdated(
  ctx: AbacusAnalyticsContext,
  meta?: {
    accuracy?: number;
    confidence?: number;
    tutor_style?: "gentle" | "playful" | "challenge";
  },
): void {
  emit("abacus_dna_updated", { ...base(ctx), ...meta });
}

export function trackAbacusEmotionCue(ctx: AbacusAnalyticsContext, state: string): void {
  emit("abacus_emotion_cue", { ...base(ctx), state });
}

export function trackAbacusBossStarted(
  ctx: AbacusAnalyticsContext,
  boss_id: string,
  level?: number,
): void {
  emit("abacus_boss_started", { ...base(ctx), boss_id, level });
}

export function trackAbacusBossCompleted(
  ctx: AbacusAnalyticsContext,
  boss_id: string,
  meta?: { level?: number; won?: boolean },
): void {
  emit("abacus_boss_completed", { ...base(ctx), boss_id, ...meta });
}

export function trackAbacusStoryWorldView(
  ctx: AbacusAnalyticsContext,
  world_id?: string,
): void {
  emit("abacus_story_world_view", { ...base(ctx), world_id });
}

export function trackAbacusReviewScheduled(
  ctx: AbacusAnalyticsContext,
  skill?: string,
): void {
  emit("abacus_review_scheduled", { ...base(ctx), skill });
}

export function trackAbacusAchievementUnlocked(
  ctx: AbacusAnalyticsContext,
  achievement_id: string,
): void {
  emit("abacus_achievement_unlocked", { ...base(ctx), achievement_id });
}

export function trackAbacusCertificateGenerated(
  ctx: AbacusAnalyticsContext,
  verify_code?: string,
): void {
  emit("abacus_certificate_generated", { ...base(ctx), verify_code });
}

export function trackAbacusFamilyChallenge(
  ctx: AbacusAnalyticsContext,
  challenge_id: string,
  action?: "start" | "complete",
): void {
  emit("abacus_family_challenge", { ...base(ctx), challenge_id, action });
}

export function trackAbacusVoiceAnswer(
  ctx: AbacusAnalyticsContext,
  meta?: {
    correct?: boolean;
    confidence?: "high" | "medium" | "low";
    response_ms?: number;
  },
): void {
  emit("abacus_voice_answer", { ...base(ctx), ...meta });
}

export function trackAbacusCompetitionView(
  ctx: AbacusAnalyticsContext,
  event_id?: string,
  bracket?: string,
): void {
  emit("abacus_competition_view", { ...base(ctx), event_id, bracket });
}
