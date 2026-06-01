// ─────────────────────────────────────────────────────────────────────────────
// Static audio corpus + pre-session warmup phrases for Amy Speech Coach dialogue.
// ─────────────────────────────────────────────────────────────────────────────

import { achievementLabel, type JourneyAchievementId } from "./coach-journey";

const ACHIEVEMENT_IDS: readonly JourneyAchievementId[] = [
  "first_word_spoken",
  "first_perfect_session",
  "longest_streak_record",
  "first_mastered_sound",
  "first_blend_lesson",
  "words_100",
];

/** Placeholder name for static TTS (runtime uses the child's name via dynamic TTS). */
export function substituteCoachNameForStatic(text: string): string {
  return text.replace(/\{childName\}/g, "friend").replace(/,\s*friend!/g, "!");
}

/** Map runtime personalized coach lines back to the static "friend" corpus key. */
export function replaceCoachPersonalNameWithFriend(text: string): string {
  let t = substituteCoachNameForStatic(text).trim();
  if (!t) return t;
  const name = String.raw`[\w'-]+`;
  const rules: Array<[RegExp, string]> = [
    [new RegExp(`^hello ${name}!$`, "i"), "Hello friend!"],
    [new RegExp(`^hi ${name}!`, "i"), "Hi friend!"],
    [new RegExp(`^hey ${name}!$`, "i"), "Hey friend!"],
    [new RegExp(`^hello there, ${name}!$`, "i"), "Hello there, friend!"],
    [new RegExp(`^good to see you,? ${name}!$`, "i"), "Good to see you, friend!"],
    [new RegExp(`^welcome back, ${name}\\.?$`, "i"), "Welcome back, friend."],
    [new RegExp(`^good to see you again, ${name}\\.?$`, "i"), "Good to see you again, friend."],
    [
      new RegExp(`^hello again, ${name} — i am glad you came back\\.?$`, "i"),
      "Hello again, friend — I am glad you came back.",
    ],
    [new RegExp(`^great job, ${name}!$`, "i"), "Great job, friend!"],
    [new RegExp(`^amazing work today, ${name}\\.?$`, "i"), "Amazing work today, friend."],
    [new RegExp(`^what a wonderful session, ${name}!$`, "i"), "What a wonderful session, friend!"],
    [new RegExp(`^great lesson today, ${name}\\.?$`, "i"), "Great lesson today, friend."],
    [new RegExp(`^you did beautifully today, ${name}\\.?$`, "i"), "You did beautifully today, friend."],
  ];
  for (const [re, replacement] of rules) {
    if (re.test(t)) return replacement;
  }
  return t;
}

function uniqueCoachAudioTexts(texts: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of texts) {
    const t = substituteCoachNameForStatic(raw.trim());
    if (!t) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out;
}

/**
 * All coach dialogue template lines suitable for static OpenAI TTS pre-generation.
 * Pass raw template strings (may include `{childName}`).
 */
export function buildCoachDialogueAudioTexts(templates: readonly string[]): string[] {
  return uniqueCoachAudioTexts(templates);
}

/** High-frequency coach lines for boot + pre-session static warmup. */
export const COACH_DIALOGUE_WARMUP_PHRASES: readonly string[] = [
  "Good job!",
  "Try again",
  "Well done",
  "Listen carefully",
  "Great job!",
  "Your turn.",
  "Listen and repeat.",
  "Let's try that again.",
  "I'm listening.",
  "Can you say this?",
  "Say it with me.",
  "That was excellent.",
  "Nice try.",
  "Let's begin!",
  "Ready? Let's start!",
  "Take your time.",
  "I am right here with you.",
  "Let's try together.",
];

export function getCoachDialogueWarmupPhrases(): readonly string[] {
  return COACH_DIALOGUE_WARMUP_PHRASES;
}

/** Fixed milestone / correction lines not covered by rotating templates. */
export function getCoachDialogueExtraAudioTexts(): string[] {
  const extras: string[] = [
    "Let's try that again.",
    "Listen carefully.",
    "Now you try.",
    "Listen to me first.",
    "Your turn — say it back.",
    "One more time together.",
    "Can you copy that?",
    "That is your longest streak yet.",
    "Wow — a new personal best!",
    "A new personal best streak — wow!",
    "You have mastered 10 sounds.",
    "You completed all your vowel sounds.",
    "You finished your first blending lesson.",
    "You have practiced one hundred words — amazing.",
    "You have practiced three days in a row.",
    "Three practice days in a row — amazing dedication.",
    "Let's try it together today.",
    "I'm proud of your progress.",
    "You completed all your vowel sounds — wonderful.",
    "You are improving steadily.",
    "Blending skills are getting better.",
    "I love that you keep coming back to learn.",
    "I can't wait to see you again.",
    "See you next time!",
    "Until next time!",
  ];

  for (const id of ACHIEVEMENT_IDS) {
    const label = achievementLabel(id);
    extras.push(`You reached ${label}.`);
    extras.push(`What a milestone — ${label}.`);
  }

  return uniqueCoachAudioTexts(extras);
}
