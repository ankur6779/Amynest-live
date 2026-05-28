/**
 * Phase 7 — Family milestones.
 *
 * Detects rare, emotionally meaningful learning milestones (first reading
 * streak, 100th session, first full week, comeback recovery, yearly recap,
 * etc) so the host can show a single warm celebration card.
 *
 * Hard rules:
 *  - At most ONE milestone per call; the most meaningful wins.
 *  - Same milestone never fires twice for the same child (host stores the
 *    `seenMilestoneIds` set and passes it back in).
 *  - Output copy is gentle and parent-shareable.
 */

import type { LearningProgressProfile } from "./types";
import type { LearningMemory } from "./learning-memory";

export type FamilyMilestoneKind =
  | "first_session"
  | "first_streak_3"
  | "first_streak_7"
  | "first_streak_30"
  | "first_full_week"
  | "first_reading_streak"
  | "first_speech_confidence"
  | "session_100"
  | "session_365"
  | "comeback_recovery"
  | "yearly_recap";

export interface FamilyMilestone {
  id: FamilyMilestoneKind;
  title: string;
  message: string;
  emoji: string;
  /** Suggested CTA / share label. */
  shareLabel: string;
  shareableSummary: string;
}

const ORDER: FamilyMilestoneKind[] = [
  "session_365",
  "yearly_recap",
  "session_100",
  "first_streak_30",
  "first_streak_7",
  "first_streak_3",
  "comeback_recovery",
  "first_reading_streak",
  "first_speech_confidence",
  "first_full_week",
  "first_session",
];

function build(
  id: FamilyMilestoneKind,
  childName: string,
): FamilyMilestone {
  switch (id) {
    case "first_session":
      return {
        id,
        emoji: "🌱",
        title: "First learning moment",
        message: `${childName} took the very first step today — small, brave, magical.`,
        shareLabel: "Share this moment",
        shareableSummary: `${childName} just started their AmyNest learning journey 🌱`,
      };
    case "first_streak_3":
      return {
        id,
        emoji: "✨",
        title: "First gentle rhythm",
        message: `Three days in a row — ${childName} is finding their learning rhythm.`,
        shareLabel: "Celebrate",
        shareableSummary: `${childName} reached a 3-day learning rhythm with Amy ✨`,
      };
    case "first_streak_7":
      return {
        id,
        emoji: "🌟",
        title: "A full week together",
        message: `Seven days of warm, calm learning — beautiful work, ${childName}.`,
        shareLabel: "Share",
        shareableSummary: `${childName} just hit a 7-day learning streak 🌟`,
      };
    case "first_streak_30":
      return {
        id,
        emoji: "🏆",
        title: "A month of growing",
        message: `Thirty days of showing up. That's the quiet kind of magic.`,
        shareLabel: "Share",
        shareableSummary: `${childName} reached 30 days of learning 🏆`,
      };
    case "first_full_week":
      return {
        id,
        emoji: "📅",
        title: "First full learning week",
        message: `${childName} explored learning every day this week — gentle, consistent magic.`,
        shareLabel: "Share",
        shareableSummary: `${childName} completed their first full learning week 📅`,
      };
    case "first_reading_streak":
      return {
        id,
        emoji: "📖",
        title: "Reading confidence is blooming",
        message: `${childName} is building real reading momentum — slow and warm.`,
        shareLabel: "Share",
        shareableSummary: `${childName} hit their first reading milestone with Amy 📖`,
      };
    case "first_speech_confidence":
      return {
        id,
        emoji: "🗣️",
        title: "Speaking confidence is growing",
        message: `Speech feels easier today — ${childName}'s voice is finding its rhythm.`,
        shareLabel: "Share",
        shareableSummary: `${childName} reached a speaking confidence milestone 🗣️`,
      };
    case "session_100":
      return {
        id,
        emoji: "💯",
        title: "100 learning moments",
        message: `One hundred gentle sessions — ${childName} is truly growing.`,
        shareLabel: "Share",
        shareableSummary: `${childName} just completed their 100th AmyNest session 💯`,
      };
    case "session_365":
      return {
        id,
        emoji: "🎂",
        title: "A whole learning year",
        message: `365 quiet moments of growth. What a beautiful year together.`,
        shareLabel: "Share",
        shareableSummary: `${childName} completed a full year of learning with Amy 🎂`,
      };
    case "comeback_recovery":
      return {
        id,
        emoji: "🌈",
        title: "A warm return",
        message: `${childName} came back and learned — that takes more courage than people realize.`,
        shareLabel: "Share",
        shareableSummary: `${childName} reignited their learning streak 🌈`,
      };
    case "yearly_recap":
      return {
        id,
        emoji: "🪄",
        title: "This year, in one frame",
        message: `Twelve months of curiosity, courage, and small daily magic.`,
        shareLabel: "See the year",
        shareableSummary: `A year of AmyNest learning moments 🪄`,
      };
  }
}

export interface DetectMilestonesInput {
  profile: LearningProgressProfile;
  memory: LearningMemory;
  /** Milestones already shown — never re-emit. */
  seenMilestoneIds: FamilyMilestoneKind[];
  childName: string;
}

/**
 * Returns the SINGLE most meaningful new milestone, or `null` when none apply.
 */
export function detectFamilyMilestone(input: DetectMilestonesInput): FamilyMilestone | null {
  const seen = new Set(input.seenMilestoneIds);
  const candidates: FamilyMilestoneKind[] = [];

  const activities = input.profile.completedActivities.length;
  const streak = input.profile.streakDays;
  const memory = input.memory;

  if (activities >= 1) candidates.push("first_session");
  if (streak >= 3) candidates.push("first_streak_3");
  if (streak >= 7) {
    candidates.push("first_streak_7");
    candidates.push("first_full_week");
  }
  if (streak >= 30) candidates.push("first_streak_30");
  if (activities >= 100) candidates.push("session_100");
  if (activities >= 365) candidates.push("session_365");
  if (memory.strongestCategory === "phonics" && streak >= 5) {
    candidates.push("first_reading_streak");
  }
  if (
    (memory.strongestCategory === "speech" ||
      memory.favoriteModules.includes("speech")) &&
    streak >= 3
  ) {
    candidates.push("first_speech_confidence");
  }
  if (memory.sessionStreakDays >= 2 && input.profile.streakDays >= 1 && memory.lastSessionCompletedAt) {
    // Heuristic: came back after at least one inactive day.
    candidates.push("comeback_recovery");
  }

  for (const key of ORDER) {
    if (candidates.includes(key) && !seen.has(key)) {
      return build(key, input.childName);
    }
  }
  return null;
}
