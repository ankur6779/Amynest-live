import type { SpeechCoachV2Badge, SpeechCoachV2BadgeId, SpeechCoachV2EvaluationScores } from "./types";

export const SPEECH_COACH_V2_BADGES: Record<SpeechCoachV2BadgeId, SpeechCoachV2Badge> = {
  clear_speaker: {
    id: "clear_speaker",
    label: "Clear Speaker",
    emoji: "✨",
    description: "Spoke with excellent clarity",
  },
  brave_voice: {
    id: "brave_voice",
    label: "Brave Voice",
    emoji: "🦁",
    description: "Tried a confidence challenge",
  },
  fluency_hero: {
    id: "fluency_hero",
    label: "Fluency Hero",
    emoji: "🌊",
    description: "Smooth, flowing speech",
  },
  sentence_star: {
    id: "sentence_star",
    label: "Sentence Star",
    emoji: "⭐",
    description: "Completed full sentences",
  },
  word_wizard: {
    id: "word_wizard",
    label: "Word Wizard",
    emoji: "🪄",
    description: "Practiced many words today",
  },
  conversation_champ: {
    id: "conversation_champ",
    label: "Conversation Champ",
    emoji: "🏆",
    description: "Great turn-taking in conversation",
  },
};

export function pointsForScore(overallScore: number): number {
  if (overallScore >= 90) return 15;
  if (overallScore >= 75) return 10;
  if (overallScore >= 60) return 6;
  return 3;
}

export function starsForScore(overallScore: number): number {
  if (overallScore >= 85) return 3;
  if (overallScore >= 70) return 2;
  return 1;
}

export function badgesFromSession(input: {
  scores: SpeechCoachV2EvaluationScores[];
  wordsSpoken: number;
  sentencesCompleted: number;
  completedConfidenceChallenge: boolean;
}): SpeechCoachV2BadgeId[] {
  const earned = new Set<SpeechCoachV2BadgeId>();
  if (input.scores.length === 0) return [];

  const numericKeys = [
    "transcriptAccuracy",
    "pronunciationEstimate",
    "fluencyScore",
    "speakingRateScore",
    "confidenceScore",
    "completionScore",
    "overallScore",
    "accuracyScore",
  ] as const;

  const avg = (key: (typeof numericKeys)[number]) =>
    Math.round(
      input.scores.reduce((sum, s) => sum + s[key], 0) / input.scores.length,
    );

  if (avg("accuracyScore") >= 80) earned.add("clear_speaker");
  if (avg("fluencyScore") >= 78) earned.add("fluency_hero");
  if (input.sentencesCompleted >= 2) earned.add("sentence_star");
  if (input.wordsSpoken >= 8) earned.add("word_wizard");
  if (input.completedConfidenceChallenge) earned.add("brave_voice");
  if (avg("confidenceScore") >= 75 && input.scores.length >= 3) earned.add("conversation_champ");

  return [...earned];
}

export function streakMessage(streakDays: number): string {
  if (streakDays >= 7) return `Wow! ${streakDays} days in a row! You're a speech superstar!`;
  if (streakDays >= 3) return `${streakDays} day streak! Keep it going!`;
  if (streakDays >= 2) return "Two days in a row — amazing!";
  return "Great start today!";
}
