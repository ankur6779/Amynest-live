import type { CSSProperties, PointerEvent, ReactNode, RefObject } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ChevronRight, Gamepad2, Sparkles, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/lib/reduced-motion";
import type { GAMES } from "../constants";
import { HEALTH_LAB_GAME_BTN, HEALTH_LAB_SECTION_EYEBROW, HEALTH_LAB_SECTION_TITLE, HEALTH_LAB_THEME } from "../theme";

type GameDef = (typeof GAMES)[number];

const SENSOR_LABELS: Record<GameDef["sensor"], string> = {
  touch: "Touch",
  motion: "Motion",
  aggregate: "Report",
};

const GAME_VISUALS: Record<
  GameDef["id"],
  { ring: string; glow: string; badge: string; stage: string; accent: string }
> = {
  "breath-control": {
    ring: "from-sky-300/90 via-indigo-500/80 to-violet-600/90",
    glow: "rgba(56,189,248,0.55)",
    badge: "bg-sky-500/25 text-sky-100 border-sky-300/35",
    stage: "from-sky-950/90 via-indigo-950/80 to-violet-950/90",
    accent: "from-sky-400/80 to-violet-500/80",
  },
  "flamingo-balance": {
    ring: "from-pink-300/90 via-rose-500/80 to-orange-400/90",
    glow: "rgba(244,114,182,0.55)",
    badge: "bg-rose-500/25 text-rose-50 border-rose-300/35",
    stage: "from-rose-950/90 via-pink-950/80 to-orange-950/85",
    accent: "from-pink-400/80 to-orange-400/80",
  },
  "reaction-time": {
    ring: "from-red-400/90 via-amber-400/80 to-emerald-400/90",
    glow: "rgba(251,191,36,0.55)",
    badge: "bg-amber-500/25 text-amber-50 border-amber-300/35",
    stage: "from-slate-950/95 via-indigo-950/90 to-violet-950/90",
    accent: "from-amber-400/80 to-emerald-400/80",
  },
  "freeze-statue": {
    ring: "from-emerald-300/90 via-teal-500/80 to-cyan-400/90",
    glow: "rgba(45,212,191,0.55)",
    badge: "bg-emerald-500/25 text-emerald-50 border-emerald-300/35",
    stage: "from-emerald-950/90 via-teal-950/85 to-cyan-950/90",
    accent: "from-emerald-400/80 to-cyan-400/80",
  },
  "finger-stability": {
    ring: "from-violet-400/90 via-purple-600/80 to-fuchsia-400/90",
    glow: "rgba(167,139,250,0.6)",
    badge: "bg-violet-500/25 text-violet-50 border-violet-300/35",
    stage: "from-violet-950/95 via-purple-950/90 to-fuchsia-950/90",
    accent: "from-violet-400/80 to-fuchsia-400/80",
  },
  "calmness-meter": {
    ring: "from-amber-300/90 via-violet-500/80 to-indigo-500/90",
    glow: "rgba(251,191,36,0.5)",
    badge: "bg-amber-500/25 text-amber-50 border-amber-300/35",
    stage: "from-indigo-950/90 via-violet-950/85 to-slate-950/90",
    accent: "from-amber-400/80 to-indigo-400/80",
  },
};

export function HealthLabChallengesSection({
  eyebrow,
  title,
  hint,
  children,
}: {
  eyebrow: string;
  title: string;
  hint: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby="challenges-heading">
      <div className={cn(HEALTH_LAB_THEME.cardGlass, "relative mb-4 overflow-hidden border-white/[0.14] p-4")}>
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" aria-hidden />
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-violet-300/20 bg-gradient-to-br from-violet-500/30 to-cyan-500/20 shadow-[0_8px_24px_-8px_rgba(139,92,246,0.45)]">
            <Gamepad2 className="h-5 w-5 text-violet-100" />
          </div>
          <div className="min-w-0">
            <p className={HEALTH_LAB_SECTION_EYEBROW}>{eyebrow}</p>
            <h2 id="challenges-heading" className={cn(HEALTH_LAB_SECTION_TITLE, "mt-1 text-lg sm:text-xl health-lab-title-shine")}>
              {title}
            </h2>
            <p className="mt-1.5 text-xs leading-relaxed text-violet-100/60">{hint}</p>
          </div>
        </div>
      </div>
      <div className="grid gap-3.5">{children}</div>
    </section>
  );
}

