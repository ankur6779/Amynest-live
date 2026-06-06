import type { TFunction } from "i18next";
import { formatEducationStageLabel } from "@/lib/education-stage-display";
import { childDisplayName } from "@/lib/onboarding-premium";

export type AcknowledgementKind = "age" | "education_stage" | "sleep" | "goals";

export function getAmyAcknowledgement(
  kind: AcknowledgementKind,
  input: {
    childName?: string;
    educationStage?: string;
    goalLabel?: string;
    t: TFunction;
  },
): string | null {
  const name = childDisplayName(input.childName, input.t);

  switch (kind) {
    case "age":
      return input.t("screens.onboarding.ack_age", { name });
    case "education_stage": {
      const stage = formatEducationStageLabel(input.educationStage, input.t);
      if (!stage) return null;
      return input.t("screens.onboarding.ack_stage", { stage });
    }
    case "sleep":
      return input.t("screens.onboarding.ack_sleep");
    case "goals":
      return input.goalLabel
        ? input.t("screens.onboarding.ack_goals", { goal: input.goalLabel })
        : input.t("screens.onboarding.ack_goals_default");
    default:
      return null;
  }
}

export function prependAcknowledgement(
  messages: string | string[] | undefined,
  ack: string | null,
): string | string[] | undefined {
  if (!ack) return messages;
  if (!messages) return ack;
  const list = Array.isArray(messages) ? messages : [messages];
  return [ack, ...list];
}
