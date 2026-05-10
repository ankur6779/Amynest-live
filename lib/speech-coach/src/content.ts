// ─────────────────────────────────────────────────────────────────────────────
// Amy Speech Coach — deterministic content datasets
//
// All English source strings live in `i18n-manifest.ts`; this file only
// references them by key. Items are intentionally ordered so `Array.indexOf`
// remains stable across refactors (helps the API cache responses).
// ─────────────────────────────────────────────────────────────────────────────

import type {
  AffirmationCard,
  GuidanceCard,
  PronouncePrompt,
  SpeechGame,
  SpeechMilestone,
} from "./types.js";

const M = (id: string): { i18nKeyLabel: string; i18nKeyHint: string } => ({
  i18nKeyLabel: `screens.speech_coach.milestones.${id}.label`,
  i18nKeyHint: `screens.speech_coach.milestones.${id}.hint`,
});

export const SPEECH_MILESTONES: readonly SpeechMilestone[] = [
  // ── 1 year (12-23 months) ────────────────────────────────────────────────
  { id: "m_1y_first_words", ageBand: "1y", category: "first_words", ...M("m_1y_first_words") },
  { id: "m_1y_responds_name", ageBand: "1y", category: "social_communication", ...M("m_1y_responds_name") },
  { id: "m_1y_gesture_wave", ageBand: "1y", category: "social_communication", ...M("m_1y_gesture_wave") },
  { id: "m_1y_simple_words", ageBand: "1y", category: "vocabulary", ...M("m_1y_simple_words") },

  // ── 2 years (24-35 months) ───────────────────────────────────────────────
  { id: "m_2y_two_word", ageBand: "2y", category: "two_word_phrase", ...M("m_2y_two_word") },
  { id: "m_2y_follows_2step", ageBand: "2y", category: "social_communication", ...M("m_2y_follows_2step") },
  { id: "m_2y_50_words", ageBand: "2y", category: "vocabulary", ...M("m_2y_50_words") },
  { id: "m_2y_names_familiar", ageBand: "2y", category: "first_words", ...M("m_2y_names_familiar") },

  // ── 3 years (36-47 months) ───────────────────────────────────────────────
  { id: "m_3y_3plus_word_sentence", ageBand: "3y", category: "sentences", ...M("m_3y_3plus_word_sentence") },
  { id: "m_3y_asks_wh_questions", ageBand: "3y", category: "social_communication", ...M("m_3y_asks_wh_questions") },
  { id: "m_3y_intelligible_family", ageBand: "3y", category: "pronunciation", ...M("m_3y_intelligible_family") },
  { id: "m_3y_uses_pronouns", ageBand: "3y", category: "vocabulary", ...M("m_3y_uses_pronouns") },

  // ── 4+ years (48 months and up) ──────────────────────────────────────────
  { id: "m_4plus_full_sentences", ageBand: "4y_plus", category: "sentences", ...M("m_4plus_full_sentences") },
  { id: "m_4plus_tells_story", ageBand: "4y_plus", category: "social_communication", ...M("m_4plus_tells_story") },
  { id: "m_4plus_intelligible_strangers", ageBand: "4y_plus", category: "pronunciation", ...M("m_4plus_intelligible_strangers") },
  { id: "m_4plus_conversation_turns", ageBand: "4y_plus", category: "social_communication", ...M("m_4plus_conversation_turns") },
] as const;

