import type { PremiumPromptTrigger } from "@/lib/premium-prompt";
import {
  resolveValueSheetCtaVariant,
  resolveValueSheetHeadlineVariant,
  type ValueSheetCtaVariant,
  type ValueSheetHeadlineVariant,
} from "@/lib/mrr-experiment-flags";

export type PremiumMomentCopy = {
  emoji: string;
  title: string;
  subtitle: string;
  cta: string;
  benefits: string[];
};

const BASE_BENEFITS = [
  "Unlimited routines",
  "AI Parenting Coach",
  "Speech Coach",
  "Health Lab",
];

const TRIGGER_COPY: Record<PremiumPromptTrigger, Omit<PremiumMomentCopy, "cta">> = {
  first_routine: {
    emoji: "🎉",
    title: "Great job!",
    subtitle: "Your child's first routine is ready. Families using Premium stay consistent longer.",
    benefits: BASE_BENEFITS,
  },
  routine_limit: {
    emoji: "✨",
    title: "You've built 3 routines",
    subtitle: "Continue with unlimited routines and keep your family's schedule growing.",
    benefits: [
      "Unlimited routines",
      "Weekly progress reports",
      "AI Parenting Coach",
      "Speech Coach",
    ],
  },
  routine_completion: {
    emoji: "🏆",
    title: "Routine complete!",
    subtitle: "You're building a great habit. Premium helps families stay consistent week after week.",
    benefits: BASE_BENEFITS,
  },
  speech_complete: {
    emoji: "🗣️",
    title: "Speech session complete",
    subtitle: "Unlock unlimited Speech Coach sessions and track pronunciation progress.",
    benefits: [
      "Unlimited Speech Coach",
      "Pronunciation tracking",
      "AI Parenting Coach",
      "Weekly reports",
    ],
  },
  meal_plan: {
    emoji: "🥗",
    title: "Meal plan ready",
    subtitle: "Premium unlocks unlimited AI meal plans tailored to your family.",
    benefits: [
      "Unlimited meal plans",
      "Nutrition AI",
      "Family portions",
      "Health Lab",
    ],
  },
  worksheet_download: {
    emoji: "📄",
    title: "Worksheet downloaded",
    subtitle: "Get unlimited premium worksheets and PDF exports with Premium.",
    benefits: [
      "Premium worksheets",
      "PDF export",
      "Learning progress",
      "Unlimited routines",
    ],
  },
  health_insight: {
    emoji: "💚",
    title: "Health insight ready",
    subtitle: "Premium unlocks Health Lab, advanced insights, and weekly reports.",
    benefits: [
      "Health Lab",
      "Advanced insights",
      "Weekly reports",
      "AI Parenting Coach",
    ],
  },
  weekly_report: {
    emoji: "📊",
    title: "Your week with Amy",
    subtitle: "See the full picture with Premium weekly reports and advanced insights.",
    benefits: [
      "Weekly reports",
      "Advanced insights",
      "Unlimited AI",
      "Multiple children",
    ],
  },
};

function headlineForVariant(
  trigger: PremiumPromptTrigger,
  variant: ValueSheetHeadlineVariant,
): string {
  if (variant === "outcome" && trigger === "first_routine") {
    return "Your first routine is ready";
  }
  if (variant === "family" && trigger === "first_routine") {
    return "A calmer day starts here";
  }
  return TRIGGER_COPY[trigger].title;
}

function ctaForVariant(variant: ValueSheetCtaVariant): string {
  return variant === "unlock_unlimited" ? "Unlock unlimited" : "Continue Premium";
}

export function resolvePremiumMomentCopy(
  trigger: PremiumPromptTrigger,
): PremiumMomentCopy {
  const base = TRIGGER_COPY[trigger];
  return {
    ...base,
    title: headlineForVariant(trigger, resolveValueSheetHeadlineVariant()),
    cta: ctaForVariant(resolveValueSheetCtaVariant()),
  };
}

export const FREE_VS_PREMIUM_ROWS = [
  { label: "Routines", free: "3", premium: "Unlimited" },
  { label: "AI chats", free: "5/day", premium: "Unlimited" },
  { label: "Speech Coach", free: "3 sessions", premium: "Unlimited" },
  { label: "Children", free: "1", premium: "Up to 2" },
  { label: "Health Lab", free: "Preview", premium: "Full access" },
  { label: "PDF export", free: "—", premium: "✓" },
] as const;
