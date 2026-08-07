import { Shield } from "lucide-react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";

type Props = {
  streak: number;
  onUseShield: () => void;
  onStartFresh: () => void;
  isLoading?: boolean;
};

export function StreakShieldDialog({
  streak,
  onUseShield,
  onStartFresh,
  isLoading,
}: Props) {
  const { t } = useTranslation();

  return (
    <motion.div
      className="fixed inset-0 z-[210] flex items-center justify-center bg-black/55 backdrop-blur-sm px-5"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      role="dialog"
      aria-labelledby="streak-shield-title"
      aria-modal="true"
    >
      <div className="w-full max-w-sm rounded-3xl border border-violet-400/30 bg-gradient-to-br from-[#1a1040] to-[#0f0a24] p-6 shadow-2xl">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/20 border border-violet-400/30">
          <Shield className="h-7 w-7 text-violet-200" aria-hidden />
        </div>
        <h2 id="streak-shield-title" className="text-xl font-black text-white text-center font-quicksand">
          {t("retention.shield_title", "Want to carry your {{n}}-day rhythm into today?", { n: streak })}
        </h2>
        <p className="mt-2 text-sm text-white/65 text-center leading-relaxed">
          {t(
            "retention.shield_body",
            "Yesterday was quiet — that’s okay. Hold the rhythm gently, or begin again without pressure.",
          )}
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            disabled={isLoading}
            onClick={onUseShield}
            className="w-full rounded-xl bg-gradient-to-r from-violet-500 to-indigo-500 py-3 text-sm font-bold text-white disabled:opacity-60"
            data-testid="streak-shield-use"
          >
            {t("retention.shield_use", "Hold today’s rhythm")}
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={onStartFresh}
            className="w-full rounded-xl border border-white/15 py-3 text-sm font-semibold text-white/75 hover:bg-white/5 disabled:opacity-60"
            data-testid="streak-shield-fresh"
          >
            {t("retention.shield_fresh", "Begin gently today")}
          </button>
        </div>
        <p className="mt-3 text-[10px] text-center text-white/40">
          {t("retention.shield_monthly", "One gentle hold available each month")}
        </p>
      </div>
    </motion.div>
  );
}
