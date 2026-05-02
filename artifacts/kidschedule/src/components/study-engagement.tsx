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
    <div className="rounded-2xl border border-indigo-200/60 dark:border-indigo-400/20 bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-indigo-950/40 dark:via-zinc-900 dark:to-purple-950/40 p-4">
      <div className="flex items-center gap-3 flex-wrap">
        <Stat
          icon={<Flame className="h-4 w-4 text-orange-500" />}
          label="Streak"
          value={`${engagement.streak} d`}
          tone="orange"
        />
        <Stat
          icon={<Star className="h-4 w-4 text-amber-500" />}
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
          <Trophy className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
          {recentBadges.map((id) => {
            const b = badgeLabel(id);
            if (!b) return null;
            return (
              <span
                key={id}
                className="shrink-0 inline-flex items-center gap-1 rounded-full bg-white/80 dark:bg-white/10 border border-indigo-200/60 dark:border-indigo-400/20 px-2 py-0.5 text-[11px] font-semibold text-indigo-700 dark:text-indigo-200"
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
      ? "bg-orange-100 text-orange-800 dark:bg-orange-500/15 dark:text-orange-200"
      : "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200";
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
        <circle cx="24" cy="24" r={r} className="stroke-indigo-200 dark:stroke-indigo-500/30" strokeWidth="4" fill="none" />
        <motion.circle
          cx="24"
          cy="24"
          r={r}
          className="stroke-indigo-500 dark:stroke-indigo-300"
          strokeWidth="4"
          strokeLinecap="round"
          fill="none"
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          style={{ strokeDasharray: c }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-[9px] font-bold text-indigo-700 dark:text-indigo-200">
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
            className="px-3 py-1 rounded-full bg-amber-400 text-amber-950 text-sm font-extrabold shadow-lg shadow-amber-500/30"
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

// ─── Tiny Web Audio sound effects (no assets) ────────────────────────────────

let _ctx: AudioContext | null = null;
function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (_ctx) return _ctx;
  const Ctor =
    (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext })
      .AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  _ctx = new Ctor();
  return _ctx;
}

function tone(freq: number, dur: number, type: OscillatorType = "sine", startGain = 0.18) {
  const ctx = getCtx();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(startGain, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + dur);
}

export const playFx = {
  correct() {
    tone(880, 0.12, "sine");
    setTimeout(() => tone(1320, 0.18, "sine"), 90);
  },
  wrong() {
    tone(220, 0.18, "sawtooth", 0.12);
  },
  perfect() {
    tone(880, 0.12, "triangle");
    setTimeout(() => tone(1175, 0.12, "triangle"), 110);
    setTimeout(() => tone(1568, 0.22, "triangle"), 220);
  },
  tap() {
    tone(660, 0.06, "sine", 0.08);
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
      try { playFx[name](); } catch { /* AudioContext blocked */ }
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
