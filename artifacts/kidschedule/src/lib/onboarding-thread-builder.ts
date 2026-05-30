/**
 * Onboarding thread view-model — maps wizard step state to ChatThread messages.
 */
import type { TFunction } from "i18next";
import type { InteractionSpec, ThreadMessage } from "@/components/chat-thread";
import type { ChatMessage, OnboardingStep } from "@/lib/onboarding-chat-types";
import { flagEmojiFromCode } from "@/components/onboarding-country-modal";

export const ONBOARDING_COMPOSER_STEPS = new Set<OnboardingStep>([
  "child-name",
  "parent-name",
  "parent-mobile",
]);

export const ONBOARDING_INTERACTIVE_STEPS = new Set<OnboardingStep>([
  "country-confirm",
  "child-dob",
  "infant-feeding",
  "infant-sleep",
  "child-school",
  "child-class",
  "child-school-start",
  "child-school-end",
  "child-school-days",
  "child-wake",
  "child-sleep",
  "add-more",
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
const CLASS_KEYS = ["class_nursery", "class_lkg", "class_ukg", "class_1", "class_2", "class_3", "class_4", "class_5", "class_6plus"];
const CLASS_VALUES = ["Nursery", "LKG / KG", "UKG", "1st", "2nd", "3rd", "4th", "5th", "6th+"];

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

function getClassLabels(t: TFunction, countryCode: string): { labels: string[]; values: string[] } {
  const useSouthAsian = ["IN", "PK", "BD", "LK", "NP"].includes(countryCode);
  if (useSouthAsian) {
    return {
      labels: CLASS_KEYS.map((k) => t(`screens.onboarding.${k}`)),
      values: CLASS_VALUES,
    };
  }
  const v = ["Kindergarten", "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8+"];
  return { labels: v, values: v };
}

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
    case "child-dob":
      return {
        type: "date",
        max: new Date().toISOString().split("T")[0],
        confirmLabel: t("screens.onboarding.confirm_dob"),
      };
    case "infant-feeding":
      return {
        type: "single-select",
        layout: "row",
        options: [
          { id: "breast", label: t("screens.onboarding.feeding_breast"), value: "breastfeeding" },
          { id: "formula", label: t("screens.onboarding.feeding_formula"), value: "formula" },
          { id: "mixed", label: t("screens.onboarding.feeding_both"), value: "mixed" },
        ],
      };
    case "infant-sleep":
      return {
        type: "single-select",
        layout: "stack",
        options: [
          { id: "flex", label: t("screens.onboarding.sleep_flexible"), value: "flexible" },
          { id: "irreg", label: t("screens.onboarding.sleep_irregular"), value: "irregular" },
          { id: "short", label: t("screens.onboarding.sleep_short"), value: "short_naps" },
        ],
      };
    case "child-school":
      return {
        type: "single-select",
        layout: "row",
        options: [
          { id: "yes", label: t("screens.onboarding.yes_school"), value: "yes" },
          { id: "no", label: t("screens.onboarding.no_school"), value: "no" },
        ],
      };
    case "child-class": {
      const { labels, values } = getClassLabels(t, ctx.countryCodeForRegion);
      return {
        type: "single-select",
        layout: "grid",
        options: labels.map((label, i) => ({
          id: values[i] ?? label,
          label,
          value: values[i] ?? label,
        })),
      };
    }
    case "child-school-start":
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
    case "child-wake":
      return { type: "time-quick", options: WAKE_OPTS, allowCustom: true };
    case "child-sleep":
      return { type: "time-quick", options: SLEEP_OPTS, allowCustom: true };
    case "add-more":
      return {
        type: "single-select",
        layout: "row",
        options: [
          { id: "yes", label: t("screens.onboarding.yes_add_another"), value: "yes" },
          { id: "no", label: t("screens.onboarding.no_continue"), value: "no" },
        ],
      };
    case "parent-role":
      return {
        type: "single-select",
        layout: "grid",
        options: [
          { id: "mother", label: t("screens.onboarding.role_mother"), value: "Mother" },
          { id: "father", label: t("screens.onboarding.role_father"), value: "Father" },
          { id: "both", label: t("screens.onboarding.role_both"), value: "Both" },
          { id: "grand", label: t("screens.onboarding.role_grandparent"), value: "Grandparent" },
        ],
      };
    case "parent-work":
      return {
        type: "single-select",
        layout: "stack",
        options: [
          { id: "wfh", label: t("screens.onboarding.work_home"), value: "work_from_home" },
          { id: "office", label: t("screens.onboarding.work_office"), value: "office" },
          { id: "nw", label: t("screens.onboarding.work_not_working"), value: "not_working" },
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
        layout: "grid",
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
        options: ONBOARDING_ALLERGY_CHIPS.map((chip) => ({
          id: chip.value,
          label: `${chip.emoji} ${t(`screens.onboarding.${chip.labelKey}`)}`,
          value: chip.value,
        })),
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

  if (ctx.typing) {
    items.push({ kind: "typing", id: "typing" });
  }

  if (
    !ctx.typing &&
    !ctx.isFinishing &&
    ctx.step !== "intro" &&
    ONBOARDING_INTERACTIVE_STEPS.has(ctx.step)
  ) {
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

export function onboardingComposerPlaceholder(step: OnboardingStep, t: TFunction): string {
  switch (step) {
    case "child-name":
      return t("screens.onboarding.child_name_placeholder");
    case "parent-name":
      return t("screens.onboarding.parent_name_placeholder");
    case "parent-mobile":
      return t("screens.onboarding.mobile_placeholder");
    default:
      return t("screens.onboarding.message_amy", { defaultValue: "Message Amy…" });
  }
}