export function HealthLabGameCard({
  game,
  personalBest,
  bestLabel,
  onSelect,
  index = 0,
}: {
  game: GameDef;
  personalBest?: number;
  bestLabel?: string;
  onSelect: () => void;
  index?: number;
}) {
  const reduced = useReducedMotion();
  const visuals = GAME_VISUALS[game.id];

  return (
    <motion.button
      type="button"
      onClick={onSelect}
      initial={reduced ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={reduced ? undefined : { y: -2 }}
      whileTap={reduced ? undefined : { scale: 0.985 }}
      transition={{ delay: index * 0.06, duration: 0.4, ease: "easeOut" }}
      className={cn(
        HEALTH_LAB_GAME_BTN,
        "health-lab-premium-card group w-full text-left",
        "health-lab-game-card-shimmer",
      )}
      style={{
        boxShadow: `0 18px 50px -22px rgba(0,0,0,0.8), 0 0 60px -28px ${visuals.glow}`,
      }}
    >
      <div className="health-lab-premium-card-inner relative overflow-hidden p-4">
        <div
          className={cn("pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r opacity-80", visuals.accent)}
          aria-hidden
        />
        <div
          className={cn("pointer-events-none absolute inset-0 opacity-60 transition-opacity duration-300 group-hover:opacity-90", `bg-gradient-to-br ${game.theme}`)}
          style={{ maskImage: "linear-gradient(135deg, black 0%, transparent 58%)" }}
          aria-hidden
        />
        <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-white/[0.05] blur-3xl" aria-hidden />

        <div className="relative flex items-center gap-4">
          <div className="relative shrink-0">
            <div
              className={cn(
                "health-lab-icon-halo absolute -inset-2 rounded-[1.35rem] blur-md",
                `bg-gradient-to-br ${visuals.accent}`,
              )}
              style={{ opacity: 0.35 }}
              aria-hidden
            />
            <div
              className={cn(
                "relative flex h-[4.25rem] w-[4.25rem] items-center justify-center rounded-[1.15rem]",
                "border border-white/20 bg-gradient-to-br shadow-xl",
                visuals.ring,
                !reduced && "health-lab-icon-float",
              )}
              style={{ boxShadow: `0 10px 28px -10px ${visuals.glow}, inset 0 1px 0 rgba(255,255,255,0.35)` }}
            >
              <span className="text-[2rem] drop-shadow-[0_4px_8px_rgba(0,0,0,0.35)]" aria-hidden>
                {game.emoji}
              </span>
            </div>
            <span className="absolute -left-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-white/15 bg-[#0f1538]/90 text-[10px] font-bold text-violet-200/80">
              {index + 1}
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="text-[15px] font-semibold tracking-tight text-white drop-shadow-sm">{game.title}</p>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide", visuals.badge)}>
                {game.durationHint}
              </span>
              <span className="rounded-full border border-white/10 bg-white/[0.06] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white/55">
                {SENSOR_LABELS[game.sensor]}
              </span>
            </div>
            <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-white/60">{game.subtitle}</p>
            {personalBest != null && bestLabel && (
              <p className="mt-2.5 inline-flex items-center gap-1.5 rounded-full border border-amber-300/20 bg-gradient-to-r from-amber-400/15 to-orange-400/10 px-2.5 py-1 text-[11px] font-semibold text-amber-100">
                <Sparkles className="h-3 w-3 text-amber-300" />
                {bestLabel}: {personalBest}
              </p>
            )}
          </div>

          <div className="flex shrink-0 flex-col items-center gap-1.5">
            <div
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full",
                "border border-white/15 bg-gradient-to-br from-white/[0.12] to-white/[0.04]",
                "text-white/80 shadow-[0_4px_16px_-4px_rgba(0,0,0,0.4)]",
                "transition-all duration-300 group-hover:border-white/30 group-hover:from-violet-400/25 group-hover:to-cyan-400/15 group-hover:text-white",
              )}
            >
              <ChevronRight className="h-4 w-4" />
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-violet-300/50 transition-colors group-hover:text-violet-200/80">
              Play
            </span>
          </div>
        </div>
      </div>
    </motion.button>
  );
}

