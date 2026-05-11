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
} from "./types";

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
  // ── Letters — Easy (1y, 2y, 3y) ──────────────────────────────────────────
  { id: "L_A", kind: "letter", text: "A", ageBands: ["1y", "2y", "3y"], i18nKeyHint: HINT("letter"), difficulty: "easy" },
  { id: "L_B", kind: "letter", text: "B", ageBands: ["1y", "2y", "3y"], i18nKeyHint: HINT("letter"), difficulty: "easy" },
  { id: "L_M", kind: "letter", text: "M", ageBands: ["1y", "2y"], i18nKeyHint: HINT("letter"), difficulty: "easy" },
  { id: "L_O", kind: "letter", text: "O", ageBands: ["1y", "2y", "3y"], i18nKeyHint: HINT("letter"), difficulty: "easy" },
  { id: "L_P", kind: "letter", text: "P", ageBands: ["1y", "2y", "3y"], i18nKeyHint: HINT("letter"), difficulty: "easy" },
  { id: "L_E", kind: "letter", text: "E", ageBands: ["2y", "3y"], i18nKeyHint: HINT("letter"), difficulty: "easy" },
  { id: "L_I", kind: "letter", text: "I", ageBands: ["2y", "3y"], i18nKeyHint: HINT("letter"), difficulty: "easy" },
  { id: "L_U", kind: "letter", text: "U", ageBands: ["2y", "3y"], i18nKeyHint: HINT("letter"), difficulty: "easy" },

  // ── Letters — Medium (2y, 3y, 4y_plus) ───────────────────────────────────
  { id: "L_C", kind: "letter", text: "C", ageBands: ["2y", "3y", "4y_plus"], i18nKeyHint: HINT("letter"), difficulty: "medium" },
  { id: "L_D", kind: "letter", text: "D", ageBands: ["2y", "3y"], i18nKeyHint: HINT("letter"), difficulty: "medium" },
  { id: "L_F", kind: "letter", text: "F", ageBands: ["2y", "3y", "4y_plus"], i18nKeyHint: HINT("letter"), difficulty: "medium" },
  { id: "L_G", kind: "letter", text: "G", ageBands: ["2y", "3y", "4y_plus"], i18nKeyHint: HINT("letter"), difficulty: "medium" },
  { id: "L_H", kind: "letter", text: "H", ageBands: ["2y", "3y", "4y_plus"], i18nKeyHint: HINT("letter"), difficulty: "medium" },
  { id: "L_K", kind: "letter", text: "K", ageBands: ["2y", "3y", "4y_plus"], i18nKeyHint: HINT("letter"), difficulty: "medium" },
  { id: "L_N", kind: "letter", text: "N", ageBands: ["2y", "3y", "4y_plus"], i18nKeyHint: HINT("letter"), difficulty: "medium" },
  { id: "L_T", kind: "letter", text: "T", ageBands: ["2y", "3y", "4y_plus"], i18nKeyHint: HINT("letter"), difficulty: "medium" },
  { id: "L_W", kind: "letter", text: "W", ageBands: ["3y", "4y_plus"], i18nKeyHint: HINT("letter"), difficulty: "medium" },

  // ── Letters — Advanced (3y, 4y_plus) ─────────────────────────────────────
  { id: "L_J", kind: "letter", text: "J", ageBands: ["3y", "4y_plus"], i18nKeyHint: HINT("letter"), difficulty: "advanced" },
  { id: "L_L", kind: "letter", text: "L", ageBands: ["3y", "4y_plus"], i18nKeyHint: HINT("letter"), difficulty: "advanced" },
  { id: "L_Q", kind: "letter", text: "Q", ageBands: ["4y_plus"], i18nKeyHint: HINT("letter"), difficulty: "advanced" },
  { id: "L_R", kind: "letter", text: "R", ageBands: ["3y", "4y_plus"], i18nKeyHint: HINT("letter"), difficulty: "advanced" },
  { id: "L_S", kind: "letter", text: "S", ageBands: ["3y", "4y_plus"], i18nKeyHint: HINT("letter"), difficulty: "advanced" },
  { id: "L_V", kind: "letter", text: "V", ageBands: ["4y_plus"], i18nKeyHint: HINT("letter"), difficulty: "advanced" },
  { id: "L_X", kind: "letter", text: "X", ageBands: ["4y_plus"], i18nKeyHint: HINT("letter"), difficulty: "advanced" },
  { id: "L_Y", kind: "letter", text: "Y", ageBands: ["3y", "4y_plus"], i18nKeyHint: HINT("letter"), difficulty: "advanced" },
  { id: "L_Z", kind: "letter", text: "Z", ageBands: ["4y_plus"], i18nKeyHint: HINT("letter"), difficulty: "advanced" },

  // ── Phonics — Easy (1y, 2y) ───────────────────────────────────────────────
  { id: "P_ma", kind: "phonic", text: "ma", ageBands: ["1y", "2y"], i18nKeyHint: HINT("phonic"), difficulty: "easy" },
  { id: "P_pa", kind: "phonic", text: "pa", ageBands: ["1y", "2y"], i18nKeyHint: HINT("phonic"), difficulty: "easy" },
  { id: "P_ba", kind: "phonic", text: "ba", ageBands: ["1y", "2y"], i18nKeyHint: HINT("phonic"), difficulty: "easy" },
  { id: "P_da", kind: "phonic", text: "da", ageBands: ["1y", "2y"], i18nKeyHint: HINT("phonic"), difficulty: "easy" },
  { id: "P_ga", kind: "phonic", text: "ga", ageBands: ["1y", "2y"], i18nKeyHint: HINT("phonic"), difficulty: "easy" },
  { id: "P_ha", kind: "phonic", text: "ha", ageBands: ["1y", "2y"], i18nKeyHint: HINT("phonic"), difficulty: "easy" },
  { id: "P_na", kind: "phonic", text: "na", ageBands: ["1y", "2y"], i18nKeyHint: HINT("phonic"), difficulty: "easy" },

  // ── Phonics — Medium (2y, 3y) ─────────────────────────────────────────────
  { id: "P_ta", kind: "phonic", text: "ta", ageBands: ["2y", "3y"], i18nKeyHint: HINT("phonic"), difficulty: "medium" },
  { id: "P_ka", kind: "phonic", text: "ka", ageBands: ["2y", "3y"], i18nKeyHint: HINT("phonic"), difficulty: "medium" },
  { id: "P_la", kind: "phonic", text: "la", ageBands: ["2y", "3y"], i18nKeyHint: HINT("phonic"), difficulty: "medium" },
  { id: "P_ra", kind: "phonic", text: "ra", ageBands: ["2y", "3y"], i18nKeyHint: HINT("phonic"), difficulty: "medium" },
  { id: "P_sa", kind: "phonic", text: "sa", ageBands: ["2y", "3y"], i18nKeyHint: HINT("phonic"), difficulty: "medium" },
  { id: "P_wa", kind: "phonic", text: "wa", ageBands: ["2y", "3y"], i18nKeyHint: HINT("phonic"), difficulty: "medium" },
  { id: "P_ya", kind: "phonic", text: "ya", ageBands: ["2y", "3y"], i18nKeyHint: HINT("phonic"), difficulty: "medium" },
  { id: "P_fa", kind: "phonic", text: "fa", ageBands: ["2y", "3y"], i18nKeyHint: HINT("phonic"), difficulty: "medium" },

  // ── Phonics — Advanced (3y, 4y_plus) ─────────────────────────────────────
  { id: "P_sh", kind: "phonic", text: "sh", ageBands: ["3y", "4y_plus"], i18nKeyHint: HINT("phonic"), difficulty: "advanced" },
  { id: "P_th", kind: "phonic", text: "th", ageBands: ["4y_plus"], i18nKeyHint: HINT("phonic"), difficulty: "advanced" },
  { id: "P_ch", kind: "phonic", text: "ch", ageBands: ["3y", "4y_plus"], i18nKeyHint: HINT("phonic"), difficulty: "advanced" },
  { id: "P_wh", kind: "phonic", text: "wh", ageBands: ["3y", "4y_plus"], i18nKeyHint: HINT("phonic"), difficulty: "advanced" },
  { id: "P_bl", kind: "phonic", text: "bl", ageBands: ["3y", "4y_plus"], i18nKeyHint: HINT("phonic"), difficulty: "advanced" },
  { id: "P_cr", kind: "phonic", text: "cr", ageBands: ["3y", "4y_plus"], i18nKeyHint: HINT("phonic"), difficulty: "advanced" },
  { id: "P_st", kind: "phonic", text: "st", ageBands: ["3y", "4y_plus"], i18nKeyHint: HINT("phonic"), difficulty: "advanced" },
  { id: "P_tr", kind: "phonic", text: "tr", ageBands: ["4y_plus"], i18nKeyHint: HINT("phonic"), difficulty: "advanced" },
  { id: "P_gr", kind: "phonic", text: "gr", ageBands: ["4y_plus"], i18nKeyHint: HINT("phonic"), difficulty: "advanced" },
  { id: "P_pr", kind: "phonic", text: "pr", ageBands: ["4y_plus"], i18nKeyHint: HINT("phonic"), difficulty: "advanced" },

  // ── Words — Easy (1y, 2y) ─────────────────────────────────────────────────
  { id: "W_mama", kind: "word", text: "mama", ageBands: ["1y", "2y"], i18nKeyHint: HINT("word"), difficulty: "easy" },
  { id: "W_dada", kind: "word", text: "dada", ageBands: ["1y", "2y"], i18nKeyHint: HINT("word"), difficulty: "easy" },
  { id: "W_ball", kind: "word", text: "ball", ageBands: ["1y", "2y", "3y"], i18nKeyHint: HINT("word"), difficulty: "easy" },
  { id: "W_cat", kind: "word", text: "cat", ageBands: ["1y", "2y"], i18nKeyHint: HINT("word"), difficulty: "easy" },
  { id: "W_dog", kind: "word", text: "dog", ageBands: ["1y", "2y"], i18nKeyHint: HINT("word"), difficulty: "easy" },
  { id: "W_cup", kind: "word", text: "cup", ageBands: ["1y", "2y"], i18nKeyHint: HINT("word"), difficulty: "easy" },
  { id: "W_up", kind: "word", text: "up", ageBands: ["1y", "2y"], i18nKeyHint: HINT("word"), difficulty: "easy" },
  { id: "W_go", kind: "word", text: "go", ageBands: ["1y", "2y"], i18nKeyHint: HINT("word"), difficulty: "easy" },
  { id: "W_no", kind: "word", text: "no", ageBands: ["1y", "2y"], i18nKeyHint: HINT("word"), difficulty: "easy" },
  { id: "W_bye", kind: "word", text: "bye", ageBands: ["1y", "2y"], i18nKeyHint: HINT("word"), difficulty: "easy" },
  { id: "W_more", kind: "word", text: "more", ageBands: ["1y", "2y"], i18nKeyHint: HINT("word"), difficulty: "easy" },
  { id: "W_milk", kind: "word", text: "milk", ageBands: ["1y", "2y"], i18nKeyHint: HINT("word"), difficulty: "easy" },
  { id: "W_hat", kind: "word", text: "hat", ageBands: ["1y", "2y"], i18nKeyHint: HINT("word"), difficulty: "easy" },
  { id: "W_bed", kind: "word", text: "bed", ageBands: ["2y", "3y"], i18nKeyHint: HINT("word"), difficulty: "easy" },

  // ── Words — Medium (2y, 3y) ───────────────────────────────────────────────
  { id: "W_water", kind: "word", text: "water", ageBands: ["2y", "3y"], i18nKeyHint: HINT("word"), difficulty: "medium" },
  { id: "W_apple", kind: "word", text: "apple", ageBands: ["2y", "3y", "4y_plus"], i18nKeyHint: HINT("word"), difficulty: "medium" },
  { id: "W_happy", kind: "word", text: "happy", ageBands: ["2y", "3y", "4y_plus"], i18nKeyHint: HINT("word"), difficulty: "medium" },
  { id: "W_baby", kind: "word", text: "baby", ageBands: ["2y", "3y"], i18nKeyHint: HINT("word"), difficulty: "medium" },
  { id: "W_help", kind: "word", text: "help", ageBands: ["2y", "3y"], i18nKeyHint: HINT("word"), difficulty: "medium" },
  { id: "W_open", kind: "word", text: "open", ageBands: ["2y", "3y"], i18nKeyHint: HINT("word"), difficulty: "medium" },
  { id: "W_play", kind: "word", text: "play", ageBands: ["2y", "3y", "4y_plus"], i18nKeyHint: HINT("word"), difficulty: "medium" },
  { id: "W_book", kind: "word", text: "book", ageBands: ["2y", "3y"], i18nKeyHint: HINT("word"), difficulty: "medium" },
  { id: "W_tree", kind: "word", text: "tree", ageBands: ["2y", "3y"], i18nKeyHint: HINT("word"), difficulty: "medium" },
  { id: "W_blue", kind: "word", text: "blue", ageBands: ["2y", "3y", "4y_plus"], i18nKeyHint: HINT("word"), difficulty: "medium" },
  { id: "W_bird", kind: "word", text: "bird", ageBands: ["2y", "3y"], i18nKeyHint: HINT("word"), difficulty: "medium" },
  { id: "W_fish", kind: "word", text: "fish", ageBands: ["2y", "3y"], i18nKeyHint: HINT("word"), difficulty: "medium" },
  { id: "W_frog", kind: "word", text: "frog", ageBands: ["2y", "3y"], i18nKeyHint: HINT("word"), difficulty: "medium" },
  { id: "W_star", kind: "word", text: "star", ageBands: ["2y", "3y", "4y_plus"], i18nKeyHint: HINT("word"), difficulty: "medium" },

  // ── Words — Advanced (3y, 4y_plus) ───────────────────────────────────────
  { id: "W_butterfly", kind: "word", text: "butterfly", ageBands: ["3y", "4y_plus"], i18nKeyHint: HINT("word"), difficulty: "advanced" },
  { id: "W_elephant", kind: "word", text: "elephant", ageBands: ["3y", "4y_plus"], i18nKeyHint: HINT("word"), difficulty: "advanced" },
  { id: "W_rainbow", kind: "word", text: "rainbow", ageBands: ["3y", "4y_plus"], i18nKeyHint: HINT("word"), difficulty: "advanced" },
  { id: "W_purple", kind: "word", text: "purple", ageBands: ["3y", "4y_plus"], i18nKeyHint: HINT("word"), difficulty: "advanced" },
  { id: "W_banana", kind: "word", text: "banana", ageBands: ["3y", "4y_plus"], i18nKeyHint: HINT("word"), difficulty: "advanced" },
  { id: "W_yellow", kind: "word", text: "yellow", ageBands: ["3y", "4y_plus"], i18nKeyHint: HINT("word"), difficulty: "advanced" },
  { id: "W_turtle", kind: "word", text: "turtle", ageBands: ["3y", "4y_plus"], i18nKeyHint: HINT("word"), difficulty: "advanced" },
  { id: "W_umbrella", kind: "word", text: "umbrella", ageBands: ["4y_plus"], i18nKeyHint: HINT("word"), difficulty: "advanced" },
  { id: "W_beautiful", kind: "word", text: "beautiful", ageBands: ["4y_plus"], i18nKeyHint: HINT("word"), difficulty: "advanced" },
  { id: "W_together", kind: "word", text: "together", ageBands: ["4y_plus"], i18nKeyHint: HINT("word"), difficulty: "advanced" },
  { id: "W_strawberry", kind: "word", text: "strawberry", ageBands: ["4y_plus"], i18nKeyHint: HINT("word"), difficulty: "advanced" },
  { id: "W_chocolate", kind: "word", text: "chocolate", ageBands: ["4y_plus"], i18nKeyHint: HINT("word"), difficulty: "advanced" },

  // ── Sentences — Easy (1y, 2y) ─────────────────────────────────────────────
  { id: "S_i_see", kind: "sentence", text: "I see it.", ageBands: ["1y", "2y"], i18nKeyHint: HINT("sentence"), difficulty: "easy" },
  { id: "S_come_here", kind: "sentence", text: "Come here.", ageBands: ["1y", "2y"], i18nKeyHint: HINT("sentence"), difficulty: "easy" },
  { id: "S_all_done", kind: "sentence", text: "All done.", ageBands: ["1y", "2y"], i18nKeyHint: HINT("sentence"), difficulty: "easy" },
  { id: "S_more_milk", kind: "sentence", text: "I want more milk.", ageBands: ["2y", "3y"], i18nKeyHint: HINT("sentence"), difficulty: "easy" },
  { id: "S_go_play", kind: "sentence", text: "Let us go play.", ageBands: ["2y", "3y"], i18nKeyHint: HINT("sentence"), difficulty: "easy" },

  // ── Sentences — Medium (2y, 3y) ───────────────────────────────────────────
  { id: "S_thank_you", kind: "sentence", text: "Thank you, mama.", ageBands: ["2y", "3y", "4y_plus"], i18nKeyHint: HINT("sentence"), difficulty: "medium" },
  { id: "S_i_want_water", kind: "sentence", text: "I want some water.", ageBands: ["2y", "3y"], i18nKeyHint: HINT("sentence"), difficulty: "medium" },
  { id: "S_this_is_fun", kind: "sentence", text: "This is so fun!", ageBands: ["2y", "3y", "4y_plus"], i18nKeyHint: HINT("sentence"), difficulty: "medium" },
  { id: "S_help_me_please", kind: "sentence", text: "Help me please.", ageBands: ["2y", "3y"], i18nKeyHint: HINT("sentence"), difficulty: "medium" },
  { id: "S_what_is_that", kind: "sentence", text: "What is that?", ageBands: ["2y", "3y", "4y_plus"], i18nKeyHint: HINT("sentence"), difficulty: "medium" },
  { id: "S_i_love_you", kind: "sentence", text: "I love you.", ageBands: ["2y", "3y", "4y_plus"], i18nKeyHint: HINT("sentence"), difficulty: "medium" },
  { id: "S_cat_happy", kind: "sentence", text: "The cat is happy.", ageBands: ["3y", "4y_plus"], i18nKeyHint: HINT("sentence"), difficulty: "medium" },

  // ── Sentences — Advanced (3y, 4y_plus) ───────────────────────────────────
  { id: "S_play_park", kind: "sentence", text: "Can we play in the park?", ageBands: ["4y_plus"], i18nKeyHint: HINT("sentence"), difficulty: "advanced" },
  { id: "S_rainbow_beautiful", kind: "sentence", text: "The rainbow is so beautiful.", ageBands: ["4y_plus"], i18nKeyHint: HINT("sentence"), difficulty: "advanced" },
  { id: "S_where_is_mama", kind: "sentence", text: "Where is mama going?", ageBands: ["3y", "4y_plus"], i18nKeyHint: HINT("sentence"), difficulty: "advanced" },
  { id: "S_i_am_happy_today", kind: "sentence", text: "I am very happy today.", ageBands: ["3y", "4y_plus"], i18nKeyHint: HINT("sentence"), difficulty: "advanced" },
  { id: "S_can_you_help_me", kind: "sentence", text: "Can you please help me?", ageBands: ["3y", "4y_plus"], i18nKeyHint: HINT("sentence"), difficulty: "advanced" },
  { id: "S_i_want_to_play_outside", kind: "sentence", text: "I want to play outside.", ageBands: ["4y_plus"], i18nKeyHint: HINT("sentence"), difficulty: "advanced" },
  { id: "S_my_favorite_color", kind: "sentence", text: "My favourite colour is blue.", ageBands: ["4y_plus"], i18nKeyHint: HINT("sentence"), difficulty: "advanced" },
] as const;
