/**
 * Amy Sound World motion system — Framer Motion primitives.
 * GPU-friendly (transform/opacity), reduced-motion aware, tier-aware.
 * No layout redesign — drop-in wrappers for existing surfaces.
 */

import {
  type CSSProperties,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  animate,
  type Transition,
} from "framer-motion";
import { useReducedMotion } from "@/lib/reduced-motion";
import {
  DURATION,
  EASE_SOFT,
  EASE_WARM,
  TRANSITION,
  fadeUp,
  pageEnter,
  softScale,
  staggerDelay,
  tierParticleCount,
} from "@/lib/experience-system";
import { performanceTier } from "@/lib/performance-tier";
import { cn } from "@/lib/utils";

// ─── Capability hook ─────────────────────────────────────────────────────────

export type SoundWorldMotionCaps = {
  reduced: boolean;
  allowIdle: boolean;
  allowTilt: boolean;
  allowParticles: boolean;
  particleCount: number;
  spring: Transition;
  springGentle: Transition;
};

export function useSoundWorldMotion(): SoundWorldMotionCaps {
  const reduced = useReducedMotion();
  const tier = performanceTier();
  return useMemo(() => {
    const allowIdle = !reduced && tier !== "low";
    const allowTilt = !reduced && tier === "high";
    const allowParticles = !reduced && tier !== "low";
    return {
      reduced,
      allowIdle,
      allowTilt,
      allowParticles,
      particleCount: allowParticles ? Math.min(tierParticleCount(tier), 14) : 0,
      spring: reduced ? { duration: DURATION.micro, ease: EASE_SOFT } : TRANSITION.spring,
      springGentle: reduced
        ? { duration: DURATION.short, ease: EASE_WARM }
        : TRANSITION.springGentle,
    };
  }, [reduced, tier]);
}

// ─── Press depth ─────────────────────────────────────────────────────────────

type PressDepthProps = {
  children: ReactNode;
  className?: string;
  depth?: number;
  type?: "button" | "submit" | "reset";
  onClick?: () => void;
  onPointerDown?: () => void;
  disabled?: boolean;
  "aria-label"?: string;
  "aria-pressed"?: boolean;
};

export const PressDepth = memo(function PressDepth({
  children,
  className,
  depth = 3,
  type = "button",
  ...rest
}: PressDepthProps) {
  const { reduced, spring } = useSoundWorldMotion();
  return (
    <motion.button
      type={type}
      whileTap={reduced ? undefined : { scale: 0.96, y: depth }}
      transition={spring}
      className={cn("touch-manipulation will-change-transform", className)}
      {...rest}
    >
      {children}
    </motion.button>
  );
});

// ─── Card tilt + idle float + press ──────────────────────────────────────────

type TiltCardProps = {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  ariaLabel?: string;
  idleIndex?: number;
  disabled?: boolean;
};

export const SoundWorldTiltCard = memo(function SoundWorldTiltCard({
  children,
  className,
  onClick,
  ariaLabel,
  idleIndex = 0,
  disabled,
}: TiltCardProps) {
  const { reduced, allowTilt, allowIdle, springGentle } = useSoundWorldMotion();
  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const springX = useSpring(rotateX, { stiffness: 280, damping: 22, mass: 0.4 });
  const springY = useSpring(rotateY, { stiffness: 280, damping: 22, mass: 0.4 });

  const onMove = useCallback(
    (e: ReactPointerEvent<HTMLButtonElement>) => {
      if (!allowTilt || disabled) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width - 0.5;
      const py = (e.clientY - rect.top) / rect.height - 0.5;
      rotateX.set(py * -8);
      rotateY.set(px * 10);
    },
    [allowTilt, disabled, rotateX, rotateY],
  );

  const onLeave = useCallback(() => {
    rotateX.set(0);
    rotateY.set(0);
  }, [rotateX, rotateY]);

  const idleY = allowIdle ? [0, -3, 0] : 0;
  const idleDuration = 3.2 + (idleIndex % 5) * 0.35;

  return (
    <motion.button
      type="button"
      disabled={disabled}
      aria-label={ariaLabel}
      onClick={onClick}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      onPointerCancel={onLeave}
      whileTap={reduced ? undefined : { scale: 0.97, y: 2 }}
      whileHover={reduced ? undefined : { scale: 1.02 }}
      animate={allowIdle ? { y: idleY } : undefined}
      transition={
        allowIdle
          ? { y: { duration: idleDuration, repeat: Infinity, ease: "easeInOut" }, ...springGentle }
          : springGentle
      }
      style={
        allowTilt
          ? ({
              rotateX: springX,
              rotateY: springY,
              transformPerspective: 800,
              transformStyle: "preserve-3d",
            } as CSSProperties)
          : undefined
      }
      className={cn(
        "touch-manipulation will-change-transform [backface-visibility:hidden]",
        className,
      )}
    >
      {children}
    </motion.button>
  );
});