export function HealthLabGameStage({
  gameId,
  children,
  className,
  fullBleed = false,
  style,
}: {
  gameId?: GameDef["id"];
  children: ReactNode;
  className?: string;
  fullBleed?: boolean;
  style?: CSSProperties;
}) {
  const visuals = gameId ? GAME_VISUALS[gameId] : null;
  const stage = visuals?.stage ?? "from-[#0a0f2e] via-[#121a45] to-[#0d1230]";

  return (
    <div
      className={cn(
        "health-lab-stage-vignette relative overflow-hidden",
        fullBleed ? "min-h-[100dvh]" : "min-h-[70dvh]",
        !style && `bg-gradient-to-b ${stage}`,
        "health-lab-stage-mesh",
        className,
      )}
      style={style}
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(139,92,246,0.22),transparent_58%)]"
        aria-hidden
      />
      {visuals && (
        <div
          className="pointer-events-none absolute left-1/2 top-0 h-64 w-64 -translate-x-1/2 rounded-full blur-3xl"
          style={{ background: visuals.glow, opacity: 0.12 }}
          aria-hidden
        />
      )}
      <div
        className="pointer-events-none absolute -left-24 top-1/4 h-64 w-64 rounded-full bg-cyan-400/[0.06] blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-20 bottom-1/4 h-56 w-56 rounded-full bg-violet-500/[0.08] blur-3xl"
        aria-hidden
      />
      <div className="relative z-10 flex min-h-[inherit] flex-col">{children}</div>
    </div>
  );
}

export function HealthLabGameTopBar({
  onExit,
  title,
  exitLabel = "Exit",
}: {
  onExit: () => void;
  title?: string;
  exitLabel?: string;
}) {
  return (
    <div className={cn("health-lab-topbar-glass sticky top-0 z-20 px-4 py-3")}>
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onExit}
          className={cn(
            HEALTH_LAB_TOUCH_TARGET,
            "inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.08] px-3.5 py-2",
            "text-xs font-semibold text-white/85 shadow-[0_4px_16px_-6px_rgba(0,0,0,0.45)] backdrop-blur-md",
            "transition-all hover:border-white/25 hover:bg-white/[0.14] hover:text-white",
          )}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {exitLabel}
        </button>
        {title && (
          <p className="truncate text-[11px] font-semibold uppercase tracking-[0.16em] text-violet-200/55">
            {title}
          </p>
        )}
        <div className="w-[4.5rem]" aria-hidden />
      </div>
    </div>
  );
}

export function HealthLabGameHero({
  emoji,
  title,
  subtitle,
  className,
  gameId,
}: {
  emoji: string;
  title: string;
  subtitle?: string;
  className?: string;
  gameId?: GameDef["id"];
}) {
  const reduced = useReducedMotion();
  const accent = gameId ? GAME_VISUALS[gameId].accent : "from-violet-400/70 to-cyan-400/70";

  return (
    <div className={cn("flex flex-col items-center px-6 text-center", className)}>
      <div className="relative">
        <div
          className={cn("health-lab-icon-halo absolute -inset-4 rounded-[2rem] blur-2xl", `bg-gradient-to-br ${accent}`)}
          style={{ opacity: 0.4 }}
          aria-hidden
        />
        <div
          className={cn(
            HEALTH_LAB_THEME.cardGlass,
            "relative flex h-24 w-24 items-center justify-center rounded-[1.75rem] border-white/15 text-5xl",
            "shadow-[0_16px_48px_-12px_rgba(139,92,246,0.55)]",
            !reduced && "health-lab-icon-float",
          )}
        >
          {emoji}
        </div>
      </div>
      <h2 className="mt-6 text-2xl font-bold tracking-tight health-lab-title-shine sm:text-3xl">{title}</h2>
      {subtitle && (
        <p className="mt-3 max-w-sm text-sm leading-relaxed text-violet-100/70">{subtitle}</p>
      )}
    </div>
  );
}

