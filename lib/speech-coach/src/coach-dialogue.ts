// ─────────────────────────────────────────────────────────────────────────────
// Amy Speech Coach — live teacher dialogue layer
//
// Sits above compareTranscript / prompt content. Generates warm, varied coaching
// lines for greetings, invites, feedback, streaks, and session closure.
// ─────────────────────────────────────────────────────────────────────────────

import { getPromptSpeakText } from "./pronunciation-datasets";
import {
  achievementLabel,
  formatJourneySoundForSpeech,
} from "./coach-journey";
import {
  canUseMidSessionMemoryReference,
  daysSinceLastSession,
  formatSoundForSpeech,
  type CoachMemoryTone,
  type CoachSessionMemory,
} from "./coach-memory";
import { compareTranscript, type TranscriptFeedback, type TranscriptResult } from "./transcript";
import type { PronouncePrompt, PronouncePromptKind } from "./types";
import {
  buildCoachDialogueAudioTexts,
  getCoachDialogueExtraAudioTexts,
} from "./coach-audio-corpus";

export type { CoachSessionMemory, CoachMemoryTone, CoachProgressInput } from "./coach-memory";
export type {
  CoachLocalSnapshot,
  CoachLearningJourney,
  JourneyAchievementId,
  SessionAttemptInput,
  SessionJourneyInput,
} from "./coach-journey";
export {
  buildCoachSessionMemory,
  countConsecutivePracticeDays,
  deriveCoachMemoryTone,
  formatSoundForSpeech,
  canUseMidSessionMemoryReference,
  daysSinceLastSession,
} from "./coach-memory";
export {
  achievementLabel,
  buildCoachLearningJourney,
  classifySoundCategory,
  mergeCoachJourneySnapshot,
} from "./coach-journey";

export type CoachActivityKind = "phoneme" | "word" | "sentence";

export interface CoachDialogueContext {
  childName: string;
  ageMonths: number;
  promptKind: PronouncePromptKind;
  /** 0-based index of the current item */
  sessionIndex: number;
  sessionTotal: number;
  /** Consecutive correct answers before this turn */
  streak: number;
  /** Stable per-session seed for template variation */
  sessionSeed: number;
  /** Monotonic turn counter within the session */
  turnIndex: number;
  toddler?: boolean;
  /** Historical child context — enables returning-learner lines */
  memory?: CoachSessionMemory;
  /** Spoken memory callbacks already used this session (rate limit) */
  memoryRefsUsed?: number;
  /** Best streak achieved so far in the current session */
  sessionBestStreak?: number;
  /** Points earned so far in the current session */
  sessionScore?: number;
}

export interface CoachEvaluationResult {
  feedback: TranscriptFeedback;
  score: number;
  correct: boolean;
  confidence: number;
  points: number;
  transcript: string;
  spokenLines: string[];
  displayFeedback: string;
  improvement: string | null;
  streakLine: string | null;
}

function hashPick(seed: number, turn: number, salt: string, size: number): number {
  if (size <= 0) return 0;
  let h = seed ^ turn * 2654435761;
  for (let i = 0; i < salt.length; i++) {
    h = Math.imul(h ^ salt.charCodeAt(i), 2246822519);
  }
  return Math.abs(h) % size;
}

function fillName(text: string, childName: string, useName: boolean): string {
  if (!useName) return text.replace(/\{childName\}/g, "friend").replace(/,\s*friend!/g, "!");
  const name = childName.trim() || "friend";
  return text.replace(/\{childName\}/g, name);
}

function pickLine(
  lines: readonly string[],
  ctx: CoachDialogueContext,
  salt: string,
  nameChance = 0.35,
): string {
  const idx = hashPick(ctx.sessionSeed, ctx.turnIndex, salt, lines.length);
  const useName = hashPick(ctx.sessionSeed, ctx.turnIndex, `${salt}:name`, 100) < nameChance * 100;
  return fillName(lines[idx]!, ctx.childName, useName);
}

function activityKind(kind: PronouncePromptKind): CoachActivityKind {
  if (kind === "letter" || kind === "phonic") return "phoneme";
  if (kind === "sentence") return "sentence";
  return "word";
}

