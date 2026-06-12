import { motion, AnimatePresence } from "framer-motion";
import { useReducedMotion } from "@/lib/reduced-motion";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { BADGES, HEALTH_LEVELS } from "../constants";
import { useHealthLabI18n } from "../hooks/use-health-lab-i18n";
import { HealthLabAvatar } from "./health-lab-avatar";
import type { EquipmentSlot, HealthLevelId } from "../types";

type CelebrationProps = {
  type: "level-up" | "streak" | "badge" | "quest" | "treasure" | "surprise";
  payload: unknown;
  onDismiss: () => void;
  avatarId: string;
  level: HealthLevelId;
  equippedItems?: Partial<Record<EquipmentSlot, string>>;
};

function payloadId(payload: unknown): string | null {
  if (payload && typeof payload === "object" && "id" in payload) {
    return String((payload as { id: string }).id);
  }
  return null;
}

export function HealthLabCelebration({
  type,
  payload,
  onDismiss,
  avatarId,
  level,
  equippedItems = {},
}: CelebrationProps) {
  const reduced = useReducedMotion();
  const { t } = useHealthLabI18n();

  let title = t("celebration_amazing", "Amazing!");
  let subtitle = t("celebration_keep_going", "Keep exploring your superpowers");
  let emoji = "🎉";

  if (type === "level-up" && payload && typeof payload === "object" && "level" in payload) {
    const lvl = HEALTH_LEVELS.find((l) => l.id === (payload as { level: number }).level);
    title = t("level_up");
    subtitle = lvl ? t("celebration_level_sub", `You are now a ${lvl.name}`) : t("celebration_new_level", "New level unlocked");
    emoji = "⭐";
  } else if (type === "streak" && payload && typeof payload === "object" && "days" in payload) {
    title = `${(payload as { days: number }).days}-${t("day_streak", "Day Streak!")}`;
    subtitle = t("celebration_streak_sub", "Your dedication is inspiring");
    emoji = "🔥";
  } else if (type === "badge") {
    const id = payloadId(payload);
    const badge = BADGES.find((b) => b.id === id);
    title = badge ? badge.name : t("celebration_new_badge", "New Badge!");
    subtitle = badge?.description ?? t("celebration_achievement", "Achievement unlocked");
    emoji = badge?.emoji ?? "🏅";
  } else if (type === "quest") {
    const qid = payloadId(payload);
    title = t("quest_complete");
    subtitle = qid === "monthly-mega-quest"
      ? t("monthly_mega_complete", "Monthly Mega Quest complete — bonus rewards earned!")
      : qid
        ? `${qid.replace(/-/g, " ")} ${t("reward_earned", "reward earned")}`
        : t("daily_quest_reward", "Daily quest reward earned");
    emoji = qid === "monthly-mega-quest" ? "🌟" : "✅";
  } else if (type === "treasure") {
    title = t("celebration_treasure", "Treasure Chest!");
    subtitle = t("celebration_treasure_sub", "Amazing loot from your streak");
    emoji = "🎁";
  } else if (type === "surprise") {
    title = t("daily_surprise");
    subtitle = t("celebration_surprise_sub", "A special gift just for you");
    emoji = "🎊";
  }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        role="dialog"
        aria-modal
        aria-labelledby="health-lab-celebration-title"
      >
        <motion.div
          className={cn(
            "relative w-full max-w-sm rounded-3xl border border-violet-400/40 p-8 text-center",
            "bg-gradient-to-b from-violet-900/95 to-indigo-950/95",
            "shadow-[0_0_60px_-10px_rgba(139,92,246,0.7)]",
          )}
          initial={reduced ? {} : { scale: 0.8, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          transition={{ type: "spring", damping: 18, stiffness: 260 }}
        >
          <button
            type="button"
            onClick={onDismiss}
            className="absolute right-3 top-3 rounded-full p-2 text-violet-300 hover:bg-white/10"
            aria-label={t("close", "Close celebration")}
          >
            <X className="h-5 w-5" />
          </button>

          <div className="mx-auto mb-4 flex justify-center">
            <HealthLabAvatar avatarId={avatarId} level={level} size="lg" glowing equippedItems={equippedItems} />
          </div>

          <motion.div
            className="mb-2 text-4xl"
            animate={reduced ? {} : { scale: [1, 1.15, 1], rotate: [0, 5, -5, 0] }}
            transition={{ duration: 0.6 }}
            aria-hidden
          >
            {emoji}
          </motion.div>
          <h2 id="health-lab-celebration-title" className="text-2xl font-bold text-white">
            {title}
          </h2>
          <p className="mt-2 text-violet-200/80">{subtitle}</p>
          <button
            type="button"
            onClick={onDismiss}
            className="mt-6 w-full rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 py-3.5 font-bold text-white active:scale-[0.98]"
          >
            {t("celebration_continue")}
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
