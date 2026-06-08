import { motion } from "framer-motion";
import type { TalkingAmyAchievement } from "@/lib/talking-amy-achievements";

export function AchievementUnlockCard({
  achievement,
  show,
  reducedMotion,
}: {
  achievement: TalkingAmyAchievement | null;
  show: boolean;
  reducedMotion: boolean;
}) {
  if (!show || !achievement) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: reducedMotion ? 0 : 16, scale: reducedMotion ? 1 : 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      className="pointer-events-none absolute inset-x-4 top-4 z-20 rounded-2xl border border-amber-200/40 bg-gradient-to-br from-amber-400/25 via-orange-500/20 to-fuchsia-500/20 px-4 py-3 text-center shadow-2xl backdrop-blur-md"
      data-testid="talking-amy-achievement-card"
    >
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-100/90">
        Achievement unlocked!
      </p>
      <p className="mt-1 font-quicksand text-xl font-black">
        {achievement.emoji} {achievement.title}
      </p>
      <p className="mt-0.5 text-xs text-white/75">{achievement.description}</p>
    </motion.div>
  );
}
