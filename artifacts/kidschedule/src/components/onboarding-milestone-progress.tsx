import { useTranslation } from "react-i18next";
import type { OnboardingStep } from "@/lib/onboarding-chat-types";
import {
  getActiveMilestoneIndex,
  ONBOARDING_MILESTONES,
} from "@/lib/onboarding-premium";

const GRAD = "linear-gradient(135deg,hsl(var(--brand-indigo-500)),hsl(var(--brand-purple-500)))";

export function OnboardingMilestoneProgress({ step }: { step: OnboardingStep }) {
  const { t } = useTranslation();
  const activeIdx = getActiveMilestoneIndex(step);

  return (
    <div className="px-4 pb-3 pt-1 onboarding-milestone-enter" aria-label={t("screens.onboarding.milestone_progress_label")}>
      <ul className="flex flex-col gap-1.5" role="list">
        {ONBOARDING_MILESTONES.map((milestone, idx) => {
          const done = idx < activeIdx;
          const active = idx === activeIdx;
          return (
            <li
              key={milestone.id}
              className="flex items-center gap-2 text-xs transition-opacity duration-500"
              style={{
                opacity: done ? 0.55 : active ? 1 : 0.35,
                color: "#fff",
              }}
            >
              <span
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold transition-all duration-300"
                style={{
                  background: done || active ? GRAD : "rgba(255,255,255,0.12)",
                  boxShadow: active ? "0 0 12px rgba(168,85,247,0.45)" : undefined,
                }}
                aria-hidden
              >
                {done ? "✓" : idx + 1}
              </span>
              <span className={active ? "font-semibold" : "font-medium"}>
                {t(`screens.onboarding.${milestone.labelKey}`)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
