import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/lib/reduced-motion";

export function HealthLabFilmGrain({ className }: { className?: string }) {
  return (
    <div
      className={cn("health-lab-film-grain pointer-events-none absolute inset-0 z-[1] opacity-[0.18]", className)}
      aria-hidden
    />
  );
}

export function HealthLabStarfield({ count = 40, className }: { count?: number; className?: string }) {
  const reduced = useReducedMotion();
  const stars = Array.from({ length: reduced ? Math.min(count, 12) : count }, (_, i) => ({
    id: i,
    left: `${(i * 29 + 11) % 100}%`,
    top: `${(i * 37 + 5) % 100}%`,
    size: 1 + (i % 3),
    delay: (i % 8) * 0.35,
    duration: 2.5 + (i % 5),
  }));

  return (
    <div className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)} aria-hidden>
      {stars.map((s) =>
        reduced ? (
          <div
            key={s.id}
            className="absolute rounded-full bg-white/50"
            style={{ left: s.left, top: s.top, width: s.size, height: s.size }}
          />
        ) : (
          <motion.div
            key={s.id}
            className="absolute rounded-full bg-white"
            style={{
              left: s.left,
              top: s.top,
              width: s.size,
              height: s.size,
              boxShadow: "0 0 6px rgba(255,255,255,0.8)",
            }}
            animate={{ opacity: [0.2, 1, 0.2], scale: [1, 1.4, 1] }}
            transition={{ duration: s.duration, repeat: Infinity, delay: s.delay }}
          />
        ),
      )}
    </div>
  );
}

export function HealthLabPhaseFlash({
  active,
  color = "rgba(34,211,238,0.35)",
}: {
  active: boolean;
  color?: string;
}) {
  const reduced = useReducedMotion();
  if (reduced) return null;

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          className="pointer-events-none absolute inset-0 z-[2]"
          style={{ background: `radial-gradient(circle at center, ${color}, transparent 70%)` }}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.9, 0] }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.55 }}
          aria-hidden
        />
      )}
    </AnimatePresence>
  );
}

