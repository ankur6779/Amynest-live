/**
 * AppWalkthrough — first-time onboarding tour shown once after a new user
 * completes the chat setup and lands on /dashboard for the first time.
 *
 * Renders a full-screen overlay with 5 steps that introduce the app's key
 * features. Completion is persisted in localStorage so the tour never
 * re-appears. No third-party tour library used — custom component keeps
 * the bundle small (iOS Safari memory budget).
 */

import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, BookOpen, Brain, TrendingUp, X, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AmyMascotLogo } from "@/components/amy-mascot-logo";

const STORAGE_KEY = "amynest_walkthrough_seen";

type StepId = 1 | 2 | 3 | 4 | 5;

interface StepDef {
  id: StepId;
  icon: "amy" | "calendar" | "book" | "brain" | "trending";
  titleKey: string;
  descKey: string;
  ctaKey: string;
  href?: string;
}

const STEPS: StepDef[] = [
  {
    id: 1,
    icon: "amy",
    titleKey: "walkthrough.step1.title",
    descKey: "walkthrough.step1.desc",
    ctaKey: "walkthrough.next",
  },
  {
    id: 2,
    icon: "calendar",
    titleKey: "walkthrough.step2.title",
    descKey: "walkthrough.step2.desc",
    ctaKey: "walkthrough.next",
    href: "/routines",
  },
  {
    id: 3,
    icon: "book",
    titleKey: "walkthrough.step3.title",
    descKey: "walkthrough.step3.desc",
    ctaKey: "walkthrough.next",
    href: "/parenting-hub",
  },
  {
    id: 4,
    icon: "brain",
    titleKey: "walkthrough.step4.title",
    descKey: "walkthrough.step4.desc",
    ctaKey: "walkthrough.next",
    href: "/amy-coach",
  },
  {
    id: 5,
    icon: "trending",
    titleKey: "walkthrough.step5.title",
    descKey: "walkthrough.step5.desc",
    ctaKey: "walkthrough.start_exploring",
    href: "/progress",
  },
];

// ─── Icon renderer ────────────────────────────────────────────────────────────

function StepIcon({ icon }: { icon: StepDef["icon"] }) {
  if (icon === "amy") {
    return (
      <div className="flex items-center justify-center">
        <div
          className="w-24 h-24 rounded-full flex items-center justify-center shadow-2xl"
          style={{ background: "linear-gradient(135deg, hsl(var(--brand-indigo-500)), hsl(var(--brand-purple-500)))" }}
        >
          <AmyMascotLogo size={72} />
        </div>
      </div>
    );
  }
  const icons = {
    calendar: Calendar,
    book:     BookOpen,
    brain:    Brain,
    trending: TrendingUp,
  };
  const Icon = icons[icon];
  const gradients: Record<string, string> = {
    calendar: "linear-gradient(135deg, hsl(var(--brand-indigo-500)), hsl(var(--brand-purple-500)))",
    book:     "linear-gradient(135deg, hsl(var(--brand-purple-500)), hsl(var(--brand-pink-500)))",
    brain:    "linear-gradient(135deg, hsl(var(--brand-indigo-500)), hsl(var(--brand-purple-500)))",
    trending: "linear-gradient(135deg, hsl(var(--brand-indigo-500)), hsl(var(--brand-emerald-400)))",
  };
  return (
    <div className="flex items-center justify-center">
      <div
        className="w-24 h-24 rounded-full flex items-center justify-center shadow-2xl"
        style={{ background: gradients[icon] }}
      >
        <Icon className="h-11 w-11 text-white" />
      </div>
    </div>
  );
}

// ─── Progress dots ────────────────────────────────────────────────────────────

function ProgressDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className="rounded-full transition-all duration-300"
          style={{
            width: i === current ? 20 : 8,
            height: 8,
            background: i === current
              ? "linear-gradient(90deg, hsl(var(--brand-indigo-500)), hsl(var(--brand-purple-500)))"
              : "rgba(255,255,255,0.25)",
          }}
        />
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AppWalkthrough() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const [open, setOpen] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);

  useEffect(() => {
    const seen = localStorage.getItem(STORAGE_KEY);
    if (!seen) setOpen(true);
  }, []);

  const dismiss = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, "true");
    setOpen(false);
  }, []);

  const handleNext = useCallback(() => {
    const step = STEPS[stepIdx];
    if (!step) return;
    const isLast = stepIdx === STEPS.length - 1;
    if (isLast) {
      dismiss();
      if (step.href) navigate(step.href);
    } else {
      setStepIdx((i) => i + 1);
    }
  }, [stepIdx, dismiss, navigate]);

  const step = STEPS[stepIdx];
  if (!open || !step) return null;

  return (
    <AnimatePresence>
      {open && (
        // Full-screen backdrop
        <motion.div
          key="wt-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(5,3,18,0.82)", backdropFilter: "blur(8px)" }}
          aria-modal="true"
          role="dialog"
          aria-label={t("walkthrough.aria_label")}
        >
          {/* Card */}
          <motion.div
            key={`wt-step-${stepIdx}`}
            initial={{ opacity: 0, scale: 0.93, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.93, y: -18 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="relative w-full max-w-sm rounded-3xl overflow-hidden"
            style={{
              background: "rgba(15,10,46,0.97)",
              border: "1px solid rgba(168,85,247,0.30)",
              boxShadow: "0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(99,102,241,0.12)",
            }}
          >
            {/* Skip button */}
            <button
              type="button"
              onClick={dismiss}
              className="absolute top-4 right-4 z-10 rounded-full p-1.5 text-white/50 hover:text-white/90 hover:bg-white/10 transition-colors"
              aria-label={t("walkthrough.skip")}
            >
              <X className="h-4 w-4" />
            </button>

            {/* Gradient top strip */}
            <div
              className="h-1.5 w-full"
              style={{ background: "linear-gradient(90deg, hsl(var(--brand-indigo-500)), hsl(var(--brand-purple-500)))" }}
            />

            <div className="px-7 pt-8 pb-7 flex flex-col gap-6">

              {/* Step counter */}
              <div className="flex items-center justify-center">
                <span
                  className="text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full"
                  style={{ background: "rgba(99,102,241,0.18)", color: "hsl(var(--brand-indigo-400))" }}
                >
                  {t("walkthrough.step_of", { current: stepIdx + 1, total: STEPS.length })}
                </span>
              </div>

              {/* Icon */}
              <StepIcon icon={step.icon} />

              {/* Text */}
              <div className="text-center flex flex-col gap-2.5">
                <h2 className="font-quicksand text-2xl font-black text-white leading-tight">
                  {t(step.titleKey)}
                </h2>
                <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.72)" }}>
                  {t(step.descKey)}
                </p>
              </div>

              {/* Progress dots */}
              <ProgressDots current={stepIdx} total={STEPS.length} />

              {/* Actions */}
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleNext}
                  className="w-full h-12 rounded-2xl font-black text-sm text-white flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{
                    background: "linear-gradient(135deg, hsl(var(--brand-indigo-500)), hsl(var(--brand-purple-500)))",
                    boxShadow: "0 4px 20px rgba(99,102,241,0.4)",
                  }}
                >
                  {stepIdx === STEPS.length - 1
                    ? <><Sparkles className="h-4 w-4" />{t(step.ctaKey)}</>
                    : <>{t(step.ctaKey)}<ArrowRight className="h-4 w-4" /></>
                  }
                </button>

                {stepIdx < STEPS.length - 1 && (
                  <button
                    type="button"
                    onClick={dismiss}
                    className="w-full h-10 rounded-2xl text-xs font-semibold transition-colors hover:bg-white/5"
                    style={{ color: "rgba(255,255,255,0.45)" }}
                  >
                    {t("walkthrough.skip")}
                  </button>
                )}
              </div>

            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