const SUPPORTIVE_EXTRA: readonly string[] = [
  "Take your time.",
  "We can learn together.",
  "There is no rush.",
  "You are doing better already.",
  "Every try helps you grow.",
];

const CHALLENGING_EXTRA: readonly string[] = [
  "That was easy for you.",
  "Let's try a harder one.",
  "I think you're ready for a challenge.",
  "You're ready for something trickier.",
];

const GROWTH_PRAISE: readonly string[] = [
  "You are improving.",
  "Your pronunciation is getting clearer.",
  "You are becoming a confident speaker.",
  "You are learning new sounds every day.",
  "Your speaking is growing stronger.",
];

const EFFORT_PRAISE: readonly string[] = [
  "You kept trying even when it was difficult.",
  "I noticed you didn't give up.",
  "Practice is making you stronger.",
  "Your effort really shows.",
];

const SKILL_CELEBRATIONS: readonly string[] = [
  "You can now read more words than before.",
  "You are becoming a sound expert.",
  "Your blending skills are getting better.",
];

const RETURNING_WELCOME: readonly string[] = [
  "Welcome back, {childName}.",
  "Good to see you again, {childName}.",
  "Hello again, {childName} — I am glad you came back.",
];

const SESSION_GREETINGS: readonly (readonly string[])[] = [
  [
    "Hello {childName}!",
    "I am Amy and I am so happy to learn with you today.",
    "Today we are going to practice some fun sounds and words together.",
    "Listen carefully, repeat after me, and I will help you.",
    "Let's begin!",
  ],
  [
    "Hi {childName}! Amy here.",
    "I am so glad you came to practice with me.",
    "We will take our time and have fun with sounds and words.",
    "Copy my voice when you are ready.",
    "Ready? Let's start!",
  ],
  [
    "Good to see you, {childName}!",
    "I am Amy, your speech coach and learning friend.",
    "Today we will practice speaking clearly and confidently.",
    "Listen first, then say it back — I am right here with you.",
    "Here we go!",
  ],
  [
    "Hey {childName}!",
    "Amy is here and excited for our lesson.",
    "We will play with sounds, words, and maybe sentences too.",
    "Take your time — every try helps you grow.",
    "Let's begin together!",
  ],
  [
    "Hello there, {childName}!",
    "I am Amy. Thank you for practicing with me today.",
    "We are going to learn by listening and repeating.",
    "I will cheer you on the whole way.",
    "Let's get started!",
  ],
];

const ACTIVITY_INTROS: Record<CoachActivityKind, readonly string[]> = {
  phoneme: [
    "Today we are learning sounds.",
    "These sounds help us read words.",
    "Let's try our first sound.",
  ],
  word: [
    "Today we are learning words.",
    "Listen carefully and say the word after me.",
  ],
  sentence: [
    "Today we are practicing speaking in full sentences.",
    "Let's speak clearly together.",
  ],
};

const ITEM_INVITES: readonly string[] = [
  "Can you say this?",
  "Your turn.",
  "Let's try together.",
  "Listen and repeat.",
  "Say it with me.",
  "Can you copy my voice?",
  "Ready? Repeat after me.",
  "Let's hear your voice.",
  "Now you try this one.",
  "Match my sound.",
];

const LISTENING_ENCOURAGEMENTS: readonly string[] = [
  "I'm listening.",
  "Take your time.",
  "You can do it.",
  "I'm ready.",
  "Go ahead.",
  "Whenever you're ready.",
  "I am right here with you.",
];

const PRAISE_GREAT: readonly string[] = [
  "Great job, {childName}!",
  "That was excellent.",
  "I heard that clearly.",
  "Wonderful speaking.",
  "Fantastic.",
  "You are getting better.",
  "That's exactly right.",
  "Beautiful! That sounded clear.",
  "Yes! You nailed it.",
  "Super speaking!",
];

const PRAISE_CLOSE: readonly string[] = [
  "Very close.",
  "Nice try.",
  "Let's make it even clearer.",
  "Let's try once more together.",
  "You are almost there.",
  "So close — one more time.",
  "That was nearly perfect.",
  "Good effort — let's polish it.",
];