export function HealthLabMissionBanner({
  eyebrow,
  title,
  subtitle,
  tone = "neutral",
  className,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  tone?: "neutral" | "danger" | "go" | "success" | "freeze";
  className?: string;
}) {
  const tones = {
    neutral: "border-white/15 from-white/[0.1] to-white/[0.03] text-white",
    danger: "border-rose-400/30 from-rose-500/20 to-rose-950/20 text-rose-50 health-lab-pulse-danger",
    go: "border-emerald-400/35 from-emerald-500/25 to-teal-950/20 text-emerald-50 health-lab-pulse-go",
    success: "border-amber-400/30 from-amber-500/20 to-orange-950/15 text-amber-50",
    freeze: "border-cyan-300/35 from-cyan-400/20 to-indigo-950/25 text-cyan-50 health-lab-pulse-freeze",
  };

  return (
    <motion.div
      key={title}
      initial={{ opacity: 0, y: 12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={cn(
        "rounded-2xl border bg-gradient-to-br px-5 py-4 text-center shadow-[0_12px_40px_-16px_rgba(0,0,0,0.65)] backdrop-blur-md",
        tones[tone],
        className,
      )}
    >
      {eyebrow && (
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] opacity-70">{eyebrow}</p>
      )}
      <p className={cn("font-bold tracking-tight", eyebrow ? "mt-1 text-xl sm:text-2xl" : "text-xl sm:text-2xl")}>
        {title}
      </p>
      {subtitle && <p className="mt-1.5 text-sm opacity-75">{subtitle}</p>}
    </motion.div>
  );
}

export function HealthLabRoundRail({
  current,
  total,
  label,
  className,
}: {
  current: number;
  total: number;
  label?: string;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto w-full max-w-xs px-4", className)}>
      {label && (
        <p className="mb-2 text-center text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">
          {label}
        </p>
      )}
      <div className="flex items-center justify-center gap-2">
        {Array.from({ length: total }).map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <div
              className={cn(
                "h-2.5 w-2.5 rounded-full transition-all duration-300",
                i < current
                  ? "bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]"
                  : i === current
                    ? "scale-125 bg-amber-300 shadow-[0_0_14px_rgba(252,211,77,0.85)]"
                    : "bg-white/15",
              )}
            />
            {i < total - 1 && (
              <div
                className={cn(
                  "h-0.5 w-4 rounded-full",
                  i < current ? "bg-emerald-400/70" : "bg-white/10",
                )}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function HealthLabAltitudeBadge({
  label,
  emoji,
  progress,
}: {
  label: string;
  emoji: string;
  progress: number;
}) {
  return (
    <div className="health-lab-timer-glass mx-auto flex max-w-xs items-center gap-3 rounded-2xl px-4 py-2.5">
      <span className="text-2xl" aria-hidden>{emoji}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45">Altitude</p>
        <p className="truncate text-sm font-semibold text-white">{label}</p>
        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/10">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-sky-400 via-violet-400 to-fuchsia-400"
            animate={{ width: `${Math.min(100, progress * 100)}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
      </div>
    </div>
  );
}

export function HealthLabLaunchPad({
  phase,
  reduced,
}: {
  phase: "intro" | "wait" | "go" | "too-early" | "result";
  reduced: boolean;
}) {
  const glow =
    phase === "go"
      ? "from-emerald-400/50 via-cyan-400/30 to-transparent"
      : phase === "wait" || phase === "too-early"
        ? "from-rose-500/35 via-orange-500/20 to-transparent"
        : "from-violet-500/30 via-indigo-500/15 to-transparent";

  return (
    <div className="relative flex flex-col items-center" aria-hidden>
      {!reduced && phase === "go" && (
        <>
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="absolute bottom-16 h-24 w-24 rounded-full bg-emerald-400/20 blur-2xl"
              animate={{ scale: [1, 2.2, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.25 }}
            />
          ))}
        </>
      )}
      <div
        className={cn(
          "relative flex h-28 w-28 items-center justify-center rounded-[2rem] border border-white/20",
          "bg-gradient-to-br from-slate-700/80 via-slate-800/90 to-slate-950/95",
          "shadow-[0_20px_60px_-20px_rgba(0,0,0,0.8)]",
        )}
      >
        <div className={cn("absolute -inset-4 rounded-[2.4rem] bg-gradient-to-t blur-2xl", glow)} />
        <span className="relative text-5xl drop-shadow-[0_8px_16px_rgba(0,0,0,0.5)]">
          {phase === "go" ? "🚀" : phase === "wait" || phase === "too-early" ? "🛑" : phase === "result" ? "✅" : "🚀"}
        </span>
      </div>
      <div className="mt-3 h-3 w-40 rounded-full bg-gradient-to-r from-slate-600 via-slate-500 to-slate-600 shadow-inner" />
      <div className="mt-1 h-8 w-48 rounded-b-[2rem] bg-gradient-to-b from-orange-500/25 to-transparent blur-sm" />
      {!reduced && (phase === "wait" || phase === "too-early") && (
        <motion.div
          className="absolute -bottom-2 h-16 w-16 rounded-full bg-orange-400/20 blur-xl"
          animate={{ opacity: [0.3, 0.7, 0.3], scale: [0.9, 1.1, 0.9] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      )}
    </div>
  );
}

export function HealthLabSkyIslandScene({
  wobble,
  weather,
  reduced,
}: {
  wobble: number;
  weather: "calm" | "wind";
  reduced: boolean;
}) {
  return (
    <div className="relative flex flex-col items-center">
      {!reduced && (
        <>
          <motion.div
            className="pointer-events-none absolute -top-8 left-0 text-3xl opacity-40"
            animate={{ x: [0, 30, 0] }}
            transition={{ duration: 12, repeat: Infinity }}
          >
            ☁️
          </motion.div>
          <motion.div
            className="pointer-events-none absolute -top-4 right-0 text-2xl opacity-30"
            animate={{ x: [0, -24, 0] }}
            transition={{ duration: 10, repeat: Infinity, delay: 1 }}
          >
            ☁️
          </motion.div>
          {weather === "wind" && (
            <motion.div
              className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-slate-300/10 to-transparent"
              animate={{ opacity: [0.2, 0.5, 0.2] }}
              transition={{ duration: 0.8, repeat: Infinity }}
            />
          )}
        </>
      )}

      <motion.div
        className="relative"
        animate={{ rotate: wobble, x: wobble * 2, y: wobble * 0.5 }}
        transition={{ type: "spring", stiffness: 180, damping: 12 }}
      >
        <div className="absolute -top-16 left-1/2 h-16 w-0.5 -translate-x-1/2 bg-gradient-to-b from-transparent to-white/20" aria-hidden />
        <div
          className={cn(
            "relative h-44 w-72 rounded-[50%] border border-white/25",
            "bg-gradient-to-br from-emerald-300/95 via-teal-500/90 to-cyan-700/85",
            "shadow-[0_28px_70px_-20px_rgba(16,185,129,0.65),inset_0_8px_24px_rgba(255,255,255,0.15)]",
          )}
        >
          <div className="absolute inset-x-8 top-4 h-8 rounded-full bg-white/10 blur-md" aria-hidden />
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-5xl drop-shadow-lg">
            🦩
          </span>
        </div>
        <div
          className="absolute -bottom-3 left-1/2 h-8 w-56 -translate-x-1/2 rounded-[100%] bg-black/25 blur-xl"
          aria-hidden
        />
      </motion.div>
    </div>
  );
}

export function HealthLabGardenStage({
  phase,
  crystals,
  roundIndex,
  total,
  reduced,
}: {
  phase: string;
  crystals: number;
  roundIndex: number;
  total: number;
  reduced: boolean;
}) {
  return (
    <div className="relative w-full max-w-sm">
      {!reduced && (
        <div className="health-lab-aurora pointer-events-none absolute -inset-x-8 -top-10 h-40 opacity-60" aria-hidden />
      )}
      <div className="relative flex justify-center gap-2 rounded-[1.5rem] border border-white/10 bg-gradient-to-b from-emerald-950/40 to-teal-950/20 px-5 py-4 backdrop-blur-md">
        {Array.from({ length: total }).map((_, i) => {
          const state =
            i < crystals ? "crystal" : phase === "dance" && i === roundIndex ? "bloom" : "seed";
          return (
            <motion.div
              key={i}
              className="flex flex-col items-center gap-1"
              animate={
                state === "bloom" && !reduced
                  ? { y: [0, -4, 0], scale: [1, 1.08, 1] }
                  : state === "crystal" && !reduced
                    ? { scale: [1, 1.05, 1] }
                    : {}
              }
              transition={{ duration: 1.2, repeat: state !== "seed" ? Infinity : 0 }}
            >
              <span className="text-2xl drop-shadow-md">
                {state === "crystal" ? "💎" : state === "bloom" ? "🌸" : "🌱"}
              </span>
              <div
                className={cn(
                  "h-8 w-1 rounded-full",
                  state === "crystal"
                    ? "bg-gradient-to-t from-cyan-400/80 to-emerald-300/40"
                    : "bg-gradient-to-t from-emerald-700/60 to-emerald-500/20",
                )}
              />
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

export function HealthLabReactorChamber({
  active,
  ringScale,
  brightness,
  crackLevel,
  targetOffset,
  offset,
  reduced,
  children,
}: {
  active: boolean;
  ringScale: number;
  brightness: number;
  crackLevel: number;
  targetOffset: { x: number; y: number };
  offset: { x: number; y: number };
  reduced: boolean;
  children?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "relative flex h-72 w-72 items-center justify-center",
        crackLevel > 0.5 && !reduced && "health-lab-reactor-shake",
      )}
    >
      {!reduced && active && (
        <>
          <motion.div
            className="absolute inset-0 rounded-full border border-violet-400/20"
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          />
          <motion.div
            className="absolute inset-3 rounded-full border border-cyan-400/15"
            animate={{ rotate: -360 }}
            transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
          />
        </>
      )}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-violet-300/30 transition-all duration-300"
        style={{
          width: 220 * ringScale,
          height: 220 * ringScale,
          background:
            "radial-gradient(circle, rgba(139,92,246,0.18) 0%, rgba(76,29,149,0.08) 55%, transparent 70%)",
          boxShadow: `0 0 ${50 * brightness}px rgba(167,139,250,0.5)`,
        }}
      />
      <motion.div
        className="absolute left-1/2 top-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/25"
        style={{
          background: `radial-gradient(circle, rgba(167,139,250,${brightness}) 0%, rgba(139,92,246,0.35) 70%)`,
          boxShadow: `0 0 ${48 * brightness}px rgba(167,139,250,0.9), inset 0 0 24px rgba(255,255,255,0.18)`,
        }}
        animate={
          active && !reduced
            ? {
                x: `calc(-50% + ${targetOffset.x + offset.x * 0.1}px)`,
                y: `calc(-50% + ${targetOffset.y + offset.y * 0.1}px)`,
                scale: [1, 1.03, 1],
              }
            : {
                x: `calc(-50% + ${targetOffset.x}px)`,
                y: `calc(-50% + ${targetOffset.y}px)`,
                scale: 1,
              }
        }
        transition={
          active && !reduced
            ? { scale: { duration: 1.5, repeat: Infinity }, x: { duration: 0.05 }, y: { duration: 0.05 } }
            : { duration: 0.2 }
        }
      />
      {!reduced && active && (
        <>
          {[...Array(6)].map((_, i) => (
            <motion.span
              key={i}
              className="absolute text-xs text-violet-200/70"
              style={{ left: `${20 + i * 12}%`, top: `${15 + (i % 3) * 25}%` }}
              animate={{ opacity: [0, 1, 0], y: [0, -20, -40] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.25 }}
            >
              ✦
            </motion.span>
          ))}
        </>
      )}
      {crackLevel > 0.3 && (
        <motion.div
          className="pointer-events-none absolute text-4xl opacity-70"
          animate={!reduced ? { scale: [1, 1.1, 1], opacity: [0.5, 0.8, 0.5] } : {}}
          transition={{ duration: 0.6, repeat: Infinity }}
          aria-hidden
        >
          💔
        </motion.div>
      )}
      {children}
    </div>
  );
}

export function HealthLabFreezeOverlay({ active }: { active: boolean }) {
  const reduced = useReducedMotion();
  if (reduced) return null;

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-cyan-500/10 via-indigo-900/20 to-violet-950/30 backdrop-blur-[1px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          aria-hidden
        />
      )}
    </AnimatePresence>
  );
}
