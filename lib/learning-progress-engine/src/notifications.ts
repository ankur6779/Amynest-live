/**
 * Phase 6 — Notification copy.
 *
 * Generates warm, low-frequency notification copy from existing engine state.
 * No new triggers or schedulers are introduced here — callers decide when to
 * send. The engine only decides *what* the message should say.
 *
 * Rules:
 *  - Never guilt or shame.
 *  - At most 1 notification per day per child.
 *  - Skip entirely if Amy doesn't have something meaningful to say.
 */

import type { LearningProgressProfile } from "./types";
import type { LearningMemory } from "./learning-memory";
import type { ComebackMission } from "./re-engagement";

export type NotificationKind =
  | "gentle_invite"
  | "celebration"
  | "comeback"
  | "tomorrow_preview"
  | "skip";

export interface LearningNotification {
  kind: NotificationKind;
  title: string;
  body: string;
  /** Suggested deep link path. */
  href: string;
  /** Coarse priority — clients can use it to choose channel/tone. */
  priority: "low" | "normal";
}

const FALLBACK_CHILD = "your child";

export function buildLearningNotification(input: {
  profile: LearningProgressProfile;
  memory: LearningMemory;
  childName?: string;
  comeback?: ComebackMission | null;
  /** Local hour 0-23, for time-of-day appropriate copy. */
  hourOfDay?: number;
}): LearningNotification {
  const name = input.childName ?? FALLBACK_CHILD;
  const hour = input.hourOfDay ?? new Date().getHours();
  const timeOfDay =
    hour < 11 ? "morning" : hour < 17 ? "afternoon" : "evening";

  if (input.comeback) {
    return {
      kind: "comeback",
      title: `A warm welcome for ${name}`,
      body: input.comeback.message,
      href: input.comeback.href,
      priority: "low",
    };
  }

  if (input.memory.lastSessionCompletedAt) {
    const today = new Date().toISOString().slice(0, 10);
    if (input.memory.lastSessionCompletedAt === today) {
      // Already learned today — don't ping again.
      return {
        kind: "skip",
        title: "",
        body: "",
        href: "/parenting-hub",
        priority: "low",
      };
    }
  }

  if (input.profile.streakDays >= 3 && timeOfDay === "evening") {
    return {
      kind: "gentle_invite",
      title: "A calm learning moment",
      body: `${name}'s rhythm is glowing — a 5-minute session keeps it warm.`,
      href: "/parenting-hub",
      priority: "low",
    };
  }

  if (input.memory.strongestCategory) {
    return {
      kind: "tomorrow_preview",
      title: "Amy prepared something gentle",
      body: `A light ${input.memory.strongestCategory} adventure is ready when ${name} is.`,
      href: "/parenting-hub",
      priority: "low",
    };
  }

  return {
    kind: "gentle_invite",
    title: "Ready for a quiet learning moment?",
    body: `No pressure — Amy has a 5-minute spark ready for ${name}.`,
    href: "/parenting-hub",
    priority: "low",
  };
}