export const SPEECH_GAMES: readonly SpeechGame[] = [
  {
    id: "animal_sounds",
    ageBands: ["1y", "2y", "3y"],
    rewardStars: 2,
    badgeId: "badge_zoo_voice",
    i18nKeyTitle: "screens.speech_coach.games.animal_sounds.title",
    i18nKeyDescription: "screens.speech_coach.games.animal_sounds.description",
  },
  {
    id: "rhyming",
    ageBands: ["2y", "3y", "4y_plus"],
    rewardStars: 2,
    badgeId: "badge_rhyme_master",
    i18nKeyTitle: "screens.speech_coach.games.rhyming.title",
    i18nKeyDescription: "screens.speech_coach.games.rhyming.description",
  },
  {
    id: "tongue_exercises",
    ageBands: ["2y", "3y", "4y_plus"],
    rewardStars: 1,
    badgeId: "badge_tongue_twister",
    i18nKeyTitle: "screens.speech_coach.games.tongue_exercises.title",
    i18nKeyDescription: "screens.speech_coach.games.tongue_exercises.description",
  },
  {
    id: "breathing",
    ageBands: ["3y", "4y_plus"],
    rewardStars: 1,
    badgeId: "badge_calm_breath",
    i18nKeyTitle: "screens.speech_coach.games.breathing.title",
    i18nKeyDescription: "screens.speech_coach.games.breathing.description",
  },
  {
    id: "slow_vs_fast",
    ageBands: ["3y", "4y_plus"],
    rewardStars: 2,
    badgeId: "badge_pace_pro",
    i18nKeyTitle: "screens.speech_coach.games.slow_vs_fast.title",
    i18nKeyDescription: "screens.speech_coach.games.slow_vs_fast.description",
  },
  {
    id: "emotion_express",
    ageBands: ["3y", "4y_plus"],
    rewardStars: 3,
    badgeId: "badge_feeling_voice",
    i18nKeyTitle: "screens.speech_coach.games.emotion_express.title",
    i18nKeyDescription: "screens.speech_coach.games.emotion_express.description",
  },
] as const;

const A = (id: string): AffirmationCard => ({
  id,
  i18nKeyText: `screens.speech_coach.affirmations.${id}`,
});

export const SPEECH_AFFIRMATIONS: readonly AffirmationCard[] = [
  A("a_voice_matters"),
  A("a_practice_takes_time"),
  A("a_every_child_different"),
  A("a_doing_amazing"),
  A("a_sounds_become_words"),
  A("a_words_become_stories"),
  A("a_patience_grows_confidence"),
  A("a_listening_matters"),
  A("a_every_word_a_win"),
  A("a_trust_their_pace"),
  A("a_pauses_are_speech"),
  A("a_wonderful_coach"),
] as const;

export const PARENT_GUIDANCE_CARDS: readonly GuidanceCard[] = [
  {
    id: "g_speech_delay_signs",
    topic: "speech_delay_signs",
    i18nKeyTitle: "screens.speech_coach.guidance.g_speech_delay_signs.title",
    i18nKeyBody: "screens.speech_coach.guidance.g_speech_delay_signs.body",
    i18nKeyTip: "screens.speech_coach.guidance.g_speech_delay_signs.tip",
  },
  {
    id: "g_screen_time_impact",
    topic: "screen_time_impact",
    i18nKeyTitle: "screens.speech_coach.guidance.g_screen_time_impact.title",
    i18nKeyBody: "screens.speech_coach.guidance.g_screen_time_impact.body",
    i18nKeyTip: "screens.speech_coach.guidance.g_screen_time_impact.tip",
  },
  {
    id: "g_talking_with_toddlers",
    topic: "talking_with_toddlers",
    i18nKeyTitle: "screens.speech_coach.guidance.g_talking_with_toddlers.title",
    i18nKeyBody: "screens.speech_coach.guidance.g_talking_with_toddlers.body",
    i18nKeyTip: "screens.speech_coach.guidance.g_talking_with_toddlers.tip",
  },
  {
    id: "g_bilingual_development",
    topic: "bilingual_development",
    i18nKeyTitle: "screens.speech_coach.guidance.g_bilingual_development.title",
    i18nKeyBody: "screens.speech_coach.guidance.g_bilingual_development.body",
    i18nKeyTip: "screens.speech_coach.guidance.g_bilingual_development.tip",
  },
  {
    id: "g_when_to_consult_expert",
    topic: "when_to_consult_expert",
    i18nKeyTitle: "screens.speech_coach.guidance.g_when_to_consult_expert.title",
    i18nKeyBody: "screens.speech_coach.guidance.g_when_to_consult_expert.body",
    i18nKeyTip: "screens.speech_coach.guidance.g_when_to_consult_expert.tip",
  },
] as const;

