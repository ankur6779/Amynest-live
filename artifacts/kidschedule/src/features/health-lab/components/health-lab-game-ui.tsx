import type { CSSProperties, PointerEvent, ReactNode, RefObject } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Check, Play, Sparkles, Star, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/lib/reduced-motion";
import type { GAMES } from "../constants";
import { formatGamePersonalBest } from "../game-card-utils";
import type { AdventureBadge } from "../play-path";
import type { GameSessionResult } from "../types";
import { getWorldIdentity } from "../world-identity";
import type { WorldEvolutionSnapshot } from "../world-evolution";
import { HealthLabWorldMotif } from "./health-lab-world-motif";
import {
  HEALTH_LAB_GAME_BTN,
  HEALTH_LAB_SECTION_EYEBROW,
  HEALTH_LAB_SECTION_TITLE,
  HEALTH_LAB_THEME,
} from "../theme";

type GameDef = (typeof GAMES)[number];

const SENSOR_KID: Record<GameDef["sensor"], string> = {
  touch: "👆 Tap",
  motion: "📱 Move",
  aggregate: "📖 Story",
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
  footer,
}: {
  eyebrow: string;
  title: string;
  hint: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <section aria-labelledby="challenges-heading" className="space-y-3">
      <div className="min-w-0 px-0.5">
        {eyebrow ? <p className={HEALTH_LAB_SECTION_EYEBROW}>{eyebrow}</p> : null}
        <h2 id="challenges-heading" className={cn(HEALTH_LAB_SECTION_TITLE, "mt-0.5 text-xl sm:text-2xl")}>
          {title}
        </h2>
        {hint ? <p className="mt-1 text-sm leading-relaxed text-violet-100/65">{hint}</p> : null}
      </div>
      <div className="grid gap-3">{children}</div>
      {footer}
    </section>
  );
}