const PRAISE_TRY_AGAIN: readonly string[] = [
  "Let's try that again.",
  "Listen carefully — you've got this.",
  "One more go together.",
  "Keep going — I believe in you.",
  "Let's practice it once more.",
  "Almost — let's do it again.",
];

const STREAK_AT_3: readonly string[] = [
  "Wow!",
  "Three in a row!",
  "You're doing amazing.",
];

const STREAK_AT_5: readonly string[] = [
  "High five!",
  "You're on fire.",
  "Fantastic work.",
];

const STREAK_LONG: readonly string[] = [
  "Incredible streak!",
  "You are unstoppable!",
  "Amy is so proud of you!",
  "What amazing focus!",
];

const PROGRESS_HALFWAY: readonly string[] = [
  "We are halfway done.",
  "You're doing great so far.",
  "Nice progress — keep going.",
];

const PROGRESS_NEAR_END: readonly string[] = [
  "Only a few more.",
  "Almost there — finish strong.",
  "Just a couple left — you've got this.",
];

const SESSION_CLOSINGS: readonly (readonly string[])[] = [
  [
    "Amazing work today, {childName}.",
    "I loved learning with you.",
    "You practiced really well.",
    "I can't wait to see you again.",
    "See you next time!",
  ],
  [
    "What a wonderful session, {childName}!",
    "You worked so hard today.",
    "Your speaking is getting stronger.",
    "I had fun teaching you.",
    "See you soon!",
  ],
  [
    "Great lesson today, {childName}.",
    "You should feel proud of yourself.",
    "Practice like this really helps.",
    "Amy is cheering for you.",
    "Until next time!",
  ],
  [
    "You did beautifully today, {childName}.",
    "Thank you for practicing with me.",
    "Every try makes you better.",
    "I am already looking forward to our next lesson.",
    "Bye for now!",
  ],
];

const EMPTY_TRANSCRIPT_LINES: readonly string[] = [
  "I did not quite hear you. Come a little closer and try again.",
  "Hmm, I am listening — can you say it one more time?",
  "Take your time. Say it again when you are ready.",
];

export function createCoachDialogueContext(
  partial: Omit<CoachDialogueContext, "turnIndex"> & { turnIndex?: number },
): CoachDialogueContext {
  return {
    ...partial,
    turnIndex: partial.turnIndex ?? 0,
    memoryRefsUsed: partial.memoryRefsUsed ?? 0,
  };
}

function memoryCtx(ctx: CoachDialogueContext): CoachSessionMemory | null {
  return ctx.memory?.isReturning ? ctx.memory : null;
}

function journeyCtx(ctx: CoachDialogueContext) {
  return ctx.memory?.journey ?? null;
}

/** Learning-journey lines for session start (sound/skill focused). */
export function buildJourneyWelcomeLines(ctx: CoachDialogueContext): string[] {
  const journey = journeyCtx(ctx);
  if (!journey || !ctx.memory?.isReturning) return [];

  const options: string[] = [];

  const recent = journey.recentlyMastered[0];
  if (recent) {
    options.push(`You mastered the ${formatJourneySoundForSpeech(recent.promptText)} recently.`);
    options.push(`I'm proud of how you learned the ${formatJourneySoundForSpeech(recent.promptText)}.`);
  }

  const focus = journey.strugglingSounds[0];
  if (focus) {
    options.push(`I remember you worked hard on the ${formatJourneySoundForSpeech(focus.promptText)}.`);
    options.push(`Last time the ${formatJourneySoundForSpeech(focus.promptText)} was tricky.`);
    options.push(`Let's practice the ${formatJourneySoundForSpeech(focus.promptText)} together again.`);
  }

  const improving = journey.improvingSounds[0];
  if (improving && improving.promptId !== focus?.promptId) {
    options.push(`The ${formatJourneySoundForSpeech(improving.promptText)} is getting stronger each time.`);
  }

  if (journey.vowelsMasteredCount >= 3) {
    options.push("You completed all your vowel sounds — wonderful.");
  }

  if (journey.totalMasteredSounds >= 3) {
    options.push("I'm proud of your progress.");
  }

  if (options.length === 0) return [];
  const idx = hashPick(ctx.sessionSeed, ctx.turnIndex, "journey-welcome", options.length);
  const follow =
    focus && hashPick(ctx.sessionSeed, ctx.turnIndex, "journey-follow", 100) < 45
      ? "Let's try it together today."
      : null;
  return follow ? [options[idx]!, follow] : [options[idx]!];
}

