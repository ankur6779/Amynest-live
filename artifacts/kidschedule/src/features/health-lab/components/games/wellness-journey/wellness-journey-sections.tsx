import { memo } from "react";
import { motion } from "framer-motion";
import { BADGES } from "../../../constants";
import type { BadgeId, BadgeRecord } from "../../../types";
import { getStreakTier } from "./wellness-journey-constants";
import type { HallOfFameEntry, WeeklyHighlight } from "./wellness-journey-utils";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/lib/reduced-motion";
import { HealthLabAvatar } from "../../health-lab-avatar";
import type { HealthLevelId } from "../../../types";

export const WellnessStreakCard = memo(function WellnessStreakCard({ days }: { days: number }) {
  const reduced = useReducedMotion();
  const tier = getStreakTier(days);

  return (
    <div className="health-lab-timer-glass rounded-2xl border border-white/10 p-4 text-center">
      <motion.span
        className="inline-block text-4xl"
        animate={reduced ? {} : { scale: [tier.scale, tier.scale * 1.1, tier.scale] }}
        transition={{ duration: 1.2, repeat: Infinity }}
        aria-hidden
      >
        {tier.emoji}
      </motion.span>
      <p className="mt-2 font-mono text-2xl font-bold text-orange-300">{days}</p>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-white/45">Day Streak</p>
      <p className="mt-1 text-xs font-medium text-amber-200/80">{tier.label}</p>
    </div>
  );
});

export const WellnessAvatarCard = memo(function WellnessAvatarCard({
  avatarId,
  level,
  tierLabel,
  tierEmoji,
  levelPct,
}: {
  avatarId: string;
  level: HealthLevelId;
  tierLabel: string;
  tierEmoji: string;
  levelPct: number;
}) {
  return (
    <div className="health-lab-timer-glass flex flex-col items-center rounded-2xl border border-white/10 p-4">
      <HealthLabAvatar avatarId={avatarId} level={level} size="lg" glowing />
      <p className="mt-3 text-sm font-bold text-white">
        {tierEmoji} {tierLabel}
      </p>
      <p className="text-[10px] text-white/45">Level {level}</p>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400"
          animate={{ width: `${levelPct}%` }}
          transition={{ duration: 0.6 }}
        />
      </div>
      <p className="mt-1 text-[9px] text-white/40">{levelPct}% to next level</p>
    </div>
  );
});

export const WellnessBadgeGallery = memo(function WellnessBadgeGallery({
  earned,
  delay = 0,
}: {
  earned: BadgeRecord[];
  delay?: number;
}) {
  const reduced = useReducedMotion();
  const earnedIds = new Set(earned.map((b) => b.id));

  const visible = BADGES.filter((b) => !b.secret || earnedIds.has(b.id));

  return (
    <motion.div
      className="health-lab-timer-glass rounded-2xl border border-white/10 p-4"
      initial={reduced ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
    >
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-violet-300/70">Badge Gallery</p>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
        {visible.map((badge) => {
          const unlocked = earnedIds.has(badge.id);
          return (
            <div
              key={badge.id}
              className={cn(
                "flex flex-col items-center rounded-xl border p-2 text-center",
                unlocked ? "border-amber-300/30 bg-amber-500/10" : "border-white/8 bg-white/[0.03] opacity-50",
              )}
              title={unlocked ? badge.description : "Locked"}
            >
              <span className={cn("text-xl", !unlocked && "grayscale")} aria-hidden>
                {unlocked ? badge.emoji : "🔒"}
              </span>
              <span className="mt-1 line-clamp-2 text-[8px] font-medium leading-tight text-white/70">
                {unlocked ? badge.name : badge.name.split(" ")[0]}
              </span>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
});

export const WellnessHighlights = memo(function WellnessHighlights({
  highlights,
  delay = 0,
}: {
  highlights: WeeklyHighlight[];
  delay?: number;
}) {
  const reduced = useReducedMotion();
  if (highlights.length === 0) return null;

  return (
    <motion.div
      className="health-lab-timer-glass rounded-2xl border border-white/10 p-4"
      initial={reduced ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
    >
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-cyan-300/70">
        This Week&apos;s Best Moments
      </p>
      <div className="space-y-2">
        {highlights.map((h) => (
          <div key={h.label} className="flex items-center justify-between gap-2 rounded-xl bg-white/[0.04] px-3 py-2">
            <span className="text-sm text-white/90">
              {h.emoji} {h.label}
            </span>
            <span className="font-mono text-sm font-bold tabular-nums text-amber-200">{h.value}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
});

export const WellnessHallOfFame = memo(function WellnessHallOfFame({
  entries,
  delay = 0,
}: {
  entries: HallOfFameEntry[];
  delay?: number;
}) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      className="health-lab-timer-glass rounded-2xl border border-white/10 p-4"
      initial={reduced ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
    >
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-amber-300/70">Hall of Fame</p>
      <div className="grid grid-cols-2 gap-2">
        {entries.map((e) => (
          <div key={e.label} className="rounded-xl border border-white/8 bg-white/[0.04] p-3 text-center">
            <span className="text-xl" aria-hidden>
              {e.emoji}
            </span>
            <p className="mt-1 text-[10px] text-white/55">{e.label}</p>
            <p className="font-mono text-lg font-bold text-white">{e.value}</p>
          </div>
        ))}
      </div>
    </motion.div>
  );
});

export const WellnessAmyInsights = memo(function WellnessAmyInsights({
  insights,
  delay = 0,
}: {
  insights: string[];
  delay?: number;
}) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      className="rounded-2xl border border-violet-300/20 bg-gradient-to-br from-violet-500/15 to-cyan-500/10 p-4"
      initial={reduced ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
    >
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-violet-200/70">Amy Coach</p>
      <ul className="space-y-2">
        {insights.map((line) => (
          <li key={line} className="text-sm leading-relaxed text-white/85">
            💬 {line}
          </li>
        ))}
      </ul>
    </motion.div>
  );
});

export const WellnessAchievementShowcase = memo(function WellnessAchievementShowcase({
  earnedBadgeIds,
  totalSessions,
  delay = 0,
}: {
  earnedBadgeIds: Set<BadgeId>;
  totalSessions: number;
  delay?: number;
}) {
  const reduced = useReducedMotion();
  const items = [
    { emoji: "🏆", label: "First Adventure", unlocked: totalSessions >= 1 },
    { emoji: "🌸", label: "Crystal Garden Hero", unlocked: earnedBadgeIds.has("statue-master") },
    { emoji: "🚀", label: "Rocket Commander", unlocked: earnedBadgeIds.has("reaction-ninja") },
    { emoji: "⚡", label: "Lightning Reflex", unlocked: earnedBadgeIds.has("reaction-ninja") },
    { emoji: "🌈", label: "Balance Champion", unlocked: earnedBadgeIds.has("balance-master") },
    { emoji: "⭐", label: "Wellness Explorer", unlocked: totalSessions >= 5 },
  ];

  return (
    <motion.div
      className="health-lab-timer-glass rounded-2xl border border-white/10 p-4"
      initial={reduced ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
    >
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-emerald-300/70">Achievements</p>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <span
            key={item.label}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-semibold",
              item.unlocked
                ? "border-emerald-300/35 bg-emerald-500/15 text-emerald-100"
                : "border-white/10 bg-white/[0.04] text-white/35",
            )}
          >
            {item.unlocked ? item.emoji : "🔒"} {item.label}
          </span>
        ))}
      </div>
    </motion.div>
  );
});
