import { motion } from "framer-motion";
import type { TalkingAmyAchievement } from "@/lib/talking-amy-achievements";
import { livingAchievementEyebrow } from "@/lib/talking-amy/living-room";

export function AchievementUnlockCard({
  achievement,
  show,
  reducedMotion,
  living = false,
}: {
  achievement: TalkingAmyAchievement | null;
  show: boolean;
  reducedMotion: boolean;
  /** Phase 2 living room — soft note, never unlock theatre */
  living?: boolean;
}) {
  if (!show || !achievement) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: reducedMotion ? 0 : 16, scale: reducedMotion ? 1 : 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      className={
        living
          ? "pointer-events-none absolute inset-x-4 top-4 z-20 rounded-2xl border border-[rgba(232,212,184,0.28)] bg-[rgba(8,6,12,0.72)] px-4 py-3 text-center shadow-xl backdrop-blur-md"
          : "pointer-events-none absolute inset-x-4 top-4 z-20 rounded-2xl border border-amber-200/40 bg-gradient-to-br from-amber-400/25 via-orange-500/20 to-fuchsia-500/20 px-4 py-3 text-center shadow-2xl backdrop-blur-md"
      }
      data-testid="talking-amy-achievement-card"
      data-ta-living={living ? "1" : undefined}
    >
      <p
        className={
          living
            ? "text-[10px] font-semibold tracking-[0.12em] text-[rgba(232,212,184,0.82)] uppercase"
            : "text-[10px] font-black uppercase tracking-[0.2em] text-amber-100/90"
        }
      >
        {living ? livingAchievementEyebrow() : "Achievement unlocked!"}
      </p>
      <p
        className={
          living
            ? "mt-1 font-quicksand text-lg font-bold text-[rgba(255,252,248,0.96)]"
            : "mt-1 font-quicksand text-xl font-black"
        }
      >
        {achievement.emoji} {achievement.title}
      </p>
      <p className={living ? "mt-0.5 text-xs text-[rgba(232,212,184,0.78)]" : "mt-0.5 text-xs text-white/75"}>
        {achievement.description}
      </p>
    </motion.div>
  );
}
