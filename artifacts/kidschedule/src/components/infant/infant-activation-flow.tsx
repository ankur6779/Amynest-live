import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Baby,
  BedDouble,
  CheckCircle2,
  Circle,
  Flame,
  Loader2,
  MessageCircle,
  Scale,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  trackInfantActivationCompleted,
  trackInfantActivationStarted,
  trackInfantActivationStepCompleted,
} from "@/lib/infant-hub-analytics";
import type {
  InfantActivationStatus,
  InfantActivationStepId,
} from "@/lib/infant-activation-api";

type InfantActivationFlowProps = {
  childId: number;
  childName: string;
  ageMonths: number;
  activation: InfantActivationStatus;
  onNavigate: (targetId: string) => void;
};

const STEP_GUIDANCE: Record<InfantActivationStepId, string> = {
  feed: "Great! We can now estimate future feeds.",
  sleep: "Perfect! Sleep predictions are now available.",
  weight: "Growth tracking is now active.",
  cry: "We'll start learning crying patterns.",
};

const STARTED_KEY = (childId: number) => `amynest:infant-activation-started:${childId}`;
const CELEBRATED_KEY = (childId: number) => `amynest:infant-activation-celebrated:${childId}`;

const STEPS: Array<{
  id: InfantActivationStepId;
  label: string;
  icon: typeof Flame;
  targetId: string;
}> = [
  { id: "feed", label: "Log First Feed", icon: Flame, targetId: "infant-feeding" },
  { id: "sleep", label: "Log First Sleep", icon: BedDouble, targetId: "infant-sleep" },
  { id: "weight", label: "Add Baby Weight", icon: Scale, targetId: "infant-growth" },
  { id: "cry", label: "Try Cry Insight", icon: MessageCircle, targetId: "infant-cry" },
];

function readStartedAt(childId: number): number | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STARTED_KEY(childId));
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function markStartedAt(childId: number): number {
  const now = Date.now();
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STARTED_KEY(childId), String(now));
    } catch {
      /* silent */
    }
  }
  return now;
}

function wasCelebrated(childId: number): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(CELEBRATED_KEY(childId)) === "1";
}

function markCelebrated(childId: number): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CELEBRATED_KEY(childId), "1");
  } catch {
    /* silent */
  }
}

export function shouldShowInfantActivationUi(
  activation: InfantActivationStatus | undefined,
  childId: number,
): boolean {
  if (!activation) return false;
  if (activation.showActivation) return true;
  return activation.isFullyActivated && !wasCelebrated(childId);
}

export function InfantActivationCelebration({
  childName,
  onDismiss,
}: {
  childName: string;
  onDismiss: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div
      className="relative overflow-hidden rounded-3xl border border-emerald-400/30 bg-gradient-to-br from-emerald-500/15 via-teal-500/10 to-violet-500/10 p-6 text-center infant-activation-celebration"
      data-testid="infant-activation-celebration"
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        {[...Array(12)].map((_, i) => (
          <span
            key={i}
            className="infant-activation-sparkle absolute h-2 w-2 rounded-full bg-amber-300/80"
            style={{
              left: `${8 + (i * 7) % 84}%`,
              top: `${10 + (i * 11) % 70}%`,
              animationDelay: `${i * 0.12}s`,
            }}
          />
        ))}
      </div>
      <div className="relative">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 shadow-lg ring-1 ring-white/20">
          <Sparkles className="h-7 w-7 text-white animate-pulse" />
        </div>
        <p className="text-lg font-bold text-foreground mb-1">
          {t("components.infant_activation.celebration_title", "Your Baby Plan Is Ready")}
        </p>
        <p className="text-sm text-muted-foreground mb-4">
          {t(
            "components.infant_activation.celebration_sub",
            "{{name}}'s personalized insights are unlocked.",
            { name: childName },
          )}
        </p>
        <ul className="mb-5 space-y-2 text-left text-sm">
          {[
            t("components.infant_activation.unlock_today", "Baby Today predictions"),
            t("components.infant_activation.unlock_weekly", "Weekly reports"),
            t("components.infant_activation.unlock_sleep", "Sleep insights"),
          ].map((item) => (
            <li key={item} className="flex items-center gap-2 text-foreground/90">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              {item}
            </li>
          ))}
        </ul>
        <Button type="button" onClick={onDismiss} className="w-full rounded-xl">
          {t("components.infant_activation.continue", "Explore the hub")}
        </Button>
      </div>
    </div>
  );
}

