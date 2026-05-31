import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { X, ChevronRight } from "lucide-react";

const ONBOARDING_KEY = "olympiad:onboarding:v1";

export function isOlympiadOnboardingDone(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(ONBOARDING_KEY) === "1";
}

export function markOlympiadOnboardingDone(): void {
  try {
    localStorage.setItem(ONBOARDING_KEY, "1");
  } catch {
    /* ignore */
  }
}

const STEPS = [
  {
    titleKey: "components.olympiad_zone.onboarding_step1_title",
    bodyKey: "components.olympiad_zone.onboarding_step1_body",
    emoji: "📅",
  },
  {
    titleKey: "components.olympiad_zone.onboarding_step2_title",
    bodyKey: "components.olympiad_zone.onboarding_step2_body",
    emoji: "🎯",
  },
  {
    titleKey: "components.olympiad_zone.onboarding_step3_title",
    bodyKey: "components.olympiad_zone.onboarding_step3_body",
    emoji: "👑",
  },
] as const;

export function OlympiadOnboarding({
  onComplete,
}: {
  onComplete: () => void;
}) {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const current = STEPS[step]!;

  const finish = () => {
    markOlympiadOnboardingDone();
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 p-4">
      <Card className="w-full max-w-md border-primary/30 shadow-xl animate-in slide-in-from-bottom-4 duration-300">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-start justify-between">
            <span className="text-3xl">{current.emoji}</span>
            <button type="button" onClick={finish} className="text-muted-foreground hover:text-foreground">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div>
            <p className="font-quicksand font-bold text-lg">{t(current.titleKey)}</p>
            <p className="text-sm text-muted-foreground mt-2">{t(current.bodyKey)}</p>
          </div>
          <div className="flex gap-1 justify-center">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${i === step ? "w-6 bg-primary" : "w-2 bg-muted"}`}
              />
            ))}
          </div>
          <div className="flex gap-2">
            {step > 0 && (
              <Button variant="outline" className="flex-1" onClick={() => setStep(step - 1)}>
                {t("components.olympiad_zone.back")}
              </Button>
            )}
            {step < STEPS.length - 1 ? (
              <Button className="flex-1" onClick={() => setStep(step + 1)}>
                {t("components.olympiad_zone.next")}
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button className="flex-1" onClick={finish}>
                {t("components.olympiad_zone.lets_go")}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
