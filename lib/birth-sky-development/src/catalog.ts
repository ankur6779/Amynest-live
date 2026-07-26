/**
 * Deterministic catalogs — meaning concepts, goals, routines → development tags.
 */

import type {
  AgeStageId,
  DevelopmentDomain,
  ParentGoalId,
  RoutineKind,
} from "./types.js";

/** Meaning concept id → domain score deltas (0–1 scale boosts). */
export const MEANING_DOMAIN_BOOSTS: Record<
  string,
  Partial<Record<DevelopmentDomain, number>>
> = {
  confidence: { confidence: 0.18, socialInteraction: 0.06 },
  leadership: { confidence: 0.14, socialInteraction: 0.1 },
  "self-expression": { creativity: 0.16, communication: 0.08 },
  visibility: { confidence: 0.1, socialInteraction: 0.08 },
  "emotional attunement": { emotionalRegulation: 0.16, sleepTendencies: 0.06 },
  "predictable routines": {
    routineAdaptability: 0.14,
    sleepTendencies: 0.1,
    emotionalRegulation: 0.06,
  },
  curiosity: { curiosity: 0.18, learningStyle: 0.08 },
  "practical learning": { learningStyle: 0.14, attention: 0.06 },
  verbal: { communication: 0.16, learningStyle: 0.06 },
  helpful: { socialInteraction: 0.12, communication: 0.06 },
  "fast-paced": { attention: -0.08, curiosity: 0.08 },
  "gentle pace": { attention: 0.1, emotionalRegulation: 0.08 },
  "playful expression": { creativity: 0.12, motorDevelopment: 0.06 },
  recognition: { confidence: 0.1, socialInteraction: 0.06 },
  exploration: { curiosity: 0.14, motorDevelopment: 0.08 },
  focus: { attention: 0.14, learningStyle: 0.08 },
  resilience: { emotionalRegulation: 0.12, confidence: 0.08 },
  sensitivity: { emotionalRegulation: 0.1, sleepTendencies: 0.08 },
  structure: { routineAdaptability: 0.12, attention: 0.08 },
  imagination: { creativity: 0.16, curiosity: 0.08 },
  movement: { motorDevelopment: 0.16, attention: 0.04 },
  calm: { emotionalRegulation: 0.1, sleepTendencies: 0.1 },
};

/** Normalize meaning labels → concept ids. */
export function conceptKey(label: string): string {
  return label.trim().toLowerCase();
}

export const PARENT_GOAL_PRIORITY: Record<
  ParentGoalId,
  { domains: DevelopmentDomain[]; label: string; weight: number }
> = {
  better_sleep: {
    domains: ["sleepTendencies", "routineAdaptability", "emotionalRegulation"],
    label: "Better sleep",
    weight: 1.2,
  },
  better_focus: {
    domains: ["attention", "learningStyle", "routineAdaptability"],
    label: "Better focus",
    weight: 1.15,
  },
  confidence: {
    domains: ["confidence", "socialInteraction", "creativity"],
    label: "Confidence",
    weight: 1.1,
  },
  emotional_resilience: {
    domains: ["emotionalRegulation", "confidence", "communication"],
    label: "Emotional resilience",
    weight: 1.2,
  },
  learning_habits: {
    domains: ["learningStyle", "attention", "curiosity", "routineAdaptability"],
    label: "Learning habits",
    weight: 1.15,
  },
  communication: {
    domains: ["communication", "socialInteraction", "emotionalRegulation"],
    label: "Communication",
    weight: 1.1,
  },
  friendship: {
    domains: ["socialInteraction", "communication", "emotionalRegulation"],
    label: "Friendship",
    weight: 1.1,
  },
  self_regulation: {
    domains: ["emotionalRegulation", "attention", "routineAdaptability"],
    label: "Self regulation",
    weight: 1.2,
  },
};

export function normalizeParentGoal(raw: string): ParentGoalId | null {
  const k = raw
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  if (k in PARENT_GOAL_PRIORITY) return k as ParentGoalId;
  const aliases: Record<string, ParentGoalId> = {
    sleep: "better_sleep",
    focus: "better_focus",
    resilience: "emotional_resilience",
    learning: "learning_habits",
    habits: "learning_habits",
    friends: "friendship",
    self_regulation: "self_regulation",
    selfregulation: "self_regulation",
  };
  return aliases[k] ?? null;
}

