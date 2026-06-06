import type { TFunction } from "i18next";
import type { OnboardingStep } from "@/lib/onboarding-chat-types";
import { formatChildAgeWithEstimate } from "@/lib/child-age-display";
import { formatEducationStageLabel } from "@/lib/education-stage-display";
import type { EducationStageCode } from "@workspace/education-stages";

export type OnboardingMilestoneId =
  | "family"
  | "child"
  | "habits"
  | "routine";

export type OnboardingMilestone = {
  id: OnboardingMilestoneId;
  labelKey: string;
};

export const ONBOARDING_MILESTONES: OnboardingMilestone[] = [
  { id: "family", labelKey: "milestone_family" },
  { id: "child", labelKey: "milestone_child" },
  { id: "habits", labelKey: "milestone_habits" },
  { id: "routine", labelKey: "milestone_routine" },
];

const STEP_MILESTONE: Partial<Record<OnboardingStep, OnboardingMilestoneId>> = {
  intro: "family",
  "country-confirm": "family",
  "child-name": "child",
  "child-dob": "child",
  "child-birthday": "child",
  "infant-feeding": "child",
  "infant-sleep": "child",
  "child-education-stage": "child",
  "child-class-grade": "child",
  "child-schedule-known": "child",
  "child-school-start": "habits",
  "child-school-end": "habits",
  "child-school-days": "habits",
  "child-wake": "habits",
  "child-sleep": "habits",
  "parent-name": "family",
  "parent-role": "family",
  "parent-work": "family",
  "parent-region": "routine",
  "parent-diet": "routine",
  "parent-goals": "routine",
  "parent-allergies": "routine",
  saving: "routine",
  done: "routine",
  notifications: "routine",
};

export function getActiveMilestoneIndex(step: OnboardingStep): number {
  const id = STEP_MILESTONE[step] ?? "family";
  return ONBOARDING_MILESTONES.findIndex((m) => m.id === id);
}

export function childDisplayName(
  name: string | undefined,
  t: TFunction,
): string {
  const trimmed = name?.trim();
  if (trimmed) return trimmed;
  return t("screens.onboarding.default_child_name");
}

export function getSmartWakeSleepDefaults(
  years: number,
  months: number,
): { wakeUpTime: string; sleepTime: string; wakeLabel: string; sleepLabel: string } {
  const total = years * 12 + months;
  if (total < 12) {
    return { wakeUpTime: "07:00", sleepTime: "19:30", wakeLabel: "7:00 AM", sleepLabel: "7:30 PM" };
  }
  if (total < 36) {
    return { wakeUpTime: "07:00", sleepTime: "20:00", wakeLabel: "7:00 AM", sleepLabel: "8:00 PM" };
  }
  if (total < 72) {
    return { wakeUpTime: "07:00", sleepTime: "21:00", wakeLabel: "7:00 AM", sleepLabel: "9:00 PM" };
  }
  return { wakeUpTime: "06:30", sleepTime: "21:30", wakeLabel: "6:30 AM", sleepLabel: "9:30 PM" };
}

export type PreviewCard = {
  id: string;
  emoji: string;
  textKey: string;
  textParams?: Record<string, string>;
};

export function buildPreviewCards(input: {
  childName?: string;
  educationStage?: EducationStageCode | string;
  wakeTime?: string;
  hasSchoolSchedule?: boolean;
  t: TFunction;
}): PreviewCard[] {
  const name = childDisplayName(input.childName, input.t);
  const cards: PreviewCard[] = [];

  if (input.childName?.trim()) {
    cards.push({
      id: "learning-name",
      emoji: "✨",
      textKey: "preview_learning_name",
      textParams: { name },
    });
  }

  if (input.educationStage) {
    const stageLabel = formatEducationStageLabel(input.educationStage, input.t);
    cards.push({
      id: "stage",
      emoji: "🌱",
      textKey: "preview_stage",
      textParams: { name, stage: stageLabel },
    });
  }

  if (input.wakeTime) {
    cards.push({
      id: "wake",
      emoji: "☀️",
      textKey: "preview_wake",
      textParams: { name, time: input.wakeTime },
    });
  }

  if (input.hasSchoolSchedule) {
    cards.push({
      id: "school",
      emoji: "🏫",
      textKey: "preview_school",
      textParams: { name },
    });
  }

  if (cards.length === 0) {
    cards.push({
      id: "start",
      emoji: "💜",
      textKey: "preview_start",
      textParams: { name },
    });
  }

  return cards.slice(0, 3);
}

export function buildMemoryMessage(
  step: OnboardingStep,
  input: {
    childName?: string;
    educationStage?: string;
    wakeTime?: string;
    t: TFunction;
  },
): string | null {
  const name = childDisplayName(input.childName, input.t);
  if (step === "child-wake" && input.educationStage) {
    const stage = formatEducationStageLabel(input.educationStage, input.t);
    return input.t("screens.onboarding.memory_stage", { name, stage });
  }
  if (step === "parent-name" && input.wakeTime) {
    return input.t("screens.onboarding.memory_wake", { name, time: input.wakeTime });
  }
  return null;
}

export function getTrustMessageKey(step: OnboardingStep): string | null {
  if (step === "intro" || step === "country-confirm") return "trust_intro";
  if (step === "child-name" || step === "child-dob" || step === "child-birthday") return "trust_child";
  if (step === "parent-goals" || step === "parent-allergies") return "trust_almost_done";
  return null;
}

