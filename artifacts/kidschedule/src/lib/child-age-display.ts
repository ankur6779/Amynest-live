import type { TFunction } from "i18next";

export function formatChildAgeWithEstimate(
  ageYears: number,
  ageMonths: number,
  dobIsEstimated: boolean | undefined,
  t: TFunction,
): string {
  if (ageYears === 0) {
    return dobIsEstimated
      ? t("pages.children.index.age_under_1_estimated")
      : t("screens.onboarding.age_reply_under_1");
  }
  if (ageYears >= 8) {
    return dobIsEstimated
      ? t("pages.children.index.age_8_plus_estimated")
      : t("screens.onboarding.age_reply_8_plus");
  }
  if (dobIsEstimated) {
    return t("pages.children.index.age_years_estimated", { years: String(ageYears) });
  }
  return t("screens.onboarding.age_reply_years", { years: String(ageYears) });
}
