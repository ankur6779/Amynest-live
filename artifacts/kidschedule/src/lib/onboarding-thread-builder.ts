/**
 * Onboarding thread view-model — maps wizard step state to ChatThread messages.
 */
import type { TFunction } from "i18next";
import {
  getClassOptionsForCountry,
  getEducationStagesForChild,
} from "@workspace/education-stages";
import type { InteractionSpec, ThreadMessage } from "@/components/chat-thread";
import type { ChatMessage, OnboardingStep } from "@/lib/onboarding-chat-types";
import { flagEmojiFromCode } from "@/components/onboarding-country-modal";
import { getSmartWakeSleepDefaults } from "@/lib/onboarding-premium";
import {
  getAgeBandOptions,
  getChildNameSuggestions,
  getSchoolSchedulePresets,
  getSleepTimeRanges,
  getWakeTimeRanges,
} from "@/lib/onboarding-keyboard-free";

export const ONBOARDING_COMPOSER_STEPS = new Set<OnboardingStep>([]);

export const ONBOARDING_INTERACTIVE_STEPS = new Set<OnboardingStep>([
  "country-confirm",
  "child-name",
  "child-dob",
  "child-birthday",
  "infant-feeding",
  "infant-sleep",
  "child-education-stage",
  "child-class-grade",
  "child-schedule-known",
  "child-school-start",
  "child-school-end",
  "child-school-days",
  "child-wake",
  "child-sleep",
  "parent-name",
  "parent-role",
  "parent-work",
  "parent-region",
  "parent-diet",
  "parent-goals",
  "parent-allergies",
]);

export interface OnboardingThreadContext {
  step: OnboardingStep;
  messages: ChatMessage[];
  typing: boolean;
  /** Progressive loading copy while typing / recovering from a hang. */
  typingStatusLabel?: string | null;
  isFinishing: boolean;
  t: TFunction;
  countryCode: string;
  countryName: string;
  locationState: { status: string };
  locationSource: string | null;
  locationRequesting: boolean;
  regionDrillDown: boolean;
  countryCodeForRegion: string;
  finishError: string | null;
  childAgeYears: number;
  childAgeMonths: number;
  suggestedParentName?: string;
  parentNameEditing?: boolean;
  schoolScheduleCustom?: boolean;
  birthdayInitialIso?: string;
  handlers: {
    onAllowLocation: () => void;
    onPickCountryManually: () => void;
    onConfirmDetectedCountry: () => void;
    onChangeCountry: () => void;
  };
}

const WAKE_OPTS = ["5:30 AM", "6:00 AM", "6:30 AM", "7:00 AM", "7:30 AM", "8:00 AM", "8:30 AM"];
const SLEEP_OPTS = ["8:00 PM", "8:30 PM", "9:00 PM", "9:30 PM", "10:00 PM", "10:30 PM", "11:00 PM"];
const SCHOOL_START_OPTS = ["7:00 AM", "7:30 AM", "8:00 AM", "8:30 AM", "9:00 AM", "9:30 AM"];
const SCHOOL_END_OPTS = ["12:00 PM", "1:00 PM", "1:30 PM", "2:00 PM", "2:30 PM", "3:00 PM", "4:00 PM"];

const GLOBAL_CUISINES = [
  { value: "western", labelKey: "region_western", emoji: "🥗" },
  { value: "asian", labelKey: "region_asian", emoji: "🍜" },
  { value: "middle_eastern", labelKey: "region_middle_eastern", emoji: "🧆" },
  { value: "vegetarian", labelKey: "region_plant_based", emoji: "🌱" },
  { value: "mixed", labelKey: "region_mixed", emoji: "🌍" },
  { value: "indian", labelKey: "region_indian_cuisine", emoji: "🍛" },
];

const INDIAN_SUBCUISINES = [
  { value: "north_indian", labelKey: "region_north", emoji: "🫕" },
  { value: "south_indian", labelKey: "region_south", emoji: "🥘" },
  { value: "gujarati", labelKey: "region_gujarati", emoji: "🫙" },
  { value: "maharashtrian", labelKey: "region_maharashtrian", emoji: "🍛" },
  { value: "punjabi", labelKey: "region_punjabi", emoji: "🍗" },
  { value: "bengali", labelKey: "region_bengali", emoji: "🐟" },
  { value: "pan_indian", labelKey: "region_mixed_indian", emoji: "🍱" },
];