/** Footer reassurance copy — uses child name once known. */
export function getTrustFooterMessage(
  step: OnboardingStep,
  childName: string | undefined,
  t: TFunction,
): string | null {
  const key = getTrustMessageKey(step);
  if (!key) return null;
  const name = childName?.trim();
  if (key === "trust_child" && name) {
    return t("screens.onboarding.trust_child_named", { name });
  }
  return t(`screens.onboarding.${key}`);
}

/** Occasional “why we ask” hints — not on every step. */
export function getValuePreviewKey(step: OnboardingStep): string | null {
  if (step === "child-education-stage") return "value_preview_stage";
  if (step === "child-wake") return "value_preview_wake";
  if (step === "child-sleep") return "value_preview_sleep";
  if (step === "child-schedule-known" || step === "child-school-start") return "value_preview_schedule";
  if (step === "parent-goals") return "value_preview_goals";
  return null;
}

export function getSkipReassuranceKey(step: OnboardingStep): string | null {
  if (step === "child-birthday") return "skip_reassurance_dob";
  if (step === "child-schedule-known") return "skip_reassurance_schedule";
  if (step === "parent-allergies") return "skip_reassurance_allergies";
  return null;
}

export type LiveProfileCheckItem = {
  id: string;
  text: string;
};

export function buildLiveProfile(input: {
  childName?: string;
  ageYears?: number;
  ageMonths?: number;
  dobIsEstimated?: boolean;
  educationStage?: string;
  wakeLabel?: string;
  parentGoal?: string;
  t: TFunction;
}): LiveProfileCheckItem[] {
  const items: LiveProfileCheckItem[] = [];
  if (!input.childName?.trim()) return items;

  if (input.ageYears != null || input.ageMonths != null) {
    const years = input.ageYears ?? 0;
    const months = input.ageMonths ?? 0;
    const ageText = formatChildAgeWithEstimate(years, months, input.dobIsEstimated, input.t);
    items.push({
      id: "age",
      text: input.t("screens.onboarding.live_profile_check_age", { age: ageText }),
    });
  }

  if (input.educationStage) {
    items.push({
      id: "stage",
      text: formatEducationStageLabel(input.educationStage, input.t),
    });
  }

  if (input.wakeLabel) {
    items.push({
      id: "wake",
      text: input.t("screens.onboarding.live_profile_check_wake", { time: input.wakeLabel }),
    });
  }

  if (input.parentGoal) {
    items.push({
      id: "goal",
      text: input.t("screens.onboarding.live_profile_check_goal", { goal: input.parentGoal }),
    });
  }

  return items;
}

export type CompletionSummaryItem = {
  text: string;
};

export function buildCompletionSummary(input: {
  childName: string;
  ageYears: number;
  ageMonths: number;
  educationStage?: string;
  wakeTime?: string;
  parentGoals: string[];
  t: TFunction;
}): CompletionSummaryItem[] {
  const items: CompletionSummaryItem[] = [];

  const ageText =
    input.ageYears > 0
      ? input.t("screens.onboarding.summary_age_years", {
          years: String(input.ageYears),
        })
      : input.t("screens.onboarding.summary_age_months", {
          months: String(input.ageMonths),
        });
  items.push({ text: ageText });

  if (input.educationStage) {
    items.push({
      text: input.t("screens.onboarding.summary_stage", {
        stage: formatEducationStageLabel(input.educationStage, input.t),
      }),
    });
  }

  if (input.wakeTime) {
    items.push({
      text: input.t("screens.onboarding.summary_wake", {
        time: input.wakeTime,
      }),
    });
  }

  if (input.parentGoals.length > 0) {
    const goal = input.parentGoals[0];
    const goalLabel = input.t(`intelligence.goals.options.${goal}`, { defaultValue: goal });
    items.push({
      text: input.t("screens.onboarding.summary_goal", { goal: goalLabel }),
    });
  } else {
    items.push({
      text: input.t("screens.onboarding.summary_goal_default"),
    });
  }

  return items;
}

export const SAVING_PROGRESS_KEYS = [
  "saving_progress_1",
  "saving_progress_2",
  "saving_progress_3",
  "saving_progress_4",
] as const;

export const ROUTINE_GENERATING_KEYS = [
  "generating_routine_1",
  "generating_routine_2",
  "generating_routine_3",
  "dashboard_handoff",
] as const;

export function isSimpleOnboardingProfile(input: {
  childCount: number;
  ageYears: number;
  educationStage?: string;
  scheduleKnown?: boolean;
}): boolean {
  return (
    input.childCount <= 1 &&
    input.ageYears >= 2 &&
    input.ageYears <= 6 &&
    input.educationStage !== "school" &&
    input.scheduleKnown !== true
  );
}

export function buildWakeAmyMessages(input: {
  childName: string;
  ageYears: number;
  ageMonths: number;
  educationStage?: string;
  scheduleKnown?: boolean;
  childCount: number;
  t: TFunction;
}): string[] {
  const name = childDisplayName(input.childName, input.t);
  const msgs: string[] = [];
  const memory = buildMemoryMessage("child-wake", {
    childName: input.childName,
    educationStage: input.educationStage,
    t: input.t,
  });
  if (memory) msgs.push(memory);

  const defaults = getSmartWakeSleepDefaults(input.ageYears, input.ageMonths);
  msgs.push(
    input.t("screens.onboarding.wake_question_suggested", {
      name,
      suggested: defaults.wakeLabel,
    }),
  );

  if (
    isSimpleOnboardingProfile({
      childCount: input.childCount,
      ageYears: input.ageYears,
      educationStage: input.educationStage,
      scheduleKnown: input.scheduleKnown,
    })
  ) {
    msgs.push(input.t("screens.onboarding.fast_path_hint"));
  }

  return msgs;
}