export function HealthLabGameCard({
  game,
  personalBest,
  gameHistory = [],
  onSelect,
  index = 0,
  badge = null,
  playLabel = "Play",
  evolution = null,
}: {
  game: GameDef;
  personalBest?: number;
  gameHistory?: GameSessionResult[];
  onSelect: () => void;
  index?: number;
  badge?: AdventureBadge;
  playLabel?: string;
  /** Visual world stage from existing completion history (presentation only). */
  evolution?: WorldEvolutionSnapshot | null;
}) {
  const reduced = useReducedMotion();
  const visuals = GAME_VISUALS[game.id];
  const world = getWorldIdentity(game.id);
  const best = formatGamePersonalBest(game.id, personalBest, gameHistory, game.bestScoreKind);
  const isRecommended = badge === "recommended";
  const isCompleted = badge === "completed";
  const stage = evolution?.stage ?? 0;
  const unrestored = stage === 0;

  return (
    <motion.button
      type="button"
      onClick={onSelect}
      initial={reduced ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={reduced ? undefined : { y: -2 }}
      whileTap={reduced ? undefined : { scale: 0.985 }}
      transition={{ delay: Math.min(index, 4) * 0.05, duration: 0.32, ease: "easeOut" }}
      aria-label={`${playLabel}: ${world.worldName}. ${evolution?.milestoneLabel ?? world.kidAction}. ${game.title}`}
      className={cn(
        HEALTH_LAB_GAME_BTN,
        "health-lab-world-card health-lab-pressable group border-white/18",
        isRecommended && "ring-2 ring-amber-300/70 ring-offset-2 ring-offset-[#0a0f2e]",
        stage >= 4 && "ring-1 ring-emerald-300/35",
      )}
      style={{
        boxShadow: `0 14px 40px -18px rgba(0,0,0,0.8), 0 0 40px -20px ${world.glow}`,
      }}
    >
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-br transition-opacity duration-500",
          world.sky,
          unrestored && "opacity-55 grayscale-[0.35]",
          stage >= 3 && "opacity-100",
        )}
        aria-hidden
      />
      <div
        className={cn(
          "absolute inset-0 bg-[#070b24]/35",
          stage >= 4 && "bg-[#070b24]/20",
          unrestored && "bg-[#070b24]/55",
        )}
        aria-hidden
      />
      <HealthLabWorldMotif
        motif={world.motif}
        alive={!reduced}
        stage={stage}
        friendEmoji={evolution?.friendEmoji}
        celebrating={Boolean(evolution?.helpedToday)}
      />

      <div className="health-lab-world-card__row">
        <div
          className={cn(
            "health-lab-world-card__icon relative flex items-center justify-center rounded-[1.15rem]",
            "border border-white/30 bg-gradient-to-br shadow-lg",
            visuals.ring,
            !reduced && "health-lab-icon-float",
            unrestored && "opacity-80",
          )}
          style={{ boxShadow: `0 10px 24px -8px ${world.glow}, inset 0 1px 0 rgba(255,255,255,0.35)` }}
        >
          <span
            className={cn(
              "health-lab-world-card__icon-emoji drop-shadow-[0_3px_10px_rgba(0,0,0,0.4)]",
              !reduced && "health-lab-emoji-bob",
            )}
            aria-hidden
          >
            {game.emoji}
          </span>
          {isCompleted && (
            <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-400 text-emerald-950 shadow-md">
              <Check className="h-3.5 w-3.5 stroke-[3]" aria-hidden />
            </span>
          )}
        </div>

        <div className="health-lab-world-card__body">
          <div className="flex max-w-full flex-wrap items-center gap-1">
            {isRecommended && (
              <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-amber-300 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-amber-950">
                <Sparkles className="h-3 w-3 shrink-0" aria-hidden />
                Go
              </span>
            )}
            {badge === "new" && (
              <span className="shrink-0 rounded-full bg-cyan-300 px-2 py-0.5 text-[10px] font-black uppercase text-cyan-950">
                New
              </span>
            )}
            {badge === "daily" && !isRecommended && (
              <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-violet-300 px-2 py-0.5 text-[10px] font-black uppercase text-violet-950">
                <Star className="h-3 w-3 shrink-0" aria-hidden />
                Daily
              </span>
            )}
            {evolution && stage >= 1 && (
              <span
                className={cn(
                  "min-w-0 max-w-full truncate rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wide",
                  stage >= 4
                    ? "border-emerald-300/50 bg-emerald-400/25 text-emerald-50"
                    : "border-white/20 bg-white/10 text-white/85",
                )}
              >
                {evolution.milestoneLabel}
              </span>
            )}
          </div>
          <h3 className="health-lab-world-card__title drop-shadow-sm">{world.worldName}</h3>
          {/* Full catalog title kept for recognition + certification selectors */}
          <p className="mt-0.5 truncate text-[0.7rem] font-medium text-white/55">{game.title}</p>
          <p className="health-lab-world-card__mission">
            {unrestored ? `Restore ${world.worldName}` : world.kidAction}
          </p>
          <div className="health-lab-world-card__meta">
            <span>{SENSOR_KID[game.sensor]}</span>
            <span aria-hidden>·</span>
            <span>{game.durationHint}</span>
            {stage >= 1 ? (
              <>
                <span aria-hidden>·</span>
                <span className="text-emerald-200/90">{evolution?.stageLabel}</span>
              </>
            ) : (
              <>
                <span aria-hidden>·</span>
                <span className={best.empty ? "text-white/50" : "text-amber-200"}>
                  {best.empty ? "🏆 Beat your best!" : `🏆 ${best.value}`}
                </span>
              </>
            )}
          </div>
        </div>

        <div
          className={cn(
            "health-lab-world-card__cta font-bold transition-transform duration-150",
            "group-hover:scale-105 group-active:scale-95",
            world.ctaClass,
          )}
        >
          <Play className="h-[1.15rem] w-[1.15rem] shrink-0 fill-current" aria-hidden />
          <span className="max-w-full truncate px-0.5 text-[0.55rem] font-black uppercase leading-none tracking-wide">
            {playLabel}
          </span>
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
        "health-lab-stage-vignette health-lab-stage-mesh relative overflow-hidden",
        fullBleed ? "health-lab-game-stage-shell" : "flex min-h-[70dvh] flex-col",
        !style && `bg-gradient-to-b ${stage}`,
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
      <div className="health-lab-game-stage-content">{children}</div>
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