const ONBOARDING_DIET_OPTIONS = [
  { value: "vegetarian", emoji: "🥦", labelKey: "diet_vegetarian" },
  { value: "vegan", emoji: "🌱", labelKey: "diet_vegan" },
  { value: "eggetarian", emoji: "🥚", labelKey: "diet_eggetarian" },
  { value: "non_veg", emoji: "🍗", labelKey: "diet_non_veg" },
  { value: "jain", emoji: "🙏", labelKey: "diet_jain" },
  { value: "halal", emoji: "☪️", labelKey: "diet_halal" },
  { value: "kosher", emoji: "✡️", labelKey: "diet_kosher" },
  { value: "sattvik", emoji: "🕉️", labelKey: "diet_sattvik" },
];

const ONBOARDING_ALLERGY_CHIPS = [
  { value: "dairy", emoji: "🥛", labelKey: "allergy_dairy" },
  { value: "gluten", emoji: "🌾", labelKey: "allergy_gluten" },
  { value: "eggs", emoji: "🥚", labelKey: "allergy_eggs" },
  { value: "nuts", emoji: "🥜", labelKey: "allergy_nuts" },
  { value: "peanuts", emoji: "🥜", labelKey: "allergy_peanuts" },
  { value: "soy", emoji: "🫘", labelKey: "allergy_soy" },
  { value: "shellfish", emoji: "🦐", labelKey: "allergy_shellfish" },
  { value: "sesame", emoji: "🌰", labelKey: "allergy_sesame" },
];

const PARENT_GOAL_CODES = [
  "improve_sleep",
  "reduce_tantrums",
  "improve_focus",
  "reduce_screen_time",
  "increase_independence",
] as const;