/** Data-driven parent-trust observation (rate-limited). */
export function buildParentTrustObservation(ctx: CoachDialogueContext): string | null {
  const journey = journeyCtx(ctx);
  if (!journey) return null;
  if (!canUseMidSessionMemoryReference(ctx.memoryRefsUsed ?? 0, ctx.turnIndex, ctx.sessionSeed)) {
    return null;
  }

  const options: string[] = [];
  const strengthened = journey.improvingSounds[0] ?? journey.masteredSounds[0];
  if (strengthened) {
    options.push(
      `I noticed the ${formatJourneySoundForSpeech(strengthened.promptText)} is much stronger now.`,
    );
  }
  if (journey.improvingSounds.length >= 2) {
    options.push("You are improving steadily.");
  }
  if (journey.blendsCompleted) {
    options.push("Blending skills are getting better.");
  }
  if (journey.totalMasteredSounds >= 5) {
    options.push("You are learning new sounds every day.");
  }

  if (options.length === 0) return null;
  const idx = hashPick(ctx.sessionSeed, ctx.turnIndex, "parent-trust", options.length);
  return options[idx]!;
}

/** 0–2 lines referencing prior learning. Counts toward memory rate limit. */
export function buildMemoryWelcomeLines(ctx: CoachDialogueContext): string[] {
  const mem = memoryCtx(ctx);
  if (!mem) return [];

  const lines: string[] = [];
  const useName = hashPick(ctx.sessionSeed, 0, "return:name", 100) < 90;
  lines.push(fillName(pickLine(RETURNING_WELCOME, ctx, "return-welcome", 1), ctx.childName, useName));

  const journeyLines = buildJourneyWelcomeLines(ctx);
  if (journeyLines.length > 0) {
    lines.push(...journeyLines.slice(0, 2));
    return lines.slice(0, 3);
  }

  const facts: string[] = [];
  if (mem.consecutivePracticeDays >= 3) {
    facts.push(`You have practiced ${mem.consecutivePracticeDays} days in a row — wonderful.`);
  } else if (mem.pronunciationPct >= 75 && mem.promptsAttempted >= 8) {
    facts.push("Your speaking has been getting clearer each time we practice.");
  }

  if (facts.length > 0) {
    const idx = hashPick(ctx.sessionSeed, ctx.turnIndex, "return-fact", facts.length);
    lines.push(facts[idx]!);
  }

  return lines.slice(0, 2);
}

function buildAdaptiveToneLine(ctx: CoachDialogueContext, salt: string): string | null {
  const tone = ctx.memory?.tone ?? "balanced";
  if (tone === "supportive") {
    return pickLine(SUPPORTIVE_EXTRA, ctx, `support:${salt}`, 0.1);
  }
  if (tone === "challenging") {
    const roll = hashPick(ctx.sessionSeed, ctx.turnIndex, `challenge:${salt}`, 100);
    if (roll > 35) return null;
    return pickLine(CHALLENGING_EXTRA, ctx, `challenge-line:${salt}`, 0.05);
  }
  return null;
}

