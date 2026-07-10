import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Check, ChevronUp, X } from "lucide-react";
import { useEffect, useState } from "react";
import {
  getOnboardingProgress,
  listOnboardingSteps,
  ONBOARDING_STEP_LABELS,
  skipOnboarding,
  onboardingPercentComplete,
  shouldShowTeacherOsOnboarding,
  trackProductEvent,
  type OnboardingStepId,
} from "@workspace/teacher-os";
import { WS_GLASS_CARD, WS_MUTED_TEXT, WS_PRIMARY_BTN, WS_OUTLINE_BTN } from "@/features/worksheet-studio/worksheet-studio-theme";

type Props = {
  onComplete: () => void;
  onGoToStep?: (step: OnboardingStepId) => void;
};

export function TeacherOsOnboarding({ onComplete, onGoToStep }: Props) {
  const [progress, setProgress] = useState(getOnboardingProgress());
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const id = window.setInterval(() => setProgress(getOnboardingProgress()), 2000);
    return () => window.clearInterval(id);
  }, []);

  const skip = () => {
    skipOnboarding();
    trackProductEvent("onboarding_skip");
    onComplete();
  };

  const finish = () => {
    trackProductEvent("onboarding_complete", { percent: onboardingPercentComplete() });
    onComplete();
  };

  const steps = listOnboardingSteps();
  const pct = onboardingPercentComplete();

  return (
    <div
      className={cn(
        "fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] left-3 right-3 z-[35] mx-auto max-w-lg",
        WS_GLASS_CARD,
        "border border-[#c9a227]/25 shadow-md",
      )}
      role="region"
      aria-label="Getting started checklist"
    >
      <div className="flex items-center gap-2 px-3 py-2.5">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-[#1e3a5f]">Getting started — {pct}%</p>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#1e3a5f]/10">
            <div className="h-full rounded-full bg-[#c9a227] transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <button
          type="button"
          aria-label={expanded ? "Collapse checklist" : "Expand checklist"}
          className="flex min-h-11 min-w-11 items-center justify-center rounded-full text-[#1e3a5f]/70 touch-manipulation"
          onClick={() => setExpanded((v) => !v)}
        >
          <ChevronUp className={cn("h-5 w-5 transition-transform", !expanded && "rotate-180")} />
        </button>
        <button
          type="button"
          aria-label="Skip onboarding"
          className="flex min-h-11 min-w-11 items-center justify-center rounded-full text-[#1e3a5f]/50 touch-manipulation"
          onClick={skip}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {expanded && (
        <div className="border-t border-[#1e3a5f]/8 px-3 py-3">
          <ul className="space-y-2">
            {steps.map((step) => {
              const done = progress.completed.includes(step);
              return (
                <li key={step} className="flex items-center gap-3 rounded-xl bg-white/50 px-3 py-2">
                  <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full", done ? "bg-green-100 text-green-700" : "bg-[#1e3a5f]/10 text-[#1e3a5f]")}>
                    {done ? <Check className="h-4 w-4" /> : <span className="text-xs font-bold">{steps.indexOf(step) + 1}</span>}
                  </span>
                  <p className="min-w-0 flex-1 text-sm font-medium text-[#1e3a5f]">{ONBOARDING_STEP_LABELS[step]}</p>
                  {!done && onGoToStep && (
                    <Button size="sm" variant="outline" className={WS_OUTLINE_BTN} onClick={() => onGoToStep(step)}>
                      Start
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
          {pct >= 100 && (
            <Button className={cn(WS_PRIMARY_BTN, "mt-3 w-full")} onClick={finish}>Done</Button>
          )}
        </div>
      )}
    </div>
  );
}

export { shouldShowTeacherOsOnboarding };
