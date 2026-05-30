/**
 * Phase 4/5 — shared premium visual layer for learning-progress UI.
 * Pulls all motion + card tokens from the global experience system so every
 * screen breathes the same rhythm. Do NOT add progression logic here.
 */

import { useMemo, useRef, type ReactNode } from "react";
import { motion, type Variants } from "framer-motion";
import { cn } from "@/lib/utils";
import { useStudyFx, playFx } from "@/components/study-engagement";
import { useReducedMotion } from "@/lib/reduced-motion";
import {
  CARD_BASE,
  CARD_VARIANTS,
  TOUCH_FEEDBACK,
  TRANSITION,
  TYPE,
  EASE_SOFT,
  DURATION,
  fadeUp,
  fadeIn,
  softScale,
  staggerDelay,
  STAGGER_STEP,
  SOUND_CUE_MAP,
  SKELETON_BASE,
  rewardIntensity,
  type CardTier,
  type SoundCue,
  type RewardIntensity,
} from "@/lib/experience-system";
import { HUB_GLASS_CARD, HUB_HERO_GLOW } from "@/lib/parent-hub-premium";

// ─── Re-exports for back-compat with Phase 4 callers ────────────────────────
export const PREMIUM_EASE = TRANSITION.warm;
export const PREMIUM_SPRING = TRANSITION.spring;
export { fadeUp, fadeIn, softScale, staggerDelay, STAGGER_STEP };
export type { CardTier, SoundCue, RewardIntensity };
export { rewardIntensity };

// ─── Cards ─────────────────────────────────────────────────────────────────

interface BaseCardProps {
  children: ReactNode;
  className?: string;
  testId?: string;
  /** Disables the entrance animation when nested inside another animated container. */
  static?: boolean;
}

interface PremiumCardProps extends BaseCardProps {
  tier?: CardTier;
  /** Legacy convenience — same as tier="glow". */
  glow?: boolean;
  interactive?: boolean;
  /** Parent Hub glass surface — does not affect other routes. */
  parentHub?: boolean;
  /** Hero glow for Amy recommends section. */
  hero?: boolean;
}

export function PremiumCard({
  children,
  className,
  tier,
  glow = false,
  interactive = false,
  parentHub = false,
  hero = false,
  testId,
  static: isStatic = false,
}: PremiumCardProps) {
  const resolvedTier: CardTier = tier ?? (glow ? "glow" : "premium");
  const inner = (
    <div
      className={cn(
        parentHub
          ? cn(HUB_GLASS_CARD, hero && HUB_HERO_GLOW, interactive && "cursor-pointer")
          : cn(CARD_BASE, CARD_VARIANTS[resolvedTier]),
        !parentHub && interactive && TOUCH_FEEDBACK,
        className,
      )}
      data-testid={testId}
    >
      {children}
    </div>
  );
  if (isStatic) return inner;
  if (parentHub) {
    return <div className="hub-page-enter">{inner}</div>;
  }
  return (
    <motion.div
      variants={fadeUp}
      initial="initial"
      animate="animate"
      transition={TRANSITION.warm}
      className="contents"
    >
      {inner}
    </motion.div>
  );
}

/** Shared activity card — used for tappable items inside grids. */
export function ActivityCard({
  children,
  className,
  onClick,
  testId,
}: BaseCardProps & { onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testId}
      className={cn(
        CARD_BASE,
        CARD_VARIANTS.flat,
        TOUCH_FEEDBACK,
        "w-full text-left px-3 py-3",
        className,
      )}
    >
      {children}
    </button>
  );
}

/** Shared reward / celebration card — gentle glow, no shouty colors. */
export function RewardCard({ children, className, testId }: BaseCardProps) {
  return (
    <PremiumCard tier="glow" className={cn("overflow-hidden", className)} testId={testId}>
      {children}
    </PremiumCard>
  );
}

/** Inline insight surface — used by Amy presence and adaptive tips. */
export function InsightCard({
  children,
  className,
  testId,
  tone = "neutral",
}: BaseCardProps & { tone?: "neutral" | "celebrate" | "support" }) {
  const toneCls =
    tone === "celebrate"
      ? "border-primary/20 bg-primary/[0.05]"
      : tone === "support"
        ? "border-amber-300/30 bg-amber-50/40 dark:bg-amber-950/20"
        : "border-border/60 bg-card";
  return (
    <motion.div
      variants={fadeUp}
      initial="initial"
      animate="animate"
      transition={TRANSITION.warm}
      data-testid={testId}
      className={cn(CARD_BASE, toneCls, "px-4 py-3", className)}
    >
      {children}
    </motion.div>
  );
}