/** Personal milestone during the current session. */
export function buildPersonalAchievementLine(
  ctx: CoachDialogueContext,
  streakAfterTurn: number,
): string | null {
  const mem = ctx.memory;
  const journey = mem?.journey;
  if (!mem || !journey) return null;

  if (journey.totalMasteredSounds === 10) {
    return "You have mastered 10 sounds.";
  }

  if (journey.vowelsMasteredCount >= 5 && ctx.turnIndex <= 2) {
    const roll = hashPick(ctx.sessionSeed, ctx.turnIndex, "vowel-complete", 100);
    if (roll < 35) return "You completed all your vowel sounds.";
  }

  if (journey.blendsCompleted && hashPick(ctx.sessionSeed, ctx.turnIndex, "blend-done", 100) < 25) {
    return "You finished your first blending lesson.";
  }

  if (journey.totalWordsPracticed >= 100 && hashPick(ctx.sessionSeed, ctx.turnIndex, "words-100", 100) < 30) {
    return "You have practiced one hundred words — amazing.";
  }

  for (const id of journey.achievements) {
    if (hashPick(ctx.sessionSeed, ctx.turnIndex, `ach-${id}`, 100) < 12) {
      return pickLine(
        [`You reached ${achievementLabel(id)}.`, `What a milestone — ${achievementLabel(id)}.`],
        ctx,
        `achievement-${id}`,
        0.1,
      );
    }
  }

  if (
    streakAfterTurn > mem.longestStreakEver &&
    streakAfterTurn >= 3 &&
    streakAfterTurn === (ctx.sessionBestStreak ?? streakAfterTurn)
  ) {
    return pickLine(
      ["That is your longest streak yet.", "Wow — a new personal best!"],
      ctx,
      "achievement-streak",
      0.3,
    );
  }

  if (ctx.sessionIndex === ctx.sessionTotal - 1 && ctx.turnIndex >= ctx.sessionTotal - 1) {
    const roll = hashPick(ctx.sessionSeed, ctx.turnIndex, "achievement-complete", 100);
    if (roll < 40) return pickLine(SKILL_CELEBRATIONS, ctx, "skill-celebrate", 0.15);
  }

  if (
    mem.consecutivePracticeDays >= 3 &&
    ctx.turnIndex === 0 &&
    hashPick(ctx.sessionSeed, 0, "achievement-days", 100) < 30
  ) {
    return pickLine(
      [
        "You have practiced three days in a row.",
        "Three practice days in a row — amazing dedication.",
      ],
      ctx,
      "achievement-practice-days",
      0.2,
    );
  }

  if (
    journey.totalMasteredSounds >= 5 &&
    streakAfterTurn >= 4 &&
    hashPick(ctx.sessionSeed, ctx.turnIndex, "achievement-expert", 100) < 22
  ) {
    return pickLine(SKILL_CELEBRATIONS, ctx, "achievement-expert", 0.15);
  }

  return null;
}

export function buildEffortMemoryLine(ctx: CoachDialogueContext): string | null {
  const journey = journeyCtx(ctx);
  if (!journey?.hadRecentStruggle) return null;
  const roll = hashPick(ctx.sessionSeed, ctx.turnIndex, "effort", 100);
  if (roll > 40) return null;
  return pickLine(EFFORT_PRAISE, ctx, "effort-memory", 0.08);
}

export function buildMidSessionMemoryLine(ctx: CoachDialogueContext): string | null {
  const trust = buildParentTrustObservation(ctx);
  if (trust) return trust;

  const mem = memoryCtx(ctx);
  const journey = mem?.journey;
  if (!mem || !journey) return null;
  if (!canUseMidSessionMemoryReference(ctx.memoryRefsUsed ?? 0, ctx.turnIndex, ctx.sessionSeed)) {
    return null;
  }

  const options: string[] = [];
  const improving = journey.improvingSounds[0];
  if (improving) {
    options.push(`The ${formatJourneySoundForSpeech(improving.promptText)} is sounding clearer now.`);
  }
  if (mem.practiceDaysThisWeek >= 2) {
    options.push("I love that you keep coming back to learn.");
  }
  if (options.length === 0) return null;

  const idx = hashPick(ctx.sessionSeed, ctx.turnIndex, "mid-memory", options.length);
  return options[idx]!;
}

export function buildSessionGreeting(ctx: CoachDialogueContext): string[] {
  const memoryLines = buildMemoryWelcomeLines(ctx);
  const idx = hashPick(ctx.sessionSeed, 0, "greeting", SESSION_GREETINGS.length);
  const template = SESSION_GREETINGS[idx]!;
  const useName = hashPick(ctx.sessionSeed, 0, "greeting:name", 100) < 85;

  if (memoryLines.length > 0) {
    const tail = template.slice(1).map((line) => fillName(line, ctx.childName, useName));
    return [...memoryLines, ...tail.slice(0, 3)];
  }

  return template.map((line) => fillName(line, ctx.childName, useName));
}

