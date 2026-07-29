import type { PaywallReason } from "@/contexts/paywall-context";
import {
  PAYWALL_BIRTH_SKY,
  PAYWALL_GAMES,
  PAYWALL_HEALTH_LAB,
  PAYWALL_REASON_COPY,
  PRODUCT_AGE_RANGE,
} from "@workspace/subscription-marketing";

const CHILD_NAME_PLACEHOLDER = /\{childName\}/g;

type CopyBlock = { title: string; subtitle: string; cta?: string };

/** Phase-1 dynamic personalization — never generic “Premium feature”. */
const PERSONALIZED_TEMPLATES: Partial<
  Record<PaywallReason, (childName: string) => CopyBlock>
> = {
  ai_quota: (name) => ({
    title: `Amy is already helping you with ${name}`,
    subtitle:
      "Continue with unlimited personalized guidance every day—for meltdowns, homework, and bedtime.",
    cta: "Unlock Unlimited Guidance",
  }),
  infant_ai_quota: (name) => ({
    title: `Amy is already helping you with ${name}`,
    subtitle:
      "Continue with unlimited Baby Expert answers about sleep, feeding, and development.",
    cta: "Unlock Unlimited Guidance",
  }),
  learning_locked: (name) => ({
    title: `Continue today's learning journey for ${name}`,
    subtitle:
      "Keep phonics, study, math, and spelling progressing every day—so momentum never pauses.",
    cta: "Unlock All Learning",
  }),
  hub_locked: (name) => ({
    title: `Continue exploring the Hub for ${name}`,
    subtitle: `Life skills, stories, and age-right activities—curated for ages ${PRODUCT_AGE_RANGE}.`,
    cta: "Continue My Child's Journey",
  }),
  hub_journey: (name) => ({
    title: `Continue ${name}'s journey`,
    subtitle:
      "Keep daily paths, progress tracking, and hub activities that match where they are today.",
    cta: "Continue My Child's Journey",
  }),
  routines_limit: (name) => ({
    title: `Amy has already created routines ${name} loves`,
    subtitle: "Continue creating personalized routines every day.",
    cta: "Continue Building Routines",
  }),
  speech_coach: (name) => ({
    title: `${name} finished today's practice`,
    subtitle: "Keep building confidence together with unlimited conversations.",
    cta: "Continue Building Confidence",
  }),
  coach_locked: (name) => ({
    title: `A plan for ${name}'s exact moment`,
    subtitle:
      "Amy Coach turns real struggles into 10–12 clear steps—for your child's age, not generic advice.",
    cta: "Unlock Personalized Coaching",
  }),
  infant_sleep_coach: (name) => ({
    title: `Better nights for ${name}`,
    subtitle:
      "AI Sleep Coach uses your nap logs and wake windows to recommend bedtime tweaks—not generic sleep charts.",
    cta: "Unlock Sleep Guidance",
  }),
  infant_feeding_plan: (name) => ({
    title: `Meal plans for ${name}'s next stage`,
    subtitle:
      "Create meal plans for every stage of growth with allergy-safe guidance.",
    cta: "Unlock Feeding Plans",
  }),
  premium_insight: (name) => ({
    title: `See the complete picture of ${name}'s growth`,
    subtitle:
      "Unlock weekly reports and deeper insights across wins, hard days, and milestones.",
    cta: "Unlock Weekly Reports",
  }),
  hub_nutrition: (name) => ({
    title: `Create meal plans for ${name}'s stage of growth`,
    subtitle:
      "Allergy-aware, routine-friendly nutrition help—less dinner stress, better energy for learning.",
    cta: "Unlock Meal Plans",
  }),
  phonics_workbook: (name) => ({
    title: `Reading confidence for ${name} starts at your table`,
    subtitle:
      "Printable phonics workbooks for ages 3–7—practice together with structured worksheets.",
    cta: "Unlock Phonics Workbooks",
  }),
};

