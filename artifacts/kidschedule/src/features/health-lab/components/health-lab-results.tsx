import { XP_BY_TIER } from "../constants";
import { HEALTH_LAB_THEME } from "../theme";
import { useHealthLabI18n } from "../hooks/use-health-lab-i18n";
import type { GameSessionResult } from "../types";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useReducedMotion } from "@/lib/reduced-motion";
import { Star, Zap } from "lucide-react";

export function HealthLabResults({
  result,
  onPlayAgain,
  onHome,
}: {
  result: GameSessionResult;
  onPlayAgain: () => void;
  onHome: () => void;
}) {
  const reduced = useReducedMotion();
  const { t } = useHealthLabI18n();
  const tierLabel = result.xpTier.charAt(0).toUpperCase() + result.xpTier.slice(1);

  return (
    <div className="flex min-h-[70dvh] flex-col items-center justify-center px-4 py-8">
      <motion.div
        className={cn(HEALTH_LAB_THEME.cardGlass, "w-full max-w-sm p-6 text-center")}
        initial={reduced ? {} : { scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", damping: 20 }}
      >
        <motion.div
          className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-amber-400/30 to-violet-500/30"
          animate={reduced ? {} : { rotate: [0, 5, -5, 0] }}
          transition={{ duration: 0.5 }}
        >
          <Star className="h-10 w-10 text-amber-300" />
        </motion.div>

        <h2 className="text-2xl font-bold text-white">{t("challenge_complete")}</h2>
        <p className="mt-1 text-violet-200/80">{t("great_job")}</p>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <ScoreBox label={t("score")} value={String(result.score)} />
          <ScoreBox label={t("stat_xp", "XP")} value={`+${result.xpEarned}`} highlight />
        </div>

        <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-violet-500/20 px-4 py-2 text-sm text-violet-200">
          <Zap className="h-4 w-4 text-amber-300" />
          {tierLabel} tier · {XP_BY_TIER[result.xpTier]} XP max
        </div>

        {result.personalBest && (
          <p className="mt-3 text-sm font-semibold text-emerald-400">🎉 {t("new_personal_best")}</p>
        )}

        {result.achievementUnlocked && (
          <p className="mt-2 text-sm text-amber-300">Achievement: {result.achievementUnlocked}</p>
        )}

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onPlayAgain}
            className={cn("flex-1 rounded-2xl py-3 text-sm", HEALTH_LAB_THEME.ctaPrimary)}
          >
            {t("play_again")}
          </button>
          <button
            type="button"
            onClick={onHome}
            className={cn("flex-1 rounded-2xl py-3 text-sm", HEALTH_LAB_THEME.ctaSecondary)}
          >
            {t("home")}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function ScoreBox({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-xl bg-white/[0.06] p-3">
      <p className="text-[10px] uppercase text-violet-300/60">{label}</p>
      <p className={cn("text-2xl font-bold", highlight ? "text-amber-300" : "text-white")}>
        {value}
      </p>
    </div>
  );
}