export function buildActivityIntro(ctx: CoachDialogueContext): string[] {
  const kind = activityKind(ctx.promptKind);
  return [...ACTIVITY_INTROS[kind]];
}

export function buildItemInvite(ctx: CoachDialogueContext): string {
  return pickLine(ITEM_INVITES, ctx, `invite:${ctx.sessionIndex}`, 0.15);
}

/** Spoken prompt text for a practice item (one clip per Hear tap). */
export function buildItemPromptLines(
  _ctx: CoachDialogueContext,
  prompt: PronouncePrompt,
): string[] {
  return [getPromptSpeakText(prompt)];
}

/** Occasional encouragement while the child is speaking. Returns null most turns. */
export function buildListeningEncouragement(ctx: CoachDialogueContext): string | null {
  const supportive = ctx.memory?.tone === "supportive";
  const roll = hashPick(ctx.sessionSeed, ctx.turnIndex, "listen", 100);
  if (roll > (supportive ? 42 : 28)) return null;
  if (supportive && roll < 18) {
    return pickLine(SUPPORTIVE_EXTRA, ctx, "listen-support", 0.08);
  }
  return pickLine(LISTENING_ENCOURAGEMENTS, ctx, "listening", 0.2);
}

export function buildStreakCelebration(streak: number, ctx: CoachDialogueContext): string | null {
  const mem = ctx.memory;
  if (mem && streak > mem.longestStreakEver && streak >= 3) {
    return pickLine(
      ["That is your longest streak yet.", "A new personal best streak — wow!"],
      ctx,
      "streak-record",
      0.35,
    );
  }
  if (streak === 3) return pickLine(STREAK_AT_3, ctx, "streak3", 0.5);
  if (streak === 5) return pickLine(STREAK_AT_5, ctx, "streak5", 0.5);
  if (streak >= 8 && streak % 3 === 0) {
    return pickLine(STREAK_LONG, ctx, `streak${streak}`, 0.45);
  }
  return null;
}

export function buildProgressNote(ctx: CoachDialogueContext): string[] {
  const lines: string[] = [];
  const midMemory = buildMidSessionMemoryLine(ctx);
  if (midMemory) lines.push(midMemory);

  if (ctx.sessionTotal <= 2) return lines;
  const remaining = ctx.sessionTotal - ctx.sessionIndex - 1;
  const halfway = ctx.sessionIndex === Math.floor(ctx.sessionTotal / 2);
  if (halfway) lines.push(pickLine(PROGRESS_HALFWAY, ctx, "progress-half", 0.4));
  else if (remaining === 2) lines.push(pickLine(PROGRESS_NEAR_END, ctx, "progress-end", 0.35));

  return lines;
}

const GROWTH_CLOSINGS: readonly string[] = [
  "Your pronunciation is getting clearer.",
  "We are getting stronger every day.",
  "I can't wait to continue tomorrow.",
  "You are becoming a confident speaker.",
  "Your practice is really paying off.",
  "I noticed how much clearer you sounded today.",
  "You are learning new sounds every day.",
];

export function buildSessionClosing(
  ctx: CoachDialogueContext,
  _sessionScore: number,
  _sessionBestStreak: number,
): string[] {
  const mem = memoryCtx(ctx);
  const journey = mem?.journey;
  const useName = hashPick(ctx.sessionSeed, ctx.turnIndex, "closing:name", 100) < 90;

  if (mem) {
    const lines: string[] = [
      fillName("Amazing work today, {childName}.", ctx.childName, useName),
    ];

    if (journey?.recentlyMastered.length) {
      const sound = journey.recentlyMastered[0]!;
      lines.push(`You are getting stronger with the ${formatJourneySoundForSpeech(sound.promptText)}.`);
    } else {
      const idx = hashPick(ctx.sessionSeed, ctx.turnIndex, "growth-close", GROWTH_CLOSINGS.length);
      lines.push(GROWTH_CLOSINGS[idx]!);
    }

    if (journey?.hadRecentStruggle) {
      lines.push(pickLine(EFFORT_PRAISE, ctx, "close-effort", 0.1));
    } else {
      lines.push(pickLine(["I can't wait to see you again.", "See you next time!", "Until next time!"], ctx, "close-bye", 0.5));
    }
    return lines.slice(0, 4);
  }

  const idx = hashPick(ctx.sessionSeed, ctx.turnIndex, "closing", SESSION_CLOSINGS.length);
  const template = SESSION_CLOSINGS[idx]!;
  return template.map((line) => fillName(line, ctx.childName, useName));
}

