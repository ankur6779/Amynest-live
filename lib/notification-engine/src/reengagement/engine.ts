import type { OutcomeSignals } from "../outcomes/types.js";
import { inLocalQuietHours, getLocalDateTimeParts } from "../global/timezone.js";
import { contentFingerprint } from "../delivery/guard.js";
import { REENGAGEMENT_POLICY, CATEGORY_COOLDOWN_MS } from "./policy.js";
import {
  resolveReengagementSegment,
  type ReengagementSegment,
  type ReengagementAccountFlavor,
  type ActivityTag,
} from "./segments.js";
import {
  REENGAGEMENT_CATEGORIES,
  REENGAGEMENT_CATEGORY_PRIORITY,
  REENGAGEMENT_DEEP_LINKS,
  type ReengagementCategory,
} from "./taxonomy.js";
import { buildCategoryCopy, type ReengagementCopy } from "./copy.js";

export interface ReengagementFacts {
  todayPlanExists: boolean;
  todayPlanOpened: boolean;
  onboardingIncomplete: boolean;
  routineOpenedNotStarted: boolean;
  hasSpeechPracticeDue: boolean;
  lastActiveAt: Date | null;
  sentProactiveToday: number;
  sentProactiveThisWeek: number;
  lastSentByCategory: Partial<Record<ReengagementCategory, Date>>;
  hasPushToken: boolean;
  permissionGranted: boolean | undefined;
  engagementOptIn: boolean;
  timezone: string;
  quietHoursStart: string;
  quietHoursEnd: string;
  preferredHour: number | null;
}

export interface ReengagementCandidate {
  category: ReengagementCategory;
  copy: ReengagementCopy;
  reason: string;
  fingerprint: string;
  scheduledLocal: string;
  priority: number;
}

export type ReengagementSkipCode =
  | "mode_off"
  | "no_token"
  | "permission_denied"
  | "opted_out"
  | "quiet_hours"
  | "outside_send_window"
  | "recent_app_open"
  | "daily_cap"
  | "weekly_cap"
  | "cooldown"
  | "no_eligible_candidate"
  | "active_user_no_unfinished";

export interface ReengagementDecision {
  send: boolean;
  action: "would_send" | "skip" | "delay";
  skipCode: ReengagementSkipCode | null;
  segment: ReengagementSegment;
  accountFlavor: ReengagementAccountFlavor;
  activityTags: ActivityTag[];
  segmentReason: string;
  neverActivated: boolean;
  candidate: ReengagementCandidate | null;
  rejected: Array<{ category: ReengagementCategory; reason: string }>;
  gates: Record<string, boolean>;
  localDate: string;
  localHour: number;
}

export interface DecideReengagementInput {
  signals: OutcomeSignals;
  facts: ReengagementFacts;
  now?: Date;
  /** Evaluate the winner even outside the local send window (dry-run / audit). */
  ignoreSendWindow?: boolean;
}