/** Unified warm empty state — used everywhere a list is blank. */
export function EmptyStateCard({
  emoji,
  title,
  message,
  className,
  testId,
}: {
  emoji: string;
  title: string;
  message: string;
  className?: string;
  testId?: string;
}) {
  return (
    <PremiumCard tier="flat" className={cn("text-center", className)} testId={testId}>
      <div className="py-8 px-5 space-y-2">
        <motion.p
          aria-hidden
          className="text-4xl"
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={TRANSITION.spring}
        >
          {emoji}
        </motion.p>
        <p className={cn(TYPE.cardTitle, "text-foreground")}>{title}</p>
        <p className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">
          {message}
        </p>
      </div>
    </PremiumCard>
  );
}

/** Backward-compatible warm empty state (no card wrapper). */
export function WarmEmptyState({
  emoji,
  title,
  message,
}: {
  emoji: string;
  title: string;
  message: string;
}) {
  return (
    <div className="text-center py-8 px-4 space-y-2">
      <p className="text-4xl" aria-hidden>
        {emoji}
      </p>
      <p className={cn(TYPE.cardTitle, "text-foreground")}>{title}</p>
      <p className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">
        {message}
      </p>
    </div>
  );
}

// ─── Skeletons ─────────────────────────────────────────────────────────────

export function PremiumSkeleton({ className }: { className?: string }) {
  return <div className={cn(SKELETON_BASE, className)} aria-hidden />;
}

/** Standard set of stacked skeleton blocks — same rhythm everywhere. */
export function PremiumSkeletonStack({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-hidden>
      <PremiumSkeleton className="h-6 w-1/3" />
      {Array.from({ length: rows }).map((_, i) => (
        <PremiumSkeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  );
}

// ─── Animated counter ──────────────────────────────────────────────────────

export function AnimatedCounter({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  return (
    <motion.span
      key={value}
      initial={{ opacity: 0.6, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={TRANSITION.spring}
      className={className}
    >
      {value}
    </motion.span>
  );
}

// ─── Progress ring ─────────────────────────────────────────────────────────

export function PremiumProgressRing({
  pct,
  size = 52,
  label,
}: {
  pct: number;
  size?: number;
  label?: string;
}) {
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (c * Math.min(100, pct)) / 100;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg className="-rotate-90" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          className="stroke-primary/15"
          strokeWidth="4"
          fill="none"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          className="stroke-primary"
          strokeWidth="4"
          strokeLinecap="round"
          fill="none"
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: offset }}
          transition={TRANSITION.warmLong}
          style={{ strokeDasharray: c }}
        />
      </svg>
      {label && (
        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-primary">
          {label}
        </span>
      )}
    </div>
  );
}

// ─── Celebrations ──────────────────────────────────────────────────────────

const SOFT_EMOJIS = ["✨", "⭐", "💫", "🌟"];

export function SoftCelebrationBurst({ trigger }: { trigger: number }) {
  const reduced = useReducedMotion();
  const count = reduced ? 0 : 10;
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const angle = (i / Math.max(1, count)) * Math.PI * 2;
        const dist = 50 + Math.random() * 40;
        return {
          x: Math.cos(angle) * dist,
          y: Math.sin(angle) * dist - 20,
          emoji: SOFT_EMOJIS[i % SOFT_EMOJIS.length],
          delay: i * 0.04,
        };
      }),
    [count],
  );
  if (trigger <= 0 || reduced) return null;
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-visible z-10">
      {pieces.map((p, i) => (
        <motion.span
          key={`${trigger}-${i}`}
          initial={{ opacity: 0, scale: 0.5, x: 0, y: 0 }}
          animate={{ opacity: [0, 0.9, 0], scale: 1, x: p.x, y: p.y }}
          transition={{ duration: DURATION.celebration, delay: p.delay, ease: EASE_SOFT }}
          className="absolute text-xl opacity-80"
        >
          {p.emoji}
        </motion.span>
      ))}
    </div>
  );
}

export function StarBurst({ active }: { active: boolean }) {
  const reduced = useReducedMotion();
  if (!active || reduced) return null;
  return (
    <motion.div
      className="pointer-events-none absolute -inset-4 flex items-center justify-center"
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: [0, 1, 0], scale: [0.6, 1.2, 1.4] }}
      transition={{ duration: DURATION.reward, ease: EASE_SOFT }}
    >
      <span className="text-3xl" aria-hidden>
        ✨
      </span>
    </motion.div>
  );
}

// ─── Sound ─────────────────────────────────────────────────────────────────

/** Unified sound family — respects study-fx mute. */
export function useLearningRewardFx() {
  const fx = useStudyFx();
  const played = useRef(false);
  return {
    play(cue: SoundCue) {
      fx.play(SOUND_CUE_MAP[cue]);
    },
    playLevelUp() {
      if (played.current) return;
      played.current = true;
      fx.play(SOUND_CUE_MAP.reward);
    },
    playComplete() {
      fx.play(SOUND_CUE_MAP.complete);
    },
    playUnlock() {
      fx.play(SOUND_CUE_MAP.unlock);
    },
    reset() {
      played.current = false;
    },
  };
}

export { playFx };