/** How many memory reference lines were included in a spoken block. */
export function countMemoryReferences(lines: readonly string[]): number {
  return lines.filter((l) =>
    /welcome back|last time|remember|mastered|worked hard|tricky|practice.*together|improving|stronger|clearer|confident speaker|learning new sounds|days in a row|continue tomorrow|getting stronger|improved your|noticed the/i.test(l),
  ).length;
}

function praiseForFeedback(feedback: TranscriptFeedback, ctx: CoachDialogueContext): string {
  if (feedback === "great") return pickLine(PRAISE_GREAT, ctx, "praise-great", 0.4);
  if (feedback === "close") return pickLine(PRAISE_CLOSE, ctx, "praise-close", 0.25);
  return pickLine(PRAISE_TRY_AGAIN, ctx, "praise-retry", 0.2);
}

function correctionLines(prompt: PronouncePrompt, ctx: CoachDialogueContext): string[] {
  const spoken = getPromptSpeakText(prompt);
  const variant = hashPick(ctx.sessionSeed, ctx.turnIndex, "correction", 3);
  if (variant === 0) {
    return ["Let's try that again.", "Listen carefully.", spoken, "Now you try."];
  }
  if (variant === 1) {
    return ["Listen to me first.", spoken, "Your turn — say it back."];
  }
  return ["One more time together.", spoken, "Can you copy that?"];
}

export function buildFeedbackLines(
  ctx: CoachDialogueContext,
  prompt: PronouncePrompt,
  result: TranscriptResult,
  transcript: string,
  streakAfterTurn: number,
): { spokenLines: string[]; displayFeedback: string; improvement: string | null } {
  const trimmed = transcript.trim();
  if (!trimmed) {
    const line = pickLine(EMPTY_TRANSCRIPT_LINES, ctx, "empty", 0.3);
    return {
      spokenLines: [line, ...correctionLines(prompt, ctx)],
      displayFeedback: line,
      improvement: "Say it a little louder, close to the microphone.",
    };
  }

  const praise = praiseForFeedback(result.feedback, ctx);
  const streakLine = result.feedback === "great" ? buildStreakCelebration(streakAfterTurn, ctx) : null;
  const achievement =
    result.feedback === "great"
      ? buildPersonalAchievementLine({ ...ctx, sessionBestStreak: streakAfterTurn }, streakAfterTurn)
      : null;
  const adaptive =
    result.feedback === "great" && ctx.memory?.tone === "challenging"
      ? buildAdaptiveToneLine(ctx, "feedback")
      : result.feedback !== "great" && ctx.memory?.tone === "supportive"
        ? buildAdaptiveToneLine(ctx, "feedback-support")
        : null;

  if (result.feedback === "great") {
    const growth =
      hashPick(ctx.sessionSeed, ctx.turnIndex, "growth-praise", 100) < 30
        ? pickLine(GROWTH_PRAISE, ctx, "growth", 0.12)
        : null;
    const lines = [praise, growth, streakLine, achievement, adaptive].filter(Boolean) as string[];
    return { spokenLines: lines.length > 0 ? lines : [praise], displayFeedback: praise, improvement: null };
  }

  const coaching = correctionLines(prompt, ctx);
  const supportLine = ctx.memory?.tone === "supportive" ? buildAdaptiveToneLine(ctx, "retry") : null;
  const effortLine = buildEffortMemoryLine(ctx);
  const spoken = [praise, supportLine, effortLine, ...coaching].filter(Boolean) as string[];
  return {
    spokenLines: spoken,
    displayFeedback: praise,
    improvement: coaching.join(" "),
  };
}

