import { z } from "zod";

const abacusMode = z.enum(["learn", "practice", "challenge", "mental", "tutor", "warmup"]);
const abacusConnectivity = z.enum(["online", "offline"]);
const abacusSubscription = z.enum(["free", "premium", "trial", "unknown"]);

const abacusBase = {
  childId: z.number().int().optional(),
  age: z.number().optional(),
  language: z.string().max(16).optional(),
  subscription: abacusSubscription.optional(),
  connectivity: abacusConnectivity.optional(),
  device: z.string().max(64).optional(),
  level: z.number().int().min(1).max(7).optional(),
  mode: abacusMode.optional(),
};

/**
 * Abacus PRO Zone V2 funnel + session quality events.
 */
export const ABACUS_EVENT_PROP_SCHEMAS = {
  abacus_home_open: z.object({
    ...abacusBase,
  }),
  abacus_mode_started: z.object({
    ...abacusBase,
    mode: abacusMode,
  }),
  abacus_mode_completed: z.object({
    ...abacusBase,
    mode: abacusMode,
    accuracy: z.number().min(0).max(100).optional(),
    duration_ms: z.number().int().nonnegative().optional(),
    mistakes: z.number().int().nonnegative().optional(),
  }),
  abacus_mental_completed: z.object({
    ...abacusBase,
    correct: z.boolean(),
    duration_ms: z.number().int().nonnegative().optional(),
  }),
  abacus_challenge_completed: z.object({
    ...abacusBase,
    accuracy: z.number().min(0).max(100),
    points: z.number().int().nonnegative(),
    passed: z.boolean(),
    duration_ms: z.number().int().nonnegative().optional(),
  }),
  abacus_practice_completed: z.object({
    ...abacusBase,
    correct: z.boolean(),
    duration_ms: z.number().int().nonnegative().optional(),
  }),
  abacus_lesson_completed: z.object({
    ...abacusBase,
    steps: z.number().int().positive().optional(),
  }),
  abacus_tutor_opened: z.object({
    ...abacusBase,
  }),
  abacus_tutor_question: z.object({
    ...abacusBase,
    question_len: z.number().int().nonnegative().optional(),
    language: z.string().max(16).optional(),
  }),
  abacus_level_unlocked: z.object({
    ...abacusBase,
    unlocked_level: z.number().int().min(1).max(7),
  }),
  abacus_premium_clicked: z.object({
    ...abacusBase,
    source: z.string().max(80).optional(),
  }),
  abacus_premium_blocked: z.object({
    ...abacusBase,
    source: z.string().max(80).optional(),
    action: z.string().max(80).optional(),
  }),
  abacus_quit_mid_session: z.object({
    ...abacusBase,
    mode: abacusMode,
    duration_ms: z.number().int().nonnegative().optional(),
  }),
  abacus_session_duration: z.object({
    ...abacusBase,
    duration_ms: z.number().int().nonnegative(),
    mode: abacusMode.optional(),
  }),
  abacus_warmup_started: z.object({
    ...abacusBase,
  }),
  abacus_warmup_completed: z.object({
    ...abacusBase,
    bonus_points: z.number().int().nonnegative().optional(),
  }),
  abacus_age_override: z.object({
    ...abacusBase,
    level: z.number().int().min(1).max(7),
    by: z.enum(["parent", "child_confirmed"]).optional(),
  }),
  // ── V3 engagement layer ──────────────────────────────────────────────
  abacus_mission_started: z.object({
    ...abacusBase,
    step: z.string().max(40).optional(),
  }),
  abacus_mission_completed: z.object({
    ...abacusBase,
    gems: z.number().int().nonnegative().optional(),
    stars: z.number().int().nonnegative().optional(),
  }),
  abacus_game_played: z.object({
    ...abacusBase,
    game: z.string().max(40),
    base_mode: z.enum(["practice", "mental", "challenge"]).optional(),
  }),
  abacus_hint_used: z.object({
    ...abacusBase,
  }),
  abacus_perfect_session: z.object({
    ...abacusBase,
    mode: abacusMode.optional(),
  }),
  abacus_collection_unlock: z.object({
    ...abacusBase,
    item: z.string().max(64),
  }),
  abacus_thinking_time: z.object({
    ...abacusBase,
    duration_ms: z.number().int().nonnegative(),
    correct: z.boolean().optional(),
  }),
  // ── V4 learning adventure layer ──────────────────────────────────────
  abacus_dna_updated: z.object({
    ...abacusBase,
    accuracy: z.number().min(0).max(100).optional(),
    confidence: z.number().min(0).max(100).optional(),
    tutor_style: z.enum(["gentle", "playful", "challenge"]).optional(),
  }),
  abacus_emotion_cue: z.object({
    ...abacusBase,
    state: z.string().max(32),
  }),
  abacus_boss_started: z.object({
    ...abacusBase,
    boss_id: z.string().max(64),
    level: z.number().int().min(1).max(7).optional(),
  }),
  abacus_boss_completed: z.object({
    ...abacusBase,
    boss_id: z.string().max(64),
    level: z.number().int().min(1).max(7).optional(),
    won: z.boolean().optional(),
  }),
  abacus_story_world_view: z.object({
    ...abacusBase,
    world_id: z.string().max(32).optional(),
  }),
  abacus_review_scheduled: z.object({
    ...abacusBase,
    skill: z.string().max(40).optional(),
  }),
  abacus_achievement_unlocked: z.object({
    ...abacusBase,
    achievement_id: z.string().max(40),
  }),
  abacus_certificate_generated: z.object({
    ...abacusBase,
    verify_code: z.string().max(32).optional(),
  }),
  abacus_family_challenge: z.object({
    ...abacusBase,
    challenge_id: z.string().max(40),
    action: z.enum(["start", "complete"]).optional(),
  }),
  abacus_voice_answer: z.object({
    ...abacusBase,
    correct: z.boolean().optional(),
    confidence: z.enum(["high", "medium", "low"]).optional(),
    response_ms: z.number().int().nonnegative().optional(),
  }),
  abacus_competition_view: z.object({
    ...abacusBase,
    event_id: z.string().max(64).optional(),
    bracket: z.string().max(16).optional(),
  }),
} as const;

export const ABACUS_EVENT_CATEGORY: Record<keyof typeof ABACUS_EVENT_PROP_SCHEMAS, "learning"> =
  Object.fromEntries(
    Object.keys(ABACUS_EVENT_PROP_SCHEMAS).map((k) => [k, "learning" as const]),
  ) as Record<keyof typeof ABACUS_EVENT_PROP_SCHEMAS, "learning">;