export function buildOnboardingStepInteraction(ctx: OnboardingThreadContext): InteractionSpec | null {
  const { step, t, handlers, countryCode, countryName, locationState, locationRequesting, locationSource } = ctx;

  switch (step) {
    case "country-confirm": {
      const isLocating = locationState.status === "fetching" || locationState.status === "fallback";
      const needsPermission = locationState.status === "needs-permission";
      const showDetected = locationState.status === "detected" && countryCode;
      return {
        type: "country-detect",
        isLocating,
        needsPermission,
        detected: showDetected
          ? {
              code: countryCode,
              name: countryName,
              flag: flagEmojiFromCode(countryCode),
              sourceLabel:
                locationSource === "ip"
                  ? t("screens.onboarding.country_detected_ip")
                  : t("screens.onboarding.country_detected_in"),
            }
          : undefined,
        onAllowLocation: handlers.onAllowLocation,
        onPickManually: handlers.onPickCountryManually,
        onConfirmDetected: handlers.onConfirmDetectedCountry,
        onChangeCountry: handlers.onChangeCountry,
        locationRequesting,
      };
    }
    case "child-name":
      return {
        type: "name-suggestions",
        suggestions: getChildNameSuggestions(ctx.countryCodeForRegion),
      };
    case "child-dob":
      return {
        type: "age-select",
        options: getAgeBandOptions().map((band) => ({
          id: band.id,
          label: t(`screens.onboarding.${band.labelKey}`),
          years: band.years,
          months: band.months,
        })),
      };
    case "child-birthday":
      return {
        type: "birthday-collect",
        selectLabel: t("screens.onboarding.birthday_select"),
        skipLabel: t("screens.onboarding.birthday_skip"),
        confirmLabel: t("screens.onboarding.birthday_confirm"),
        maxDate: new Date().toISOString().split("T")[0],
        initialIso: ctx.birthdayInitialIso,
      };
    case "parent-name": {
      const suggested = ctx.suggestedParentName?.trim();
      if (suggested && !ctx.parentNameEditing) {
        return {
          type: "name-confirm",
          suggestedName: suggested,
          confirmLabel: t("screens.onboarding.parent_name_confirm_yes"),
          editLabel: t("screens.onboarding.parent_name_confirm_edit"),
        };
      }
      return {
        type: "name-input",
        placeholder: t("screens.onboarding.parent_name_placeholder"),
        confirmLabel: t("screens.onboarding.parent_name_continue"),
        initialValue: suggested ?? "",
      };
    }
    case "infant-feeding":
      return {
        type: "single-select",
        layout: "card",
        options: [
          { id: "breast", label: t("screens.onboarding.feeding_breast"), value: "breastfeeding" },
          { id: "formula", label: t("screens.onboarding.feeding_formula"), value: "formula" },
          { id: "mixed", label: t("screens.onboarding.feeding_both"), value: "mixed" },
        ],
      };
    case "infant-sleep":
      return {
        type: "single-select",
        layout: "card",
        options: [
          { id: "good", label: t("screens.onboarding.sleep_good"), value: "flexible" },
          { id: "average", label: t("screens.onboarding.sleep_average"), value: "irregular" },
          { id: "difficult", label: t("screens.onboarding.sleep_difficult"), value: "short_naps" },
        ],
      };
    case "child-education-stage": {
      const stages = getEducationStagesForChild(
        ctx.countryCodeForRegion,
        ctx.childAgeYears,
        ctx.childAgeMonths,
      );
      return {
        type: "single-select",
        layout: "card",
        options: stages.map((s) => ({
          id: s.code,
          label: `${s.emoji} ${t(`screens.onboarding.${s.labelKey}`)}`,
          value: s.code,
        })),
      };
    }
    case "child-class-grade": {
      const grades = getClassOptionsForCountry(ctx.countryCodeForRegion);
      return {
        type: "single-select",
        layout: "grid",
        options: grades.map((grade) => ({
          id: grade,
          label: grade,
          value: grade,
        })),
      };
    }
    case "child-schedule-known":
      return {
        type: "single-select",
        layout: "row",
        options: [
          { id: "yes", label: t("screens.onboarding.schedule_yes"), value: "yes" },
          { id: "later", label: t("screens.onboarding.schedule_later"), value: "later" },
        ],
      };
    case "child-school-start":
      if (!ctx.schoolScheduleCustom) {
        return {
          type: "school-schedule",
          presets: getSchoolSchedulePresets().map((preset) => ({
            id: preset.id,
            label: t(`screens.onboarding.${preset.labelKey}`),
            start: preset.start,
            end: preset.end,
            days: preset.days,
          })),
          customLabel: t("screens.onboarding.school_preset_custom"),
        };
      }
      return { type: "time-quick", options: SCHOOL_START_OPTS, allowCustom: true };
    case "child-school-end":
      return { type: "time-quick", options: SCHOOL_END_OPTS, allowCustom: true };
    case "child-school-days": {
      const labels = [
        t("screens.onboarding.day_mon"),
        t("screens.onboarding.day_tue"),
        t("screens.onboarding.day_wed"),
        t("screens.onboarding.day_thu"),
        t("screens.onboarding.day_fri"),
        t("screens.onboarding.day_sat"),
        t("screens.onboarding.day_sun"),
      ];
      return {
        type: "multi-select",
        min: 0,
        max: 7,
        confirmLabel: t("screens.onboarding.continue"),
        options: labels.map((label, i) => ({
          id: String(i + 1),
          label,
          value: String(i + 1),
        })),
      };
    }
    case "child-wake": {
      const wakeDefaults = getSmartWakeSleepDefaults(ctx.childAgeYears, ctx.childAgeMonths);
      const wakeOpts = [wakeDefaults.wakeLabel, ...WAKE_OPTS.filter((o) => o !== wakeDefaults.wakeLabel)];
      return {
        type: "time-range",
        ranges: getWakeTimeRanges().map((range) => ({
          id: range.id,
          label: t(`screens.onboarding.${range.labelKey}`),
          displayTime: range.displayTime,
        })),
        exactLabel: t("screens.onboarding.time_exact_wake"),
        exactOptions: wakeOpts,
      };
    }
    case "child-sleep": {
      const sleepDefaults = getSmartWakeSleepDefaults(ctx.childAgeYears, ctx.childAgeMonths);
      const sleepOpts = [sleepDefaults.sleepLabel, ...SLEEP_OPTS.filter((o) => o !== sleepDefaults.sleepLabel)];
      return {
        type: "time-range",
        ranges: getSleepTimeRanges().map((range) => ({
          id: range.id,
          label: t(`screens.onboarding.${range.labelKey}`),
          displayTime: range.displayTime,
        })),
        exactLabel: t("screens.onboarding.time_exact_sleep"),
        exactOptions: sleepOpts,
      };
    }
    case "parent-role":
      return {
        type: "single-select",
        layout: "card",
        options: [
          { id: "mother", label: t("screens.onboarding.role_mother"), value: "Mother" },
          { id: "father", label: t("screens.onboarding.role_father"), value: "Father" },
          { id: "guardian", label: t("screens.onboarding.role_guardian"), value: "Guardian" },
          { id: "grand", label: t("screens.onboarding.role_grandparent"), value: "Grandparent" },
        ],
      };
    case "parent-work":
      return {
        type: "single-select",
        layout: "card",
        options: [
          { id: "stay_home", label: t("screens.onboarding.work_stay_home"), value: "not_working" },
          { id: "full_time", label: t("screens.onboarding.work_full_time"), value: "office" },
          { id: "part_time", label: t("screens.onboarding.work_part_time"), value: "office" },
          { id: "shift", label: t("screens.onboarding.work_shift"), value: "office" },
          { id: "freelance", label: t("screens.onboarding.work_freelance"), value: "work_from_home" },
        ],
      };
    case "parent-region": {
      const isSouthAsian = ["IN", "PK", "BD", "LK", "NP"].includes(ctx.countryCodeForRegion);
      const showingIndianSubs = isSouthAsian || ctx.regionDrillDown;
      const cuisines = showingIndianSubs ? INDIAN_SUBCUISINES : GLOBAL_CUISINES;
      return {
        type: "multi-select",
        min: 1,
        max: 3,
        confirmLabel: t("screens.onboarding.continue"),
        options: cuisines.map((c) => ({
          id: c.value,
          label: `${c.emoji} ${t(`screens.onboarding.${c.labelKey}`)}`,
          value: c.value,
        })),
      };
    }
    case "parent-diet":
      return {
        type: "single-select",
        layout: "card",
        options: ONBOARDING_DIET_OPTIONS.map((opt) => ({
          id: opt.value,
          label: `${opt.emoji} ${t(`screens.onboarding.${opt.labelKey}`)}`,
          value: opt.value,
        })),
      };
    case "parent-goals":
      return {
        type: "multi-select",
        min: 0,
        confirmLabel: t("screens.onboarding.continue"),
        skipLabel: t("screens.onboarding.skip_later"),
        options: PARENT_GOAL_CODES.map((code) => ({
          id: code,
          label: t(`intelligence.goals.options.${code}`),
          value: code,
        })),
      };
    case "parent-allergies":
      return {
        type: "multi-select",
        min: 0,
        confirmLabel: t("screens.onboarding.continue"),
        skipLabel: t("screens.onboarding.no_allergies_button"),
        allowOtherInput: true,
        otherOptionId: "other",
        otherPlaceholder: t("screens.onboarding.allergies_other_placeholder"),
        options: [
          ...ONBOARDING_ALLERGY_CHIPS.map((chip) => ({
            id: chip.value,
            label: `${chip.emoji} ${t(`screens.onboarding.${chip.labelKey}`)}`,
            value: chip.value,
          })),
          {
            id: "other",
            label: `➕ ${t("screens.onboarding.allergy_add_another")}`,
            value: "other",
          },
        ],
      };
    default:
      return null;
  }
}

