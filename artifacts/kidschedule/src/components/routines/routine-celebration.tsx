import { useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useReducedMotion } from "@/lib/reduced-motion";
import {
  livingCompletionBody,
  livingCompletionCta,
  livingCompletionTitle,
} from "@/lib/routine-generation/living-execution";
import { RoutineLivingContinuityExits } from "@/components/routines/routine-living-continuity-exits";

const CONFETTI_COLORS = ["#fbbf24", "#f59e0b", "#34d399", "#60a5fa", "#f472b6", "#a78bfa"];

/**
 * Completion moment when today's routine has no pending items.
 * Living ON: quiet care close — no confetti / points theatre.
 * Living OFF: legacy celebration retained for rollback.
 */
export function RoutineCelebration({
  open,
  onClose,
  childName,
  total,
  points,
  living = false,
}: {
  open: boolean;
  onClose: () => void;
  childName?: string;
  total: number;
  points?: number;
  living?: boolean;
}) {
  const { t } = useTranslation();
  const reduced = useReducedMotion();

  const pieces = useMemo(
    () =>
      Array.from({ length: living || reduced ? 0 : 26 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.5,
        duration: 1.6 + Math.random() * 1.4,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        rotate: Math.random() * 360,
        size: 6 + Math.random() * 8,
      })),
    [reduced, living],
  );

  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(onClose, living ? 7200 : 5200);
    return () => window.clearTimeout(id);
  }, [open, onClose, living]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label={
            living
              ? t("routines.living.execution.complete_aria", {
                  defaultValue: livingCompletionTitle(),
                })
              : t("pages.routines.detail.celebrate_title", {
                  defaultValue: "Day complete!",
                })
          }
          data-testid="routine-celebration"
          data-living={living ? "1" : "0"}
        >
          <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" />

          {!living ? (
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              {pieces.map((p) => (
                <motion.span
                  key={p.id}
                  className="absolute top-[-5%] block rounded-[2px]"
                  style={{
                    left: `${p.left}%`,
                    width: p.size,
                    height: p.size * 1.4,
                    backgroundColor: p.color,
                  }}
                  initial={{ y: "-10vh", opacity: 0, rotate: 0 }}
                  animate={{ y: "110vh", opacity: [0, 1, 1, 0], rotate: p.rotate }}
                  transition={{ duration: p.duration, delay: p.delay, ease: "easeIn" }}
                />
              ))}
            </div>
          ) : null}

          <motion.div
            className={
              living
                ? "relative w-full max-w-sm rounded-[28px] border border-amber-200/25 bg-[rgba(14,16,28,0.94)] backdrop-blur-xl p-7 text-center shadow-[0_20px_60px_-24px_rgba(0,0,0,0.55)]"
                : "relative w-full max-w-sm rounded-[28px] border border-amber-300/30 bg-[rgba(18,28,60,0.92)] backdrop-blur-xl p-7 text-center shadow-[0_24px_70px_-20px_rgba(255,184,0,0.45)]"
            }
            initial={reduced || living ? { opacity: 0 } : { scale: 0.8, y: 24, opacity: 0 }}
            animate={reduced || living ? { opacity: 1 } : { scale: 1, y: 0, opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={
              living || reduced
                ? { duration: 0.25 }
                : { type: "spring", stiffness: 260, damping: 22 }
            }
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={
                living
                  ? "mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-amber-200/25 bg-amber-400/10"
                  : "mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 shadow-[0_0_32px_rgba(255,184,0,0.5)]"
              }
              aria-hidden
            >
              <span className={living ? "text-2xl" : "text-4xl"}>{living ? "🌿" : "🎉"}</span>
            </div>

            <h2 className="font-quicksand text-2xl font-black text-foreground">
              {living
                ? t("routines.living.execution.complete_title", {
                    defaultValue: livingCompletionTitle(),
                  })
                : t("pages.routines.detail.celebrate_title", {
                    defaultValue: "Day complete!",
                  })}
            </h2>
            <p className="mt-2 text-sm text-foreground/70 leading-relaxed">
              {living
                ? t("routines.living.execution.complete_body", {
                    name: childName,
                    defaultValue: livingCompletionBody(childName),
                  })
                : childName
                  ? t("pages.routines.detail.celebrate_body_named", {
                      defaultValue:
                        "{{name}} finished all {{total}} activities today. Amazing work! 🌟",
                      name: childName,
                      total,
                    })
                  : t("pages.routines.detail.celebrate_body", {
                      defaultValue: "All {{total}} activities done today. Amazing work! 🌟",
                      total,
                    })}
            </p>

            {!living && typeof points === "number" && points > 0 ? (
              <div className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-amber-300/30 bg-amber-400/10 px-4 py-1.5 text-sm font-bold text-amber-200">
                ⭐{" "}
                {t("pages.routines.detail.celebrate_points", {
                  defaultValue: "+{{points}} points today",
                  points,
                })}
              </div>
            ) : null}

            {living ? (
              <div className="mt-5 text-left">
                <RoutineLivingContinuityExits />
              </div>
            ) : null}

            <button
              type="button"
              onClick={onClose}
              className={
                living
                  ? "mt-5 w-full min-h-12 rounded-full border border-amber-200/30 bg-white/[0.06] py-3 text-sm font-bold text-foreground active:scale-[0.98] transition-transform"
                  : "mt-6 w-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 py-3 text-sm font-bold text-white shadow-[0_8px_24px_rgba(255,146,53,0.35)] active:scale-[0.98] transition-transform"
              }
            >
              {living
                ? t("routines.living.execution.complete_cta", {
                    defaultValue: livingCompletionCta(),
                  })
                : t("pages.routines.detail.celebrate_cta", { defaultValue: "Yay!" })}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
