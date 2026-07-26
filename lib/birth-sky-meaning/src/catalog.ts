/**
 * Reusable meaning blocks — concepts only (no paragraphs).
 */

import type { MeaningCategory } from "./types.js";

export type ConceptBlock = {
  id: string;
  label: string;
  category: MeaningCategory;
};

/** Sign → concept blocks (applied via planet/role rules). */
export const SIGN_BLOCKS: Record<string, ConceptBlock[]> = {
  Aries: [
    { id: "initiative", label: "initiative", category: "strengths" },
    { id: "courage", label: "courage", category: "strengths" },
    { id: "action_first", label: "action-first", category: "motivationStyle" },
    { id: "fast_pace", label: "fast-paced", category: "attentionPattern" },
  ],
  Taurus: [
    { id: "steadiness", label: "steadiness", category: "strengths" },
    { id: "sensory_comfort", label: "sensory comfort", category: "comfortNeeds" },
    { id: "persistent", label: "persistent", category: "motivationStyle" },
    { id: "slow_warm", label: "slow-to-warm", category: "socialStyle" },
  ],
  Gemini: [
    { id: "curiosity", label: "curiosity", category: "curiosityPattern" },
    { id: "verbal", label: "verbal", category: "communicationStyle" },
    { id: "versatile_learning", label: "versatile learning", category: "learningStyle" },
    { id: "multi_interest", label: "multi-interest", category: "attentionPattern" },
  ],
  Cancer: [
    { id: "emotional_attunement", label: "emotional attunement", category: "emotionalPattern" },
    { id: "nurturing_bond", label: "nurturing bond", category: "socialStyle" },
    { id: "predictable_routines", label: "predictable routines", category: "comfortNeeds" },
    { id: "protective", label: "protective", category: "strengths" },
  ],
  Leo: [
    { id: "confidence", label: "confidence", category: "strengths" },
    { id: "leadership", label: "leadership", category: "strengths" },
    { id: "self_expression", label: "self-expression", category: "creativeStyle" },
    { id: "visibility", label: "visibility", category: "motivationStyle" },
  ],
  Virgo: [
    { id: "detail_care", label: "detail care", category: "strengths" },
    { id: "practical_learning", label: "practical learning", category: "learningStyle" },
    { id: "order_helps", label: "order helps", category: "comfortNeeds" },
    { id: "helpful", label: "helpful", category: "socialStyle" },
  ],
  Libra: [
    { id: "harmony_seeking", label: "harmony-seeking", category: "socialStyle" },
    { id: "diplomatic", label: "diplomatic", category: "communicationStyle" },
    { id: "aesthetic_sense", label: "aesthetic sense", category: "creativeStyle" },
    { id: "fairness", label: "fairness", category: "strengths" },
  ],
  Scorpio: [
    { id: "depth", label: "depth", category: "emotionalPattern" },
    { id: "focus_intensity", label: "focus intensity", category: "attentionPattern" },
    { id: "loyalty", label: "loyalty", category: "socialStyle" },
    { id: "privacy_needs", label: "privacy needs", category: "comfortNeeds" },
  ],
  Sagittarius: [
    { id: "exploration", label: "exploration", category: "curiosityPattern" },
    { id: "optimistic", label: "optimistic", category: "emotionalPattern" },
    { id: "big_picture", label: "big-picture", category: "learningStyle" },
    { id: "freedom", label: "freedom", category: "motivationStyle" },
  ],
  Capricorn: [
    { id: "responsibility", label: "responsibility", category: "strengths" },
    { id: "goal_oriented", label: "goal-oriented", category: "motivationStyle" },
    { id: "structured_learning", label: "structured learning", category: "learningStyle" },
    { id: "quiet_pride", label: "quiet pride", category: "socialStyle" },
  ],
  Aquarius: [
    { id: "originality", label: "originality", category: "creativeStyle" },
    { id: "independent", label: "independent", category: "socialStyle" },
    { id: "ideas_first", label: "ideas-first", category: "learningStyle" },
    { id: "humanitarian", label: "humanitarian", category: "strengths" },
  ],
  Pisces: [
    { id: "imagination", label: "imagination", category: "creativeStyle" },
    { id: "empathy", label: "empathy", category: "emotionalPattern" },
    { id: "gentle_pace", label: "gentle pace", category: "attentionPattern" },
    { id: "soothing_environment", label: "soothing environment", category: "comfortNeeds" },
  ],
};

export const HOUSE_BLOCKS: Record<number, ConceptBlock[]> = {
  1: [{ id: "self_presence", label: "self-presence", category: "strengths" }],
  2: [{ id: "security_values", label: "security & values", category: "comfortNeeds" }],
  3: [
    { id: "local_learning", label: "local learning", category: "learningStyle" },
    { id: "sibling_style_social", label: "peer chatter", category: "communicationStyle" },
  ],
  4: [{ id: "home_base", label: "home base", category: "comfortNeeds" }],
  5: [
    { id: "playful_expression", label: "playful expression", category: "creativeStyle" },
    { id: "recognition", label: "recognition", category: "motivationStyle" },
  ],
  6: [
    { id: "habits_craft", label: "habits & craft", category: "learningStyle" },
    { id: "service", label: "service", category: "motivationStyle" },
  ],
  7: [{ id: "partnership_focus", label: "partnership focus", category: "socialStyle" }],
  8: [{ id: "emotional_depth", label: "emotional depth", category: "emotionalPattern" }],
  9: [
    { id: "big_questions", label: "big questions", category: "curiosityPattern" },
    { id: "belief_seeking", label: "meaning-seeking", category: "learningStyle" },
  ],
  10: [
    { id: "achievement", label: "achievement", category: "motivationStyle" },
    { id: "public_role", label: "public role", category: "strengths" },
  ],
  11: [{ id: "group_belonging", label: "group belonging", category: "socialStyle" }],
  12: [
    { id: "inner_world", label: "inner world", category: "emotionalPattern" },
    { id: "quiet_restore", label: "quiet restore", category: "comfortNeeds" },
  ],
};