export function InfantActivationFlow({
  childId,
  childName,
  ageMonths,
  activation,
  onNavigate,
}: InfantActivationFlowProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const prevStepsRef = useRef(activation.steps);
  const startedAtRef = useRef<number | null>(readStartedAt(childId));
  const startedTrackedRef = useRef(false);
  const completedTrackedRef = useRef(false);
  const [showCelebration, setShowCelebration] = useState(
    activation.isFullyActivated && !wasCelebrated(childId),
  );

  useEffect(() => {
    if (!activation.showActivation && !activation.isFullyActivated) return;
    if (startedTrackedRef.current) return;
    startedTrackedRef.current = true;

    if (!startedAtRef.current) {
      startedAtRef.current = markStartedAt(childId);
    }

    trackInfantActivationStarted(childId, ageMonths, {
      completionRate: activation.completionRate,
      childAgeDays: activation.childAgeDays,
    });
  }, [activation, ageMonths, childId]);

  useEffect(() => {
    const prev = prevStepsRef.current;
    const next = activation.steps;
    (Object.keys(next) as InfantActivationStepId[]).forEach((stepId) => {
      if (!prev[stepId] && next[stepId]) {
        toast({
          title: STEP_GUIDANCE[stepId],
          duration: 4500,
        });
        trackInfantActivationStepCompleted(childId, ageMonths, {
          stepId,
          completionRate: activation.completionRate,
          childAgeDays: activation.childAgeDays,
        });
      }
    });
    prevStepsRef.current = next;
  }, [activation.childAgeDays, activation.completionRate, activation.steps, ageMonths, childId, toast]);

  useEffect(() => {
    if (!activation.isFullyActivated || wasCelebrated(childId) || completedTrackedRef.current) return;
    completedTrackedRef.current = true;
    setShowCelebration(true);
    const startedAt = startedAtRef.current ?? readStartedAt(childId) ?? Date.now();
    const completionTimeMs = Date.now() - startedAt;
    trackInfantActivationCompleted(childId, ageMonths, {
      completionRate: 100,
      completionTimeMs,
      childAgeDays: activation.childAgeDays,
    });
    markCelebrated(childId);
  }, [activation.childAgeDays, activation.isFullyActivated, ageMonths, childId]);

  if (showCelebration) {
    return (
      <InfantActivationCelebration
        childName={childName}
        onDismiss={() => setShowCelebration(false)}
      />
    );
  }

  const progressPct = Math.round((activation.completedCount / activation.totalSteps) * 100);

  return (
    <div
      data-testid="infant-activation-flow"
      className="relative overflow-hidden rounded-3xl border border-violet-400/25 bg-gradient-to-br from-violet-500/10 via-fuchsia-500/5 to-transparent backdrop-blur-xl p-5 shadow-[0_8px_40px_-12px_rgba(168,85,247,0.35)]"
    >
      <div className="pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full bg-violet-500/15 blur-3xl" />
      <div className="relative flex items-start gap-3 mb-4">
        <div className="shrink-0 flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-lg ring-1 ring-white/20">
          <Baby className="h-5 w-5 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-violet-300/90">
            {t("components.infant_activation.welcome", "Welcome")}
          </p>
          <h2 className="text-base font-bold text-foreground leading-snug">
            {t("components.infant_activation.title", "Let's Build Your Baby's First Plan")}
          </h2>
          <p className="text-[11px] text-muted-foreground mt-1">
            {t(
              "components.infant_activation.subtitle",
              "Four quick steps unlock personalized guidance for {{name}}.",
              { name: childName },
            )}
          </p>
        </div>
      </div>

      <div className="relative mb-4">
        <div className="flex items-center justify-between text-[11px] mb-1.5">
          <span className="font-semibold text-muted-foreground">
            {t("components.infant_activation.progress_label", "Progress")}
          </span>
          <span className="font-bold text-foreground">
            {activation.completedCount} / {activation.totalSteps}{" "}
            {t("components.infant_activation.complete", "Complete")}
          </span>
        </div>
        <div className="h-2 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      <ul className="relative space-y-2">
        {STEPS.map(({ id, label, icon: Icon, targetId }) => {
          const done = activation.steps[id];
          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => onNavigate(targetId)}
                className={[
                  "w-full flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors",
                  done
                    ? "border-emerald-400/30 bg-emerald-500/10"
                    : "border-white/10 bg-white/[0.04] hover:border-violet-400/30 hover:bg-violet-500/5",
                ].join(" ")}
                data-testid={`infant-activation-step-${id}`}
              >
                {done ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
                <Icon className="h-3.5 w-3.5 text-violet-400 shrink-0" />
                <span
                  className={[
                    "text-sm font-semibold flex-1",
                    done ? "text-muted-foreground line-through" : "text-foreground",
                  ].join(" ")}
                >
                  {t(`components.infant_activation.step_${id}`, label)}
                </span>
                {!done && (
                  <span className="text-[10px] font-bold text-primary uppercase tracking-wide">
                    {t("components.infant_activation.start", "Start")}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      <div className="relative mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-3">
        <div className="flex items-start gap-2">
          <TrendingUp className="h-4 w-4 text-violet-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-muted-foreground leading-snug">
            {t(
              "components.infant_activation.preview_hint",
              "Next nap, growth charts, and weekly reports appear here as you log — no empty charts.",
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

export function InfantActivationFlowSkeleton() {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-xl p-5 flex items-center justify-center min-h-[220px]">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </div>
  );
}