export function decideReengagement(input: DecideReengagementInput): ReengagementDecision {
  const now = input.now ?? new Date();
  const { signals, facts } = input;
  const seg = resolveReengagementSegment(signals);
  const local = getLocalDateTimeParts(facts.timezone, now);
  const scheduledLocal = `${String(REENGAGEMENT_POLICY.preferredSendHour).padStart(2, "0")}:${String(REENGAGEMENT_POLICY.preferredSendMinute).padStart(2, "0")}`;

  const gates = {
    hasToken: facts.hasPushToken,
    permissionOk: facts.permissionGranted !== false,
    optedIn: facts.engagementOptIn,
    quietHours: inLocalQuietHours(
      facts.timezone,
      facts.quietHoursStart || REENGAGEMENT_POLICY.defaultQuietHoursStart,
      facts.quietHoursEnd || REENGAGEMENT_POLICY.defaultQuietHoursEnd,
      now,
    ),
    inSendWindow: isInSendWindow(local.hour, facts.preferredHour),
    recentAppOpen: isRecentlyOpened(facts, signals, now),
    dailyCapOk: facts.sentProactiveToday < REENGAGEMENT_POLICY.maxProactivePerDay,
    weeklyCapOk: facts.sentProactiveThisWeek < REENGAGEMENT_POLICY.maxProactivePerWeek,
  };

  const base = {
    segment: seg.segment,
    accountFlavor: seg.accountFlavor,
    activityTags: seg.activityTags,
    segmentReason: seg.reason,
    neverActivated: seg.neverActivated,
    localDate: local.localDate,
    localHour: local.hour,
    gates,
  };

  const { candidates, rejected } = collectCandidates(
    signals,
    facts,
    seg.segment,
    local.localDate,
    local.weekday,
  );

  const eligible: ReengagementCandidate[] = [];
  for (const c of candidates) {
    const last = facts.lastSentByCategory[c.category];
    if (last && now.getTime() - last.getTime() < CATEGORY_COOLDOWN_MS[c.category]) {
      rejected.push({ category: c.category, reason: "cooldown" });
      continue;
    }
    eligible.push(c);
  }

  eligible.sort((a, b) => b.priority - a.priority);
  const winner = eligible[0] ? { ...eligible[0], scheduledLocal } : null;

  const finish = (
    action: ReengagementDecision["action"],
    skipCode: ReengagementSkipCode | null,
  ): ReengagementDecision => ({
    ...base,
    send: action === "would_send",
    action,
    skipCode,
    candidate: winner,
    rejected,
  });

  if (!gates.hasToken) return finish("skip", "no_token");
  if (!gates.permissionOk) return finish("skip", "permission_denied");
  if (!gates.optedIn) return finish("skip", "opted_out");
  if (!gates.dailyCapOk) return finish("skip", "daily_cap");
  if (!gates.weeklyCapOk) return finish("skip", "weekly_cap");
  if (!winner) return finish("skip", "no_eligible_candidate");

  if (gates.quietHours) return finish("delay", "quiet_hours");
  if (!input.ignoreSendWindow && !gates.inSendWindow) {
    return finish("delay", "outside_send_window");
  }
  if (gates.recentAppOpen) {
    return finish("skip", "recent_app_open");
  }

  return finish("would_send", null);
}

function isInSendWindow(hour: number, preferredHour: number | null): boolean {
  if (hour < REENGAGEMENT_POLICY.sendWindowStartHour || hour >= REENGAGEMENT_POLICY.sendWindowEndHour) {
    return false;
  }
  if (preferredHour != null && preferredHour >= 0 && preferredHour <= 23) {
    return hour === preferredHour;
  }
  return hour === REENGAGEMENT_POLICY.preferredSendHour;
}

function isRecentlyOpened(facts: ReengagementFacts, _signals: OutcomeSignals, now: Date): boolean {
  if (!facts.lastActiveAt) return false;
  const mins = (now.getTime() - facts.lastActiveAt.getTime()) / 60000;
  return mins >= 0 && mins < REENGAGEMENT_POLICY.recentAppOpenSuppressionMinutes;
}

