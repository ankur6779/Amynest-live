// Smart Study Zone — engagement layer UI:
//   • EngagementStrip → streak + XP + daily-goal ring + badge chips
//   • XpPopup        → animated "+10 XP" floater that the caller mounts on a key bump
//   • ConfettiBurst  → cheap CSS-driven emoji confetti for perfect scores
//   • playFx         → tiny Web Audio chimes (correct / wrong / level-up); no asset deps
//
// All effects are kid-friendly, low-stakes, and brand-aligned (indigo/purple).

import { useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, Star, Target, Trophy } from "lucide-react";
import { playProceduralTone } from "@/lib/procedural-sfx";
import {
  DAILY_GOAL_TARGET,
  badgeLabel,
  type EngagementState,
} from "@workspace/study-zone";

// ─── Strip ────────────────────────────────────────────────────────────────────

export function EngagementStrip({ engagement }: { engagement: EngagementState }) {
  const goalPct = Math.min(100, Math.round((engagement.goalProgress / DAILY_GOAL_TARGET) * 100));
  const recentBadges = engagement.badges.slice(-6).reverse();
  return (
    <div className="rounded-2xl border border-border bg-card via-white p-4">
      <div className="flex items-center gap-3 flex-wrap">
        <Stat
          icon={<Flame className="h-4 w-4 text-foreground" />}
          label="Streak"
          value={`${engagement.streak} d`}
          tone="orange"
        />
        <Stat
          icon={<Star className="h-4 w-4 text-foreground" />}
          label="XP"
          value={engagement.xp.toString()}
          tone="amber"
        />
        <div className="ml-auto flex items-center gap-2">
          <GoalRing pct={goalPct} done={engagement.goalProgress} target={DAILY_GOAL_TARGET} />
        </div>
      </div>

      {recentBadges.length > 0 && (
        <div className="mt-3 flex items-center gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-thin">
          <Trophy className="h-3.5 w-3.5 text-foreground shrink-0" />
          {recentBadges.map((id) => {
            const b = badgeLabel(id);
            if (!b) return null;
            return (
              <span
                key={id}
                className="shrink-0 inline-flex items-center gap-1 rounded-full bg-card border border-border px-2 py-0.5 text-[11px] font-semibold text-foreground"
              >
                <span aria-hidden>{b.emoji}</span>
                {b.label}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Stat({
  icon, label, value, tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: "orange" | "amber";
}) {
  const pillCls =
    tone === "orange"
      ? "bg-muted text-foreground"
      : "bg-muted text-foreground";
  return (
    <div className="inline-flex items-center gap-1.5">
      {icon}
      <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">
        {label}
      </span>
      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${pillCls}`}>{value}</span>
    </div>
  );
}

function GoalRing({ pct, done, target }: { pct: number; done: number; target: number }) {
  const r = 18;
  const c = 2 * Math.PI * r;
  const offset = c - (c * pct) / 100;
  return (
    <div className="relative h-12 w-12">
      <svg className="h-12 w-12 -rotate-90" viewBox="0 0 48 48">
        <circle cx="24" cy="24" r={r} className="stroke-primary" strokeWidth="4" fill="none" />
        <motion.circle
          cx="24"
          cy="24"
          r={r}
          className="stroke-primary"
          strokeWidth="4"
          strokeLinecap="round"
          fill="none"
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          style={{ strokeDasharray: c }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-[9px] font-bold text-foreground">
        <Target className="h-3 w-3" />
        <span>{done}/{target}</span>
      </div>
    </div>
  );
}

// ─── XP popup ────────────────────────────────────────────────────────────────

export function XpPopup({ amount, trigger }: { amount: number; trigger: number }) {
  // `trigger` is a counter the parent bumps to replay the animation; on
  // first mount with trigger=0 the popup stays hidden.
  return (
    <div className="pointer-events-none absolute inset-x-0 -top-2 flex justify-center">
      <AnimatePresence>
        {trigger > 0 && amount > 0 && (
          <motion.div
            key={trigger}
            initial={{ opacity: 0, y: 0, scale: 0.6 }}
            animate={{ opacity: 1, y: -28, scale: 1 }}
            exit={{ opacity: 0, y: -52 }}
            transition={{ duration: 0.9, ease: "easeOut" }}
            className="px-3 py-1 rounded-full bg-primary text-foreground text-sm font-extrabold shadow-lg shadow"
          >
            +{amount} XP ⭐
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Confetti burst ──────────────────────────────────────────────────────────

const BURST_EMOJIS = ["🎉", "✨", "⭐", "🎊", "💫", "🌟"];

export function ConfettiBurst({ trigger }: { trigger: number }) {
  // Cheap zero-dep "confetti": 18 emojis fly outward then fade.
  const pieces = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => {
        const angle = (i / 18) * Math.PI * 2;
        const dist = 80 + Math.random() * 80;
        return {
          x: Math.cos(angle) * dist,
          y: Math.sin(angle) * dist,
          rot: Math.random() * 360,
          emoji: BURST_EMOJIS[i % BURST_EMOJIS.length],
          delay: Math.random() * 0.1,
        };
      }),
    [],
  );
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-visible">
      <AnimatePresence>
        {trigger > 0 && (
          <div key={trigger} className="relative">
            {pieces.map((p, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, scale: 0.4, x: 0, y: 0, rotate: 0 }}
                animate={{ opacity: [0, 1, 1, 0], scale: 1, x: p.x, y: p.y, rotate: p.rot }}
                transition={{ duration: 1.4, delay: p.delay, ease: "easeOut" }}
                className="absolute text-2xl leading-none"
                style={{ left: 0, top: 0 }}
              >
                {p.emoji}
              </motion.span>
            ))}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export const playFx = {
  correct() {
    playProceduralTone(880, 120, "sine", 0.18);
    setTimeout(() => playProceduralTone(1320, 180, "sine", 0.18), 90);
  },
  wrong() {
    playProceduralTone(220, 180, "sawtooth", 0.12);
  },
  perfect() {
    playProceduralTone(880, 120, "triangle", 0.18);
    setTimeout(() => playProceduralTone(1175, 120, "triangle", 0.18), 110);
    setTimeout(() => playProceduralTone(1568, 220, "triangle", 0.18), 220);
  },
  tap() {
    playProceduralTone(660, 60, "sine", 0.08);
  },
  /** Soft reward chime — learning progress celebrations */
  reward() {
    playProceduralTone(523, 140, "sine", 0.1);
    setTimeout(() => playProceduralTone(784, 200, "sine", 0.08), 120);
  },
  complete() {
    playProceduralTone(440, 100, "triangle", 0.09);
    setTimeout(() => playProceduralTone(659, 160, "triangle", 0.07), 100);
  },
};

// Hook: respects a "muted" flag persisted in localStorage so parents can
// silence the sound effects without tearing them out of the JSX.
const MUTE_KEY = "amynest:study-fx-muted";
export function useStudyFx() {
  const mutedRef = useRef<boolean>(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    mutedRef.current = window.localStorage.getItem(MUTE_KEY) === "1";
  }, []);
  return {
    play(name: keyof typeof playFx) {
      if (mutedRef.current) return;
      try {
        playFx[name]();
      } catch {
        /* AudioContext blocked */
      }
    },
    setMuted(m: boolean) {
      mutedRef.current = m;
      if (typeof window !== "undefined") {
        window.localStorage.setItem(MUTE_KEY, m ? "1" : "0");
      }
    },
    isMuted: () => mutedRef.current,
  };
}
