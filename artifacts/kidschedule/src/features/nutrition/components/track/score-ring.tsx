import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/lib/reduced-motion";
import { scoreColor, scoreRingGlow, scoreRingStroke, scoreTier } from "@/features/nutrition/lib/score-colors";
import { NUTRITION_TRANSITION } from "@/features/nutrition/lib/nutrition-motion";

function glowIntensity(score: number): string {
  const tier = scoreTier(score);
  if (tier === "success") return "rgba(52,211,153,0.35)";
  if (tier === "progress") return "rgba(251,191,36,0.30)";
  return score === 0 ? "rgba(251,146,60,0.18)" : "rgba(251,146,60,0.28)";
}

export function ScoreRing({
  score,
  size = 112,
  strokeWidth = 10,
  className,
}: {
  score: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const clamped = Math.max(0, Math.min(100, score));
  const isEmpty = clamped === 0;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (clamped / 100) * circumference;
  const center = size / 2;
  const glow = glowIntensity(clamped);

  return (
    <div
      className={cn("relative inline-flex shrink-0 items-center justify-center", scoreRingGlow(clamped), className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={
        isEmpty
          ? t("nutrition_hub.score.ring_empty_aria")
          : t("nutrition_hub.score.ring_aria", { score: clamped })
      }
    >
      {/* Ambient glow — intensity scales with score */}
      {!reduced && (
        <motion.div
          className="pointer-events-none absolute inset-0 rounded-full blur-xl"
          style={{ background: glow }}
          aria-hidden
          animate={
            isEmpty
              ? { opacity: [0.25, 0.45, 0.25], scale: [0.92, 1, 0.92] }
              : { opacity: [0.35, 0.55, 0.35], scale: [0.95, 1.02, 0.95] }
          }
          transition={{
            duration: isEmpty ? 3 : 2.2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      )}

      <svg width={size} height={size} className="-rotate-90 relative z-[1]" aria-hidden>
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          className="stroke-white/10"
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          className={cn(scoreRingStroke(clamped))}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: dashOffset }}
          transition={reduced ? { duration: 0 } : NUTRITION_TRANSITION.score}
        />
      </svg>

      <div className="absolute inset-0 z-[2] flex flex-col items-center justify-center px-2 text-center">
        {isEmpty ? (
          <>
            <span className="text-2xl leading-none" aria-hidden>
              🌱
            </span>
            <span className="mt-0.5 text-[9px] font-semibold leading-tight text-amber-200/80 max-w-[4.5rem]">
              {t("nutrition_hub.score.build_invitation_short")}
            </span>
          </>
        ) : (
          <motion.span
            key={clamped}
            className={cn(
              "font-black tabular-nums",
              scoreColor(clamped),
              size >= 100 ? "text-3xl" : "text-2xl",
            )}
            initial={reduced ? false : { opacity: 0.6, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={NUTRITION_TRANSITION.warm}
          >
            {clamped}
          </motion.span>
        )}
      </div>
    </div>
  );
}