const HINT = (kind: string): string =>
  `screens.speech_coach.prompts.hint.${kind}`;

export const PRONUNCIATION_PROMPTS: readonly PronouncePrompt[] = [
  // ── Letters (1y, 2y, 3y) ─────────────────────────────────────────────────
  { id: "L_A", kind: "letter", text: "A", ageBands: ["1y", "2y", "3y"], i18nKeyHint: HINT("letter") },
  { id: "L_B", kind: "letter", text: "B", ageBands: ["1y", "2y", "3y"], i18nKeyHint: HINT("letter") },
  { id: "L_C", kind: "letter", text: "C", ageBands: ["1y", "2y", "3y"], i18nKeyHint: HINT("letter") },
  { id: "L_D", kind: "letter", text: "D", ageBands: ["2y", "3y"], i18nKeyHint: HINT("letter") },
  { id: "L_M", kind: "letter", text: "M", ageBands: ["1y", "2y"], i18nKeyHint: HINT("letter") },
  { id: "L_R", kind: "letter", text: "R", ageBands: ["3y", "4y_plus"], i18nKeyHint: HINT("letter") },
  { id: "L_S", kind: "letter", text: "S", ageBands: ["3y", "4y_plus"], i18nKeyHint: HINT("letter") },

  // ── Phonics ──────────────────────────────────────────────────────────────
  { id: "P_ma", kind: "phonic", text: "ma", ageBands: ["1y", "2y"], i18nKeyHint: HINT("phonic") },
  { id: "P_pa", kind: "phonic", text: "pa", ageBands: ["1y", "2y"], i18nKeyHint: HINT("phonic") },
  { id: "P_ta", kind: "phonic", text: "ta", ageBands: ["2y", "3y"], i18nKeyHint: HINT("phonic") },
  { id: "P_ka", kind: "phonic", text: "ka", ageBands: ["2y", "3y"], i18nKeyHint: HINT("phonic") },
  { id: "P_sh", kind: "phonic", text: "sh", ageBands: ["3y", "4y_plus"], i18nKeyHint: HINT("phonic") },
  { id: "P_th", kind: "phonic", text: "th", ageBands: ["4y_plus"], i18nKeyHint: HINT("phonic") },

  // ── Simple words ─────────────────────────────────────────────────────────
  { id: "W_mama", kind: "word", text: "mama", ageBands: ["1y", "2y"], i18nKeyHint: HINT("word") },
  { id: "W_dada", kind: "word", text: "dada", ageBands: ["1y", "2y"], i18nKeyHint: HINT("word") },
  { id: "W_ball", kind: "word", text: "ball", ageBands: ["1y", "2y", "3y"], i18nKeyHint: HINT("word") },
  { id: "W_water", kind: "word", text: "water", ageBands: ["2y", "3y"], i18nKeyHint: HINT("word") },
  { id: "W_apple", kind: "word", text: "apple", ageBands: ["2y", "3y", "4y_plus"], i18nKeyHint: HINT("word") },
  { id: "W_butterfly", kind: "word", text: "butterfly", ageBands: ["3y", "4y_plus"], i18nKeyHint: HINT("word") },
  { id: "W_elephant", kind: "word", text: "elephant", ageBands: ["3y", "4y_plus"], i18nKeyHint: HINT("word") },

  // ── Everyday sentences ───────────────────────────────────────────────────
  { id: "S_more_milk", kind: "sentence", text: "I want more milk.", ageBands: ["2y", "3y"], i18nKeyHint: HINT("sentence") },
  { id: "S_thank_you", kind: "sentence", text: "Thank you, mama.", ageBands: ["2y", "3y", "4y_plus"], i18nKeyHint: HINT("sentence") },
  { id: "S_cat_happy", kind: "sentence", text: "The cat is happy.", ageBands: ["3y", "4y_plus"], i18nKeyHint: HINT("sentence") },
  { id: "S_play_park", kind: "sentence", text: "Can we play in the park?", ageBands: ["4y_plus"], i18nKeyHint: HINT("sentence") },
] as const;