// ─── Object bounce ───────────────────────────────────────────────────────────

export function ObjectBounce({
  active,
  children,
  className,
}: {
  active: boolean;
  children: ReactNode;
  className?: string;
}) {
  const { reduced, spring } = useSoundWorldMotion();
  return (
    <motion.div
      animate={
        active && !reduced
          ? { scale: [1, 1.12, 0.96, 1.04, 1], y: [0, -6, 0] }
          : { scale: 1, y: 0 }
      }
      transition={spring}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── Floating particles (ambient) ────────────────────────────────────────────

export const FloatingParticles = memo(function FloatingParticles({
  className,
  count,
}: {
  className?: string;
  count?: number;
}) {
  const { allowParticles, particleCount } = useSoundWorldMotion();
  const n = Math.min(count ?? particleCount, particleCount);
  const seeds = useMemo(
    () =>
      Array.from({ length: n }, (_, i) => ({
        id: i,
        left: 8 + ((i * 17) % 84),
        delay: (i % 6) * 0.45,
        duration: 5 + (i % 4),
        size: 3 + (i % 3),
      })),
    [n],
  );

  if (!allowParticles || n === 0) return null;

  return (
    <div
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
      aria-hidden
    >
      {seeds.map((p) => (
        <motion.span
          key={p.id}
          className="absolute rounded-full bg-primary/35"
          style={{
            left: `${p.left}%`,
            bottom: "-4%",
            width: p.size,
            height: p.size,
          }}
          animate={{ y: ["0%", "-110%"], opacity: [0, 0.7, 0] }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      ))}
    </div>
  );
});

// ─── Confetti reward ─────────────────────────────────────────────────────────

const CONFETTI_COLORS = ["#fbbf24", "#f472b6", "#60a5fa", "#34d399", "#a78bfa", "#fb7185"];

export function ConfettiReward({
  active,
  onDone,
  intensity = "full",
}: {
  active: boolean;
  onDone?: () => void;
  intensity?: "card" | "full";
}) {
  const { allowParticles, particleCount, reduced } = useSoundWorldMotion();
  const count = intensity === "full" ? particleCount : Math.min(8, particleCount);
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const angle = (i / Math.max(1, count)) * Math.PI * 2 + (i % 3) * 0.2;
        const dist = 60 + (i % 5) * 18;
        return {
          id: i,
          x: Math.cos(angle) * dist,
          y: Math.sin(angle) * dist - 40,
          rot: (i % 8) * 45,
          color: CONFETTI_COLORS[i % CONFETTI_COLORS.length]!,
          delay: i * 0.02,
        };
      }),
    [count],
  );

  useEffect(() => {
    if (!active) return;
    if (reduced || !allowParticles) {
      onDone?.();
      return;
    }
    const t = window.setTimeout(() => onDone?.(), 1100);
    return () => window.clearTimeout(t);
  }, [active, allowParticles, onDone, reduced]);

  return (
    <AnimatePresence>
      {active && allowParticles && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="pointer-events-none fixed inset-0 z-[70] flex items-center justify-center"
          aria-hidden
        >
          {pieces.map((p) => (
            <motion.span
              key={p.id}
              className="absolute h-2.5 w-2.5 rounded-[2px]"
              style={{ background: p.color }}
              initial={{ opacity: 1, x: 0, y: 0, rotate: 0, scale: 1 }}
              animate={{
                opacity: 0,
                x: p.x,
                y: p.y,
                rotate: p.rot,
                scale: 0.6,
              }}
              transition={{ duration: 0.95, delay: p.delay, ease: EASE_SOFT }}
            />
          ))}
          <motion.span
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: [0.7, 1.15, 1], opacity: [0, 1, 0] }}
            transition={{ duration: 0.9 }}
            className="text-5xl"
          >
            🎉
          </motion.span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Audio wave bars ─────────────────────────────────────────────────────────

export function AudioWaveBars({
  active,
  bars = 8,
  className,
  amplitudes,
}: {
  active?: boolean;
  bars?: number;
  className?: string;
  amplitudes?: number[];
}) {
  const { reduced } = useSoundWorldMotion();
  const levels = useMemo(() => {
    if (amplitudes?.length) return amplitudes.slice(0, bars);
    return Array.from({ length: bars }, (_, i) => 0.35 + ((i * 17) % 50) / 100);
  }, [amplitudes, bars]);

  return (
    <div className={cn("flex h-8 items-end gap-[3px]", className)} aria-hidden>
      {levels.map((amp, i) => (
        <motion.span
          key={i}
          className="w-[3px] rounded-full bg-primary/80"
          animate={
            active && !reduced
              ? {
                  height: [
                    `${Math.max(18, amp * 70)}%`,
                    `${Math.max(30, amp * 100)}%`,
                    `${Math.max(18, amp * 55)}%`,
                  ],
                  opacity: [0.65, 1, 0.7],
                }
              : { height: `${Math.max(18, amp * 80)}%`, opacity: active ? 1 : 0.55 }
          }
          transition={
            active && !reduced
              ? {
                  duration: 0.45 + (i % 3) * 0.08,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: i * 0.04,
                }
              : { duration: DURATION.short }
          }
          style={{ height: `${Math.max(18, amp * 80)}%` }}
        />
      ))}
    </div>
  );
}

// ─── Animated score counter ──────────────────────────────────────────────────

export function AnimatedScore({
  value,
  className,
  suffix = "",
}: {
  value: number;
  className?: string;
  suffix?: string;
}) {
  const { reduced } = useSoundWorldMotion();
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);

  useEffect(() => {
    if (reduced || value === prev.current) {
      setDisplay(value);
      prev.current = value;
      return;
    }
    const from = prev.current;
    prev.current = value;
    const controls = animate(from, value, {
      duration: 0.55,
      ease: EASE_WARM,
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    return () => controls.stop();
  }, [value, reduced]);

  return (
    <motion.span
      key={reduced ? value : "live"}
      className={cn("tabular-nums", className)}
      animate={value !== display && !reduced ? { scale: [1, 1.08, 1] } : undefined}
      transition={TRANSITION.spring}
    >
      {display}
      {suffix}
    </motion.span>
  );
}

// ─── Progressive star fill ───────────────────────────────────────────────────

export function ProgressiveStarFill({
  pct,
  className,
}: {
  pct: number;
  className?: string;
}) {
  const { reduced, springGentle } = useSoundWorldMotion();
  const clamped = Math.max(0, Math.min(100, pct));

  return (
    <div
      className={cn(
        "relative h-2 w-full overflow-hidden rounded-full bg-white/10",
        className,
      )}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <motion.div
        className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-200"
        initial={false}
        animate={{ width: `${clamped}%` }}
        transition={reduced ? { duration: 0 } : springGentle}
      />
      {!reduced && clamped > 0 && clamped < 100 && (
        <motion.span
          className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-amber-100 shadow-[0_0_8px_rgba(251,191,36,0.8)]"
          style={{ left: `calc(${clamped}% - 6px)` }}
          animate={{ scale: [1, 1.25, 1], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
    </div>
  );
}

// ─── XP fly to wallet ────────────────────────────────────────────────────────

const XP_FLY_EVENT = "amynest:sound-world-xp-fly";

export type XpFlyDetail = { amount?: number; clientX?: number; clientY?: number };

export function emitXpFly(detail: XpFlyDetail = {}): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(XP_FLY_EVENT, { detail }));
}

export function XpWalletTarget({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div data-sound-world-xp-wallet className={cn("relative", className)}>
      {children}
    </div>
  );
}

export function XpFlyLayer() {
  const { allowParticles, reduced } = useSoundWorldMotion();
  const [flights, setFlights] = useState<
    Array<{ id: number; fromX: number; fromY: number; toX: number; toY: number; amount: number }>
  >([]);
  const idRef = useRef(0);

  useEffect(() => {
    if (reduced || !allowParticles) return;
    const onFly = (e: Event) => {
      const detail = (e as CustomEvent<XpFlyDetail>).detail ?? {};
      const wallet = document.querySelector("[data-sound-world-xp-wallet]");
      const walletRect = wallet?.getBoundingClientRect();
      const toX = walletRect ? walletRect.left + walletRect.width * 0.75 : window.innerWidth - 48;
      const toY = walletRect ? walletRect.top + walletRect.height / 2 : 64;
      const fromX = detail.clientX ?? window.innerWidth / 2;
      // Mid-viewport fallback — avoid guessed keyboard-height ratios (ChatPlatform gate).
      const fromY = detail.clientY ?? Math.round(window.innerHeight / 2);
      const id = ++idRef.current;
      setFlights((prev) => [
        ...prev.slice(-4),
        { id, fromX, fromY, toX, toY, amount: detail.amount ?? 2 },
      ]);
      window.setTimeout(() => {
        setFlights((prev) => prev.filter((f) => f.id !== id));
      }, 900);
    };
    window.addEventListener(XP_FLY_EVENT, onFly);
    return () => window.removeEventListener(XP_FLY_EVENT, onFly);
  }, [allowParticles, reduced]);

  if (reduced || !allowParticles) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[65]" aria-hidden>
      <AnimatePresence>
        {flights.map((f) => (
          <motion.span
            key={f.id}
            className="absolute text-sm font-bold text-amber-300 drop-shadow"
            initial={{ opacity: 1, x: f.fromX, y: f.fromY, scale: 1 }}
            animate={{ opacity: 0, x: f.toX, y: f.toY, scale: 0.7 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.75, ease: EASE_WARM }}
            style={{ left: 0, top: 0 }}
          >
            +{f.amount} XP
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ─── Sticker unlock celebration ──────────────────────────────────────────────

export function StickerUnlockCelebration({
  active,
  emoji,
  onDone,
}: {
  active: boolean;
  emoji: string;
  onDone?: () => void;
}) {
  const { reduced, spring } = useSoundWorldMotion();

  useEffect(() => {
    if (!active) return;
    const t = window.setTimeout(() => onDone?.(), reduced ? 200 : 1200);
    return () => window.clearTimeout(t);
  }, [active, onDone, reduced]);

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="pointer-events-none fixed inset-0 z-[68] flex items-center justify-center bg-black/35"
          aria-hidden
        >
          <ConfettiReward active={!reduced} intensity="card" />
          <motion.div
            initial={{ scale: 0.5, rotate: -12, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={spring}
            className="flex flex-col items-center gap-2"
          >
            <ObjectBounce active={!reduced}>
              <span className="text-7xl drop-shadow-lg">{emoji}</span>
            </ObjectBounce>
            <p className="text-sm font-bold text-amber-100">Sticker unlocked!</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Daily mission completion ────────────────────────────────────────────────

export function MissionCompleteBanner({
  active,
  label = "Adventure complete!",
  onDone,
}: {
  active: boolean;
  label?: string;
  onDone?: () => void;
}) {
  const { reduced, springGentle } = useSoundWorldMotion();

  useEffect(() => {
    if (!active) return;
    const t = window.setTimeout(() => onDone?.(), reduced ? 250 : 1600);
    return () => window.clearTimeout(t);
  }, [active, onDone, reduced]);

  return (
    <>
      <ConfettiReward active={active} onDone={undefined} intensity="full" />
      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8 }}
            transition={springGentle}
            className="pointer-events-none fixed inset-x-0 bottom-24 z-[66] flex justify-center px-4"
            role="status"
          >
            <div className="rounded-full border border-amber-300/40 bg-amber-500/20 px-5 py-3 text-sm font-bold text-amber-50 shadow-lg backdrop-blur-md">
              ✨ {label}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ─── Page / mode transitions ─────────────────────────────────────────────────

export function SoundWorldPage({
  children,
  className,
  particles = true,
}: {
  children: ReactNode;
  className?: string;
  particles?: boolean;
}) {
  const { reduced, springGentle } = useSoundWorldMotion();
  return (
    <motion.div
      variants={reduced ? fadeUp : pageEnter}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={springGentle}
      className={cn("relative", className)}
    >
      {particles ? <FloatingParticles /> : null}
      {children}
    </motion.div>
  );
}

export function ModePanel({
  modeKey,
  children,
  className,
}: {
  modeKey: string;
  children: ReactNode;
  className?: string;
}) {
  const { reduced, springGentle } = useSoundWorldMotion();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={modeKey}
        variants={reduced ? fadeInSafe : softScale}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={springGentle}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

const fadeInSafe = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

// ─── Smooth loading placeholders ─────────────────────────────────────────────

export function SmoothSkeletonCard({
  index = 0,
  className,
}: {
  index?: number;
  className?: string;
}) {
  const { reduced } = useSoundWorldMotion();
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...TRANSITION.warm, delay: staggerDelay(index) }}
      className={cn(
        "premium-skeleton route-shimmer aspect-[4/5] rounded-[24px] border border-white/10",
        className,
      )}
      aria-hidden
    />
  );
}

export function SmoothLoadingGrid({ count = 6, columns = 2 }: { count?: number; columns?: number }) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading items"
      className="grid gap-4"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <SmoothSkeletonCard key={i} index={i} />
      ))}
      <span className="sr-only">Loading discovery items</span>
    </div>
  );
}

// ─── Spring progress bar (daily missions) ────────────────────────────────────

export function SpringProgressBar({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  const { reduced, springGentle } = useSoundWorldMotion();
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-white/10", className)}>
      <motion.div
        className="h-full rounded-full bg-gradient-to-r from-primary to-violet-400"
        initial={false}
        animate={{ width: `${clamped}%` }}
        transition={reduced ? { duration: 0 } : springGentle}
      />
    </div>
  );
}

// Re-export for convenience in experience shell
export { useMotionValue, useTransform };