function collectCandidates(
  signals: OutcomeSignals,
  facts: ReengagementFacts,
  segment: ReengagementSegment,
  localDate: string,
  weekday: number,
): {
  candidates: ReengagementCandidate[];
  rejected: Array<{ category: ReengagementCategory; reason: string }>;
} {
  const rejected: Array<{ category: ReengagementCategory; reason: string }> = [];
  const candidates: ReengagementCandidate[] = [];

  const add = (
    category: ReengagementCategory,
    reason: string,
    deepLink?: string,
  ) => {
    const copy = buildCategoryCopy({
      userId: signals.userId,
      category,
      segment,
      childName: signals.childName,
      daysSinceLastActive: signals.daysSinceLastActive,
      deepLinkOverride: deepLink,
    });
    candidates.push({
      category,
      copy,
      reason,
      fingerprint: contentFingerprint(signals.childId, "reengagement", category.toLowerCase(), localDate),
      scheduledLocal: "",
      priority: REENGAGEMENT_CATEGORY_PRIORITY[category],
    });
  };

  const unfinished =
    facts.onboardingIncomplete ||
    facts.routineOpenedNotStarted ||
    signals.unfinishedLessonCount > 0 ||
    (signals.activationJourneyActive && signals.activationJourneyDay != null);

  if (unfinished) {
    const link = facts.onboardingIncomplete
      ? REENGAGEMENT_DEEP_LINKS.onboarding
      : signals.unfinishedLessonCount > 0
        ? REENGAGEMENT_DEEP_LINKS.learning
        : REENGAGEMENT_DEEP_LINKS.todayPlan;
    add("UNFINISHED_ACTION", "unfinished_flow", link);
  } else {
    rejected.push({ category: "UNFINISHED_ACTION", reason: "no_unfinished_action" });
  }

  if (facts.todayPlanExists && !facts.todayPlanOpened && signals.routinesCompletedToday === 0) {
    add("TODAY_PLAN", "today_plan_ready_unopened", REENGAGEMENT_DEEP_LINKS.todayPlan);
  } else {
    rejected.push({
      category: "TODAY_PLAN",
      reason: facts.todayPlanExists ? "today_plan_already_opened_or_done" : "no_today_plan",
    });
  }

  if (signals.routinesMissedYesterday) {
    add("CHILD_CONTEXT", "routine_missed_yesterday", REENGAGEMENT_DEEP_LINKS.todayPlan);
  } else if (facts.hasSpeechPracticeDue) {
    add("CHILD_CONTEXT", "speech_practice_due", REENGAGEMENT_DEEP_LINKS.speech);
  } else {
    rejected.push({ category: "CHILD_CONTEXT", reason: "no_real_child_event" });
  }

  const continuity =
    (segment === "AT_RISK_USER" || segment === "INACTIVE_3_DAYS") &&
    signals.firstRoutineCompleted;
  if (continuity) {
    add("ROUTINE_CONTINUITY", "routine_habit_gap", REENGAGEMENT_DEEP_LINKS.todayPlan);
  } else {
    rejected.push({ category: "ROUTINE_CONTINUITY", reason: "not_a_continuity_segment" });
  }

  const amyReason =
    (segment === "AT_RISK_USER" ||
      segment === "INACTIVE_3_DAYS" ||
      segment === "INACTIVE_7_DAYS" ||
      unfinished) &&
    segment !== "ACTIVE_USER";
  if (amyReason) {
    add("AMY_COMPANION", "check_in_with_amy", REENGAGEMENT_DEEP_LINKS.amy);
  } else {
    rejected.push({ category: "AMY_COMPANION", reason: "no_meaningful_amy_reason" });
  }

  const weeklyOk =
    weekday === 0 &&
    (signals.firstRoutineCompleted || signals.lessonsCompletedTotal > 0);
  if (weeklyOk) {
    add("WEEKLY_RECAP", "sunday_weekly_recap", REENGAGEMENT_DEEP_LINKS.weekly);
  } else {
    rejected.push({
      category: "WEEKLY_RECAP",
      reason: weekday === 0 ? "nothing_to_recap" : "not_sunday_local",
    });
  }

  const winbackDays =
    segment === "INACTIVE_3_DAYS" ||
    segment === "INACTIVE_7_DAYS" ||
    segment === "INACTIVE_14_DAYS" ||
    segment === "INACTIVE_30_DAYS";
  if (winbackDays) {
    add("WINBACK", `winback_${signals.daysSinceLastActive}d`, REENGAGEMENT_DEEP_LINKS.hub);
  } else {
    rejected.push({ category: "WINBACK", reason: "not_inactive_enough" });
  }

  // Generic only when nothing else qualified except we still want a reason to
  // record the skip — never add GENERIC if a higher candidate exists.
  if (candidates.length === 0 && segment !== "ACTIVE_USER") {
    add("GENERIC_REMINDER", "no_specific_trigger", REENGAGEMENT_DEEP_LINKS.hub);
  } else if (candidates.length === 0) {
    rejected.push({ category: "GENERIC_REMINDER", reason: "active_user_no_unfinished" });
  }

  void REENGAGEMENT_CATEGORIES;
  return { candidates, rejected };
}