/** Stage baseline domain scores (0.35–0.7). */
export const STAGE_BASELINES: Record<
  AgeStageId,
  Partial<Record<DevelopmentDomain, number>>
> = {
  infant_0_6: {
    emotionalRegulation: 0.42,
    communication: 0.38,
    socialInteraction: 0.45,
    learningStyle: 0.4,
    attention: 0.35,
    creativity: 0.4,
    motorDevelopment: 0.4,
    sleepTendencies: 0.38,
    routineAdaptability: 0.4,
    curiosity: 0.5,
    confidence: 0.4,
  },
  infant_6_12: {
    emotionalRegulation: 0.44,
    communication: 0.42,
    socialInteraction: 0.48,
    motorDevelopment: 0.5,
    curiosity: 0.55,
    sleepTendencies: 0.42,
  },
  toddler_1_2: {
    communication: 0.48,
    motorDevelopment: 0.55,
    curiosity: 0.58,
    attention: 0.4,
    routineAdaptability: 0.42,
  },
  toddler_2_3: {
    communication: 0.55,
    emotionalRegulation: 0.45,
    creativity: 0.52,
    confidence: 0.5,
    attention: 0.42,
  },
  preschool_3_5: {
    socialInteraction: 0.55,
    creativity: 0.58,
    learningStyle: 0.52,
    communication: 0.58,
    attention: 0.48,
  },
  school_5_8: {
    learningStyle: 0.58,
    attention: 0.52,
    socialInteraction: 0.58,
    confidence: 0.55,
    routineAdaptability: 0.55,
  },
  school_8_12: {
    attention: 0.58,
    learningStyle: 0.6,
    socialInteraction: 0.6,
    confidence: 0.58,
    emotionalRegulation: 0.55,
  },
  teen_12_18: {
    confidence: 0.55,
    emotionalRegulation: 0.52,
    communication: 0.6,
    curiosity: 0.58,
    attention: 0.55,
    socialInteraction: 0.62,
  },
};

export const ROUTINE_DOMAIN_SUPPORT: Record<
  RoutineKind,
  { domains: DevelopmentDomain[]; strengthLabel: string }
> = {
  sleep: {
    domains: ["sleepTendencies", "routineAdaptability", "emotionalRegulation"],
    strengthLabel: "Sleep routine present",
  },
  morning: {
    domains: ["routineAdaptability", "attention"],
    strengthLabel: "Morning rhythm present",
  },
  focus: {
    domains: ["attention", "learningStyle"],
    strengthLabel: "Focus block present",
  },
  meal: {
    domains: ["routineAdaptability", "socialInteraction"],
    strengthLabel: "Meal rhythm present",
  },
  outdoor: {
    domains: ["motorDevelopment", "curiosity", "attention"],
    strengthLabel: "Outdoor time present",
  },
  reading: {
    domains: ["learningStyle", "communication", "curiosity"],
    strengthLabel: "Reading habit present",
  },
  play: {
    domains: ["creativity", "socialInteraction", "motorDevelopment"],
    strengthLabel: "Play time present",
  },
  wind_down: {
    domains: ["sleepTendencies", "emotionalRegulation"],
    strengthLabel: "Wind-down routine present",
  },
  social: {
    domains: ["socialInteraction", "communication"],
    strengthLabel: "Social time present",
  },
  other: {
    domains: ["routineAdaptability"],
    strengthLabel: "Custom routine present",
  },
};

/** Stage-aware activity ids (labels are short tags, not paragraphs). */
export const STAGE_ACTIVITIES: Record<
  AgeStageId,
  Array<{ id: string; label: string; domain: DevelopmentDomain }>
