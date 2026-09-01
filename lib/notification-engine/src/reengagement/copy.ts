import { assignExperimentVariant } from "../outcomes/experiments.js";
import {
  REENGAGEMENT_POLICY,
  type ReengagementCopyVariant,
} from "./policy.js";
import { sanitizeLockScreenCopy } from "./privacy.js";
import type { ReengagementSegment } from "./segments.js";
import {
  REENGAGEMENT_DEEP_LINKS,
  type ReengagementCategory,
} from "./taxonomy.js";

export interface ReengagementCopy {
  title: string;
  body: string;
  deepLink: string;
  variant: ReengagementCopyVariant;
  experimentId: string;
}

export function copyVariantForUser(userId: string): ReengagementCopyVariant {
  const assigned = assignExperimentVariant(
    userId,
    REENGAGEMENT_POLICY.experimentId,
    [...REENGAGEMENT_POLICY.experimentVariants],
  );
  return assigned === "next_right_thing" ? "next_right_thing" : "plan_ready";
}

export function buildCategoryCopy(input: {
  userId: string;
  category: ReengagementCategory;
  segment: ReengagementSegment;
  childName?: string | null;
  daysSinceLastActive: number;
  deepLinkOverride?: string | null;
}): ReengagementCopy {
  const variant = copyVariantForUser(input.userId);
  const deepLink = input.deepLinkOverride || defaultDeepLink(input.category, input.segment);
  const raw = rawCopy(input.category, variant, input.daysSinceLastActive, input.segment);
  const safe = sanitizeLockScreenCopy(raw.title, raw.body);
  return {
    title: safe.title,
    body: safe.body,
    deepLink,
    variant,
    experimentId: REENGAGEMENT_POLICY.experimentId,
  };
}

function defaultDeepLink(
  category: ReengagementCategory,
  segment: ReengagementSegment,
): string {
  switch (category) {
    case "UNFINISHED_ACTION":
      return segment === "NEW_USER"
        ? REENGAGEMENT_DEEP_LINKS.onboarding
        : REENGAGEMENT_DEEP_LINKS.todayPlan;
    case "TODAY_PLAN":
    case "CHILD_CONTEXT":
    case "ROUTINE_CONTINUITY":
      return REENGAGEMENT_DEEP_LINKS.todayPlan;
    case "AMY_COMPANION":
      return REENGAGEMENT_DEEP_LINKS.amy;
    case "WEEKLY_RECAP":
      return REENGAGEMENT_DEEP_LINKS.weekly;
    case "WINBACK":
    case "GENERIC_REMINDER":
    default:
      return REENGAGEMENT_DEEP_LINKS.hub;
  }
}

function rawCopy(
  category: ReengagementCategory,
  variant: ReengagementCopyVariant,
  days: number,
  segment: ReengagementSegment,
): { title: string; body: string } {
  switch (category) {
    case "UNFINISHED_ACTION":
      if (segment === "NEW_USER") {
        return {
          title: "Your next step is still here",
          body: "You can pick this up whenever you're ready — no rush.",
        };
      }
      return {
        title: "You can pick this up whenever you're ready",
        body: "Your next step is still here. One small return is enough.",
      };

    case "TODAY_PLAN":
      if (variant === "plan_ready") {
        return {
          title: "Today's plan is ready",
          body: "A calmer day starts with one small step.",
        };
      }
      return {
        title: "Ready for today's next right thing?",
        body: "Amy has today's next right thing ready.",
      };

    case "CHILD_CONTEXT":
      return {
        title: "Your next step is ready",
        body: "A small step is waiting — only if it feels right today.",
      };

    case "ROUTINE_CONTINUITY":
      return {
        title: "Ready for today's next step?",
        body: "Your routine is waiting whenever you're ready.",
      };

    case "AMY_COMPANION":
      return {
        title: "Need help with today? Amy is here",
        body: "You can talk to Amy whenever today feels complicated.",
      };

    case "WEEKLY_RECAP":
      return {
        title: "Your week with Amy is ready to look back on",
        body: "A quiet recap is here — no pressure, just what's already happened.",
      };

    case "WINBACK":
      if (days >= 30) {
        return {
          title: "Come back whenever you need a calmer next step",
          body: "Amy is here when you're ready. Nothing was lost.",
        };
      }
      if (days >= 14) {
        return {
          title: "Amy is still here when you're ready",
          body: "No rush — you can return whenever it helps.",
        };
      }
      return {
        title: "Ready to pick up where you left off?",
        body: "Your next step is saved. Come back whenever you like.",
      };

    case "GENERIC_REMINDER":
    default:
      return {
        title: "Want to check in with Amy?",
        body: "A calmer next step is here whenever you need it.",
      };
  }
}