export function buildOnboardingThreadMessages(ctx: OnboardingThreadContext): ThreadMessage[] {
  const items: ThreadMessage[] = ctx.messages.map((m) =>
    m.role === "amy"
      ? { kind: "amy" as const, id: m.id, text: m.text }
      : { kind: "user" as const, id: m.id, text: m.text },
  );

  // Never show a dots-only intro-boot dead-end. If Step 1 has no messages yet,
  // surface progressive status copy instead of infinite bare typing dots.
  if (ctx.step === "intro" && ctx.messages.length === 0 && !ctx.typing) {
    items.push({
      kind: "typing",
      id: "intro-boot",
      statusLabel:
        ctx.typingStatusLabel
        ?? ctx.t("screens.onboarding.preparing_first_question"),
    });
  }

  if (ctx.typing) {
    items.push({
      kind: "typing",
      id: "typing",
      statusLabel: ctx.typingStatusLabel ?? undefined,
    });
  }

  // Keep Step 1 interactive controls visible even while a short typing delay runs,
  // so a hung amySays timer can never blank the conversation.
  const showInteraction =
    !ctx.isFinishing
    && ctx.step !== "intro"
    && ONBOARDING_INTERACTIVE_STEPS.has(ctx.step)
    && !(ctx.typing && ctx.step !== "country-confirm");

  if (showInteraction) {
    const interaction = buildOnboardingStepInteraction(ctx);
    if (interaction) {
      items.push({
        kind: "interactive",
        id: `step-${ctx.step}`,
        interaction,
        state: { status: "pending" },
        theme: "onboarding",
      });
    }
  }

  return items;
}

export function onboardingComposerPlaceholder(_step: OnboardingStep, t: TFunction): string {
  return t("screens.onboarding.message_amy", { defaultValue: "Message Amy…" });
}
