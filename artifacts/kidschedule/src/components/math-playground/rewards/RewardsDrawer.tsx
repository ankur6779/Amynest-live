import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { BADGE_CATALOG, STICKER_CATALOG, type PlaygroundRewardState } from "@workspace/math-playground";

interface RewardsDrawerProps {
  open: boolean;
  onClose: () => void;
  rewards: PlaygroundRewardState;
}

export function RewardsDrawer({ open, onClose, rewards }: RewardsDrawerProps) {
  const { t } = useTranslation();
  const ownedBadges = new Set(rewards.badges.map((b) => b.id));
  const ownedStickers = new Set(rewards.unlockedStickers);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl px-4 pt-4 pb-8 max-h-[70vh] overflow-y-auto"
            style={{ background: "linear-gradient(180deg, #451a03, #1c0a00)" }}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 340, damping: 32 }}
          >
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-black text-white">
                {t("components.math_playground.rewards_title")}
              </p>
              <button
                type="button"
                onClick={onClose}
                className="text-white/50 text-xs font-bold px-2 py-1"
              >
                ✕
              </button>
            </div>

            <div className="flex gap-4 mb-4 text-center">
              <StatPill emoji="⭐" value={rewards.stars} label={t("components.math_playground.stars")} />
              <StatPill emoji="🔥" value={rewards.streakDays} label={t("components.math_playground.streak")} />
              <StatPill emoji="🏅" value={rewards.badges.length} label={t("components.math_playground.badges")} />
            </div>

            <p className="text-[10px] font-bold text-white/40 uppercase mb-2">
              {t("components.math_playground.badge_gallery")}
            </p>
            <div className="grid grid-cols-4 gap-2 mb-4">
              {BADGE_CATALOG.map((badge) => {
                const unlocked = ownedBadges.has(badge.id);
                return (
                  <div
                    key={badge.id}
                    className="rounded-xl p-2 text-center"
                    style={{
                      background: unlocked ? "rgba(245,158,11,0.2)" : "rgba(255,255,255,0.04)",
                      opacity: unlocked ? 1 : 0.4,
                    }}
                  >
                    <span className="text-2xl">{unlocked ? badge.emoji : "🔒"}</span>
                    <p className="text-[8px] font-bold text-white/70 mt-1 leading-tight">
                      {t(`components.math_playground.${badge.titleKey}`)}
                    </p>
                  </div>
                );
              })}
            </div>

            <p className="text-[10px] font-bold text-white/40 uppercase mb-2">
              {t("components.math_playground.sticker_album")}
            </p>
            <div className="grid grid-cols-4 gap-2">
              {STICKER_CATALOG.map((sticker) => {
                const unlocked = ownedStickers.has(sticker.id);
                return (
                  <div
                    key={sticker.id}
                    className="rounded-xl p-2 text-center"
                    style={{
                      background: unlocked ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.04)",
                      opacity: unlocked ? 1 : 0.35,
                    }}
                  >
                    <span className="text-2xl">{unlocked ? sticker.emoji : "❓"}</span>
                    <p className="text-[8px] font-bold text-white/50 mt-1">
                      {unlocked
                        ? t(`components.math_playground.${sticker.titleKey}`)
                        : `${sticker.starsRequired}⭐`}
                    </p>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function StatPill({ emoji, value, label }: { emoji: string; value: number; label: string }) {
  return (
    <div className="flex-1 rounded-xl py-2" style={{ background: "rgba(255,255,255,0.06)" }}>
      <p className="text-lg">{emoji}</p>
      <p className="text-sm font-black text-amber-300">{value}</p>
      <p className="text-[9px] text-white/40">{label}</p>
    </div>
  );
}