> = {
  infant_0_6: [
    { id: "skin_to_skin_calm", label: "Calm co-regulation hold", domain: "emotionalRegulation" },
    { id: "tummy_time", label: "Short tummy time", domain: "motorDevelopment" },
    { id: "face_talk", label: "Face-to-face soft talk", domain: "communication" },
  ],
  infant_6_12: [
    { id: "peekaboo", label: "Peekaboo joint attention", domain: "socialInteraction" },
    { id: "safe_explore", label: "Safe floor exploration", domain: "curiosity" },
    { id: "nap_cues", label: "Consistent nap cues", domain: "sleepTendencies" },
  ],
  toddler_1_2: [
    { id: "naming_walk", label: "Name-and-point walk", domain: "communication" },
    { id: "push_pull_play", label: "Push-pull motor play", domain: "motorDevelopment" },
    { id: "simple_choice", label: "Two-option choices", domain: "confidence" },
  ],
  toddler_2_3: [
    { id: "emotion_cards", label: "Emotion naming cards", domain: "emotionalRegulation" },
    { id: "pretend_kitchen", label: "Pretend-play kitchen", domain: "creativity" },
    { id: "cleanup_song", label: "Cleanup song routine", domain: "routineAdaptability" },
  ],
  preschool_3_5: [
    { id: "story_retell", label: "Story retell practice", domain: "communication" },
    { id: "friend_turn_take", label: "Turn-taking game", domain: "socialInteraction" },
    { id: "creative_make", label: "Open-ended make time", domain: "creativity" },
  ],
  school_5_8: [
    { id: "focus_timer", label: "Short focus timer block", domain: "attention" },
    { id: "reading_together", label: "Shared reading habit", domain: "learningStyle" },
    { id: "skill_choice", label: "Child-led skill choice", domain: "confidence" },
  ],
  school_8_12: [
    { id: "project_chunk", label: "Chunked project plan", domain: "learningStyle" },
    { id: "peer_practice", label: "Peer practice meetup", domain: "socialInteraction" },
    { id: "reflection_journal", label: "Brief reflection journal", domain: "emotionalRegulation" },
  ],
  teen_12_18: [
    { id: "advocacy_script", label: "Self-advocacy script practice", domain: "communication" },
    { id: "deep_work_block", label: "Protected deep-work block", domain: "attention" },
    { id: "identity_hobby", label: "Identity-aligned hobby time", domain: "confidence" },
  ],
};

export const DOMAIN_PARENT_ACTIONS: Record<
  DevelopmentDomain,
  { id: string; label: string }
> = {
  emotionalRegulation: {
    id: "co_regulate_first",
    label: "Co-regulate before correcting",
  },
  communication: {
    id: "reflect_back",
    label: "Reflect back feelings in short phrases",
  },
  socialInteraction: {
    id: "scaffold_peer",
    label: "Scaffold peer play with clear roles",
  },
  learningStyle: {
    id: "match_learning_mode",
    label: "Match tasks to preferred learning mode",
  },
  attention: {
    id: "short_focus_blocks",
    label: "Use short focus blocks with movement breaks",
  },
  creativity: {
    id: "open_ended_materials",
    label: "Offer open-ended materials without outcome pressure",
  },
  motorDevelopment: {
    id: "daily_movement",
    label: "Protect daily movement time",
  },
  sleepTendencies: {
    id: "wind_down_buffer",
    label: "Keep a predictable wind-down buffer",
  },
  routineAdaptability: {
    id: "visual_routine_cues",
    label: "Use visual cues for routine transitions",
  },
  curiosity: {
    id: "follow_questions",
    label: "Follow curiosity questions with one next step",
  },
  confidence: {
    id: "offer_real_choices",
    label: "Offer real choices within safe limits",
  },
};

export const DOMAIN_AVOID: Partial<
  Record<DevelopmentDomain, { id: string; label: string }>
> = {
  emotionalRegulation: {
    id: "avoid_shame_spirals",
    label: "Avoid shame spirals during big feelings",
  },
  attention: {
    id: "avoid_marathon_tasks",
    label: "Avoid marathon tasks without breaks",
  },
  sleepTendencies: {
    id: "avoid_late_stimulation",
    label: "Avoid high stimulation right before sleep",
  },
  confidence: {
    id: "avoid_public_comparison",
    label: "Avoid public comparison with peers",
  },
  routineAdaptability: {
    id: "avoid_abrupt_switches",
    label: "Avoid abrupt routine switches without warning",
  },
};

/** Stage-critical routine kinds (missing → opportunity). */
export const STAGE_CRITICAL_ROUTINES: Record<AgeStageId, RoutineKind[]> = {
  infant_0_6: ["sleep", "wind_down", "meal"],
  infant_6_12: ["sleep", "play", "outdoor"],
  toddler_1_2: ["sleep", "play", "outdoor", "meal"],
  toddler_2_3: ["sleep", "play", "wind_down", "reading"],
  preschool_3_5: ["sleep", "play", "reading", "social", "outdoor"],
  school_5_8: ["sleep", "focus", "reading", "outdoor", "morning"],
  school_8_12: ["sleep", "focus", "reading", "social", "wind_down"],
  teen_12_18: ["sleep", "focus", "social", "wind_down", "outdoor"],
};
