import { useTranslation } from "react-i18next";
import { buildLiveProfile, childDisplayName } from "@/lib/onboarding-premium";

type Props = {
  childName?: string;
  ageYears?: number;
  ageMonths?: number;
  dobIsEstimated?: boolean;
  educationStage?: string;
  wakeLabel?: string;
  parentGoal?: string;
};

export function OnboardingLiveProfile({
  childName,
  ageYears,
  ageMonths,
  dobIsEstimated,
  educationStage,
  wakeLabel,
  parentGoal,
}: Props) {
  const { t } = useTranslation();
  const name = childName?.trim();
  const items = buildLiveProfile({
    childName,
    ageYears,
    ageMonths,
    dobIsEstimated,
    educationStage,
    wakeLabel,
    parentGoal,
    t,
  });

  if (!name || items.length === 0) return null;

  const displayName = childDisplayName(name, t);

  return (
    <div
      className="mx-4 mb-2 rounded-2xl px-3.5 py-3 onboarding-live-profile-enter"
      style={{
        background: "rgba(255,255,255,0.08)",
        border: "1px solid rgba(168,85,247,0.28)",
      }}
      aria-live="polite"
      aria-label={t("screens.onboarding.live_profile_label", { name: displayName })}
    >
      <p className="mb-2 text-sm font-bold" style={{ color: "rgba(255,255,255,0.95)" }}>
        {displayName}
      </p>
      <ul className="flex flex-col gap-1" role="list">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex items-start gap-2 text-xs leading-relaxed"
            style={{ color: "rgba(255,255,255,0.82)" }}
          >
            <span aria-hidden className="shrink-0 font-bold" style={{ color: "rgba(167,139,250,0.9)" }}>
              ✓
            </span>
            <span>{item.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