export function evaluateCoachResponse(
  prompt: PronouncePrompt,
  transcript: string,
  ctx: CoachDialogueContext,
): CoachEvaluationResult {
  const trimmed = transcript.trim();
  const passAt = ctx.toddler ? 70 : 80;
  const closeAt = ctx.toddler ? 45 : 50;

  if (!trimmed) {
    const fb = buildFeedbackLines(ctx, prompt, { score: 0, feedback: "try_again", normalizedExpected: "", normalizedActual: "" }, "", ctx.streak);
    return {
      feedback: "try_again",
      score: 0,
      correct: false,
      confidence: 0,
      points: 0,
      transcript: "",
      spokenLines: fb.spokenLines,
      displayFeedback: fb.displayFeedback,
      improvement: fb.improvement,
      streakLine: null,
    };
  }

  const result = compareTranscript(prompt.text, trimmed, {
    kind: prompt.kind,
    ageMonths: ctx.ageMonths,
  });
  const correct = result.score >= passAt;
  const close = result.score >= closeAt;
  const streakAfter = correct ? ctx.streak + 1 : ctx.streak;
  const fb = buildFeedbackLines(ctx, prompt, result, trimmed, streakAfter);
  const streakLine =
    correct && streakAfter > ctx.streak
      ? buildStreakCelebration(streakAfter, ctx)
      : null;

  return {
    feedback: result.feedback,
    score: result.score,
    correct,
    confidence: Math.round(result.score) / 100,
    points: correct ? 10 : close ? 4 : 0,
    transcript: trimmed,
    spokenLines: fb.spokenLines,
    displayFeedback: fb.displayFeedback,
    improvement: fb.improvement,
    streakLine,
  };
}

/** Display-only feedback line for companion UI (no TTS). */
export function pickCoachDisplayFeedback(
  feedback: TranscriptFeedback,
  score: number,
  ctx: CoachDialogueContext,
): string {
  const pseudoResult: TranscriptResult = {
    score,
    feedback,
    normalizedExpected: "",
    normalizedActual: "",
  };
  const fb = buildFeedbackLines(ctx, { id: "", kind: ctx.promptKind, text: "", ageBands: [], i18nKeyHint: "" }, pseudoResult, "spoken", ctx.streak);
  return fb.displayFeedback;
}

/** Legacy-compatible intro hint for companion UI. */
export function coachActivityIntroHint(kind: PronouncePromptKind): string {
  const lines = ACTIVITY_INTROS[activityKind(kind)];
  return lines.join(" ");
}

function flattenCoachTemplates(...groups: readonly (readonly string[])[]): string[] {
  const out: string[] = [];
  for (const group of groups) {
    for (const line of group) out.push(line);
  }
  return out;
}

/** Coach dialogue lines for static TTS pre-generation and static-audio-map. */
export function getCoachDialogueAudioTextsForStaticCatalog(): string[] {
  const templates = [
    ...flattenCoachTemplates(...SESSION_GREETINGS, ...SESSION_CLOSINGS),
    ...RETURNING_WELCOME,
    ...ACTIVITY_INTROS.phoneme,
    ...ACTIVITY_INTROS.word,
    ...ACTIVITY_INTROS.sentence,
    ...ITEM_INVITES,
    ...LISTENING_ENCOURAGEMENTS,
    ...PRAISE_GREAT,
    ...PRAISE_CLOSE,
    ...PRAISE_TRY_AGAIN,
    ...STREAK_AT_3,
    ...STREAK_AT_5,
    ...STREAK_LONG,
    ...PROGRESS_HALFWAY,
    ...PROGRESS_NEAR_END,
    ...EMPTY_TRANSCRIPT_LINES,
    ...SUPPORTIVE_EXTRA,
    ...CHALLENGING_EXTRA,
    ...GROWTH_PRAISE,
    ...EFFORT_PRAISE,
    ...SKILL_CELEBRATIONS,
    ...GROWTH_CLOSINGS,
  ];

  return buildCoachDialogueAudioTexts([...templates, ...getCoachDialogueExtraAudioTexts()]);
}

export {
  getCoachDialogueWarmupPhrases,
  COACH_DIALOGUE_WARMUP_PHRASES,
  substituteCoachNameForStatic,
} from "./coach-audio-corpus";