/** Keys use alphabetical planet pair: `${a}-${b}-${aspect}`. */
export const ASPECT_BLOCKS: Record<string, ConceptBlock[]> = {
  "moon-sun-conjunction": [
    { id: "inner_alignment", label: "inner alignment", category: "emotionalPattern" },
  ],
  "moon-sun-square": [
    { id: "inner_tension", label: "inner tension", category: "emotionalPattern" },
    { id: "needs_integration", label: "needs integration", category: "comfortNeeds" },
  ],
  "moon-sun-trine": [
    { id: "easy_flow", label: "easy emotional flow", category: "emotionalPattern" },
  ],
  "mars-moon-square": [
    { id: "reactive_feelings", label: "reactive feelings", category: "emotionalPattern" },
    { id: "movement_helps", label: "movement helps", category: "attentionPattern" },
  ],
  "jupiter-sun-trine": [
    { id: "growth_confidence", label: "growth confidence", category: "strengths" },
    { id: "expansive_curiosity", label: "expansive curiosity", category: "curiosityPattern" },
  ],
  "jupiter-mercury-trine": [
    { id: "big_ideas", label: "big ideas", category: "learningStyle" },
  ],
  "mars-venus-conjunction": [
    { id: "warm_drive", label: "warm drive", category: "socialStyle" },
  ],
  "moon-saturn-square": [
    { id: "emotional_reserve", label: "emotional reserve", category: "emotionalPattern" },
    { id: "needs_reliability", label: "needs reliability", category: "comfortNeeds" },
  ],
};

export const ELEMENT_BLOCKS: Record<string, ConceptBlock[]> = {
  fire: [
    { id: "spark_energy", label: "spark energy", category: "motivationStyle" },
    { id: "bold_expression", label: "bold expression", category: "creativeStyle" },
  ],
  earth: [
    { id: "grounded", label: "grounded", category: "strengths" },
    { id: "concrete_learning", label: "concrete learning", category: "learningStyle" },
  ],
  air: [
    { id: "idea_exchange", label: "idea exchange", category: "communicationStyle" },
    { id: "social_curious", label: "socially curious", category: "curiosityPattern" },
  ],
  water: [
    { id: "feeling_led", label: "feeling-led", category: "emotionalPattern" },
    { id: "empathic_bond", label: "empathic bond", category: "socialStyle" },
  ],
};

export const NAKSHATRA_BLOCKS: Record<string, ConceptBlock[]> = {
  Rohini: [
    { id: "creative_growth", label: "creative growth", category: "creativeStyle" },
    { id: "beauty_seeking", label: "beauty-seeking", category: "comfortNeeds" },
  ],
  Ashwini: [
    { id: "quick_start", label: "quick start", category: "motivationStyle" },
    { id: "healing_impulse", label: "healing impulse", category: "strengths" },
  ],
  Magha: [
    { id: "dignified_presence", label: "dignified presence", category: "strengths" },
  ],
  Pushya: [
    { id: "nurture_growth", label: "nurture & growth", category: "emotionalPattern" },
  ],
  Hasta: [
    { id: "skilled_hands", label: "skilled hands", category: "creativeStyle" },
  ],
  Revati: [
    { id: "gentle_guidance", label: "gentle guidance", category: "socialStyle" },
  ],
};

/** Concept id → parenting guidance (deterministic). */
export const PARENTING_MAP: Record<string, { guidanceId: string; label: string }> = {
  leadership: {
    guidanceId: "offer_choices",
    label: "Give opportunities to make choices",
  },
  confidence: {
    guidanceId: "celebrate_effort",
    label: "Celebrate brave tries, not only outcomes",
  },
  curiosity: {
    guidanceId: "encourage_exploration",
    label: "Encourage exploration with safe boundaries",
  },
  exploration: {
    guidanceId: "encourage_exploration",
    label: "Encourage exploration with safe boundaries",
  },
  emotional_attunement: {
    guidanceId: "predictable_routines",
    label: "Provide predictable routines and soft check-ins",
  },
  predictable_routines: {
    guidanceId: "predictable_routines",
    label: "Provide predictable routines and soft check-ins",
  },
  empathy: {
    guidanceId: "name_feelings",
    label: "Name feelings together without rushing to fix",
  },
  multi_interest: {
    guidanceId: "short_bursts",
    label: "Use short learning bursts and variety",
  },
  focus_intensity: {
    guidanceId: "deep_work_windows",
    label: "Protect quiet deep-focus windows",
  },
  visibility: {
    guidanceId: "stage_moments",
    label: "Offer small stages to share work proudly",
  },
  self_expression: {
    guidanceId: "creative_outlets",
    label: "Keep creative outlets available daily",
  },
  privacy_needs: {
    guidanceId: "respect_alone_time",
    label: "Respect alone time after social stretch",
  },
  freedom: {
    guidanceId: "choice_within_limits",
    label: "Offer choice within clear limits",
  },
  structured_learning: {
    guidanceId: "clear_steps",
    label: "Break tasks into clear steps",
  },
  reactive_feelings: {
    guidanceId: "body_first",
    label: "Help the body settle before talking it through",
  },
  sensory_comfort: {
    guidanceId: "sensory_anchors",
    label: "Use familiar sensory anchors (textures, snacks, songs)",
  },
};
