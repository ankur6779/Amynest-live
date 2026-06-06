import type { PaywallReason } from "@/contexts/paywall-context";
import {
  PAYWALL_REASON_COPY,
  PRODUCT_AGE_RANGE,
} from "@workspace/subscription-marketing";

const CHILD_NAME_PLACEHOLDER = /\{childName\}/g;

type CopyBlock = { title: string; subtitle: string; cta?: string };

const PERSONALIZED_TEMPLATES: Partial<
  Record<PaywallReason, (childName: string) => CopyBlock>
> = {
  ai_quota: (name) => ({
    title: `Stay steady for ${name} on hard days`,
    subtitle:
      "Amy AI gives you calm, specific next steps—for meltdowns, homework, and bedtime—so you respond with clarity, not stress.",
    cta: "Unlock Amy AI",
  }),
  infant_ai_quota: (name) => ({
    title: `Get tailored guidance for ${name}`,
    subtitle:
      "Ask Amy about sleep, feeding, and development—with answers specific to your baby's age and stage.",
    cta: "Unlock Amy Baby Expert",
  }),
  learning_locked: (name) => ({
    title: `Keep ${name}'s learning moving forward`,
    subtitle:
      "Adaptive activities and progress that compound—full access keeps momentum between school terms.",
    cta: "Keep learning going",
  }),
  hub_locked: (name) => ({
    title: `Open the full Hub for ${name}`,
    subtitle:
      `Life skills, communication practice, and age-right activities—curated for ages ${PRODUCT_AGE_RANGE}.`,
    cta: "Open full Hub",
  }),
  hub_journey: (name) => ({
    title: `Continue ${name}'s learning path`,
    subtitle:
      "Keep daily paths, progress tracking, and hub activities that match where they are today.",
    cta: "Continue learning",
  }),
  routines_limit: (name) => ({
    title: `Calmer days for ${name} start with a plan`,
    subtitle:
      "Family routines for mornings, after-school, and bedtime—built so independence replaces daily battles.",
    cta: "Unlock routines",
  }),
  speech_coach: (name) => ({
    title: `Help ${name} find a clearer, braver voice`,
    subtitle:
      "Speech Coach practices sounds and sentences step by step—so confidence at home and school isn't left to chance.",
    cta: "Unlock Speech Coach",
  }),
  coach_locked: (name) => ({
    title: `A plan for ${name}'s exact moment`,
    subtitle:
      "Amy Coach turns real struggles into 10–12 clear steps—for your child's age, not generic advice.",
    cta: "Unlock Amy Coach",
  }),
  infant_sleep_coach: (name) => ({
    title: `Better nights for ${name}`,
    subtitle:
      "AI Sleep Coach uses your nap logs and wake windows to recommend bedtime tweaks and a weekly focus—not generic sleep charts.",
    cta: "Unlock Sleep Coach",
  }),
  infant_feeding_plan: (name) => ({
    title: `A solids roadmap for ${name}`,
    subtitle:
      "7-day meals, allergy-safe intro order, and portions tuned to your baby's age and feeding history.",
    cta: "Unlock Feeding Plan",
  }),
};

export function resolvePaywallCopy(
  reason: PaywallReason,
  childName?: string | null,
): CopyBlock {
  const base = PAYWALL_REASON_COPY[reason] ?? PAYWALL_REASON_COPY.feature;
  const personalize = childName?.trim();
  if (!personalize) return base;

  const fn = PERSONALIZED_TEMPLATES[reason];
  if (fn) return fn(personalize);

  return {
    title: base.title.replace(CHILD_NAME_PLACEHOLDER, personalize),
    subtitle: base.subtitle.replace(CHILD_NAME_PLACEHOLDER, personalize),
    cta: base.cta,
  };
}