const CONTEXT_FALLBACKS: Partial<Record<PaywallReason, CopyBlock>> = {
  routines_limit: {
    title: "Amy has already created routines your child loves",
    subtitle: "Continue creating personalized routines every day.",
    cta: "Continue Building Routines",
  },
  speech_coach: {
    title: "Your child finished today's practice",
    subtitle: "Keep building confidence together.",
    cta: "Continue Building Confidence",
  },
  learning_locked: {
    title: "Continue today's learning journey",
    subtitle: "Unlock complete learning journeys across phonics, study, and more.",
    cta: "Unlock All Learning",
  },
  hub_journey: {
    title: "Continue today's learning journey",
    subtitle: "Keep daily paths and progress tracking going.",
    cta: "Continue My Child's Journey",
  },
  premium_insight: {
    title: "See the complete picture of your child's growth",
    subtitle: "Unlock weekly reports and deeper family insights.",
    cta: "Unlock Weekly Reports",
  },
  hub_nutrition: {
    title: "Create meal plans for every stage of growth",
    subtitle: "Unlock AI meal plans matched to your family's reality.",
    cta: "Unlock Meal Plans",
  },
};

export function resolvePaywallCopy(
  reason: PaywallReason,
  childName?: string | null,
  module?: string | null,
  source?: string | null,
): CopyBlock {
  const personalize = childName?.trim();

  if (module === "birth_sky" && reason === "premium_insight") {
    if (personalize) {
      return {
        title: `${personalize}'s story has only begun`,
        subtitle:
          "Unlock unlimited AI insights and keepsake stories that grow with your child.",
        cta: PAYWALL_BIRTH_SKY.cta,
      };
    }
    return {
      title: "Your child's story has only begun",
      subtitle:
        "Unlock unlimited AI insights and keepsake stories that grow with your child.",
      cta: PAYWALL_BIRTH_SKY.cta,
    };
  }

  if (source?.includes("games") || source?.includes("gaming")) {
    return {
      title: PAYWALL_GAMES.title,
      subtitle: PAYWALL_GAMES.subtitle,
      cta: PAYWALL_GAMES.cta,
    };
  }

  if (source?.includes("health_lab") || source?.includes("route_health")) {
    return {
      title: PAYWALL_HEALTH_LAB.title,
      subtitle: "Build a lifelong wellness record with personalized insights.",
      cta: PAYWALL_HEALTH_LAB.cta,
    };
  }

  if (source?.includes("download")) {
    return {
      title: "Keep every keepsake and printable",
      subtitle:
        "Unlock downloads for worksheets, stories, and family records—ready when you need them.",
      cta: "Unlock Downloads",
    };
  }

  if (source?.includes("dashboard") || source?.includes("banner")) {
    return {
      title: personalize
        ? `Keep growing with ${personalize}`
        : "Keep growing with your child",
      subtitle: "Premium unlocks unlimited AI, learning, Health Lab, and weekly reports.",
      cta: "Continue with Premium",
    };
  }

  if (source?.includes("settings") || source?.includes("trial_ended")) {
    return {
      title: personalize
        ? `Continue ${personalize}'s Premium journey`
        : "Continue your Premium journey",
      subtitle: "Your progress is saved. Unlock unlimited guidance whenever you're ready.",
      cta: "Continue with Premium",
    };
  }

  if (personalize) {
    const fn = PERSONALIZED_TEMPLATES[reason];
    if (fn) return fn(personalize);
  }

  const contextFallback = CONTEXT_FALLBACKS[reason];
  if (contextFallback) return contextFallback;

  const base = PAYWALL_REASON_COPY[reason] ?? PAYWALL_REASON_COPY.feature;
  if (!personalize) return base;

  return {
    title: base.title.replace(CHILD_NAME_PLACEHOLDER, personalize),
    subtitle: base.subtitle.replace(CHILD_NAME_PLACEHOLDER, personalize),
    cta: base.cta,
  };
}