export function HealthLabGameCta({
  children,
  onClick,
  variant = "primary",
  className,
}: {
  children: ReactNode;
  onClick: () => void;
  variant?: "primary" | "rose" | "emerald" | "violet" | "amber";
  className?: string;
}) {
  const variants = {
    primary: HEALTH_LAB_THEME.ctaPrimary,
    rose: "bg-gradient-to-r from-pink-500 via-rose-500 to-orange-500 text-white font-bold",
    emerald: "bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-500 text-white font-bold",
    violet: "bg-gradient-to-r from-violet-500 via-purple-600 to-fuchsia-500 text-white font-bold",
    amber: "bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 text-white font-bold",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        HEALTH_LAB_TOUCH_TARGET,
        "health-lab-cta-premium min-w-[12rem] rounded-2xl px-8 py-3.5 text-sm tracking-wide",
        variants[variant],
        "active:scale-[0.97] transition-transform",
        className,
      )}
    >
      <span className="relative z-[1] inline-flex items-center justify-center gap-2">
        <Zap className="h-4 w-4 opacity-90" aria-hidden />
        {children}
      </span>
    </button>
  );
}

export function HealthLabGameChips<T extends string>({
  options,
  selected,
  onSelect,
  className,
}: {
  options: readonly T[];
  selected: number;
  onSelect: (index: number) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap justify-center gap-2", className)}>
      {options.map((label, i) => (
        <button
          key={label}
          type="button"
          onClick={() => onSelect(i)}
          className={cn(
            HEALTH_LAB_TOUCH_TARGET,
            "rounded-full border px-4 py-2 text-sm font-semibold transition-all duration-200",
            selected === i
              ? "border-white/25 bg-gradient-to-r from-violet-500 to-indigo-500 text-white shadow-[0_6px_20px_-6px_rgba(139,92,246,0.65)]"
              : "border-white/10 bg-white/[0.05] text-violet-100/75 hover:border-white/20 hover:bg-white/[0.1] hover:text-white",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export function HealthLabGamePanel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        HEALTH_LAB_THEME.cardGlass,
        "relative overflow-hidden border-white/[0.14] bg-white/[0.06] p-4",
        "shadow-[0_12px_40px_-16px_rgba(0,0,0,0.55)]",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" aria-hidden />
      {children}
    </div>
  );
}

export function HealthLabGameTimer({
  value,
  label,
  className,
}: {
  value: string;
  label?: string;
  className?: string;
}) {
  return (
    <div className={cn("health-lab-timer-glass rounded-2xl px-6 py-4 text-center", className)}>
      <p className="font-mono text-4xl font-bold tabular-nums tracking-tight text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.35)] sm:text-5xl">
        {value}
      </p>
      {label && (
        <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/45">{label}</p>
      )}
    </div>
  );
}

export function HealthLabHoldOrb({
  holding,
  children,
  className,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  disabled,
  buttonRef,
  ariaLabel,
}: {
  holding: boolean;
  children: ReactNode;
  className?: string;
  onPointerDown: (e: PointerEvent<HTMLButtonElement>) => void;
  onPointerMove: (e: PointerEvent<HTMLButtonElement>) => void;
  onPointerUp: (e: PointerEvent<HTMLButtonElement>) => void;
  onPointerCancel: (e: PointerEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  buttonRef?: RefObject<HTMLButtonElement | null>;
  ariaLabel: string;
}) {
  return (
    <div className="relative flex items-center justify-center">
      <div
        className={cn(
          "pointer-events-none absolute h-44 w-44 rounded-full border border-cyan-300/20",
          holding ? "scale-100 opacity-80" : "scale-90 opacity-40",
          "transition-all duration-300",
        )}
        aria-hidden
      />
      <div
        className={cn(
          "pointer-events-none absolute h-36 w-36 rounded-full border border-violet-300/25",
          holding ? "scale-105 opacity-90" : "scale-95 opacity-50",
          "transition-all duration-300",
        )}
        aria-hidden
      />
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        className={cn(
          "relative flex h-32 w-32 items-center justify-center rounded-full touch-none select-none",
          "border border-white/25 bg-gradient-to-br from-cyan-300 via-violet-500 to-fuchsia-600",
          "health-lab-glow-pulse health-lab-cta-premium",
          "shadow-[0_0_50px_rgba(139,92,246,0.75)]",
          holding && "scale-95 border-cyan-200/40 shadow-[0_0_70px_rgba(34,211,238,0.85)]",
          className,
        )}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        aria-label={ariaLabel}
      >
        <span className="relative z-[1]">{children}</span>
      </button>
    </div>
  );
}

const HEALTH_LAB_TOUCH_TARGET = "min-h-[48px] min-w-[48px] touch-manipulation";
