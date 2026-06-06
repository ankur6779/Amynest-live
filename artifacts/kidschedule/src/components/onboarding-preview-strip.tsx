import { useTranslation } from "react-i18next";
import { buildPreviewCards } from "@/lib/onboarding-premium";
import type { EducationStageCode } from "@workspace/education-stages";

type Props = {
  childName?: string;
  educationStage?: EducationStageCode | string;
  wakeTime?: string;
  hasSchoolSchedule?: boolean;
};

export function OnboardingPreviewStrip({
  childName,
  educationStage,
  wakeTime,
  hasSchoolSchedule,
}: Props) {
  const { t } = useTranslation();
  const cards = buildPreviewCards({
    childName,
    educationStage,
    wakeTime,
    hasSchoolSchedule,
    t,
  });

  if (!childName?.trim() && !educationStage) return null;

  return (
    <div
      className="mx-4 mb-2 rounded-2xl px-3 py-2.5 onboarding-preview-enter"
      style={{
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(168,85,247,0.2)",
      }}
      aria-live="polite"
    >
      <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.45)" }}>
        {t("screens.onboarding.preview_heading")}
      </p>
      <div className="flex flex-col gap-1">
        {cards.map((card) => (
          <p key={card.id} className="text-xs leading-snug" style={{ color: "rgba(255,255,255,0.82)" }}>
            <span className="mr-1.5">{card.emoji}</span>
            {t(`screens.onboarding.${card.textKey}`, card.textParams ?? {})}
          </p>
        ))}
      </div>
    </div>
  );
}
