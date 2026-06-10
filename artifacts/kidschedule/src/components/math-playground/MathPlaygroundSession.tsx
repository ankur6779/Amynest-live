import { useCallback, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
  ACTIVITY_CARDS,
  applyActivityComplete,
  applyDailyComplete,
  deriveAdaptivityTier,
  generateActivity,
  starsForCompletion,
  type PlaygroundActivityId,
} from "@workspace/math-playground";
import { usePlaygroundAmy } from "./hooks/usePlaygroundAmy";
import { ActivityTaskRenderer } from "./activities/ActivityTaskRenderer";
import { DailyChallenge } from "./activities/DailyChallenge";
import { AdaptivePaceBadge } from "./shell/AdaptivePaceBadge";
import type { PlaygroundStateApi } from "./hooks/usePlaygroundState";
import type { DailyPayload } from "@workspace/math-playground";

interface MathPlaygroundSessionProps {
  activityId: PlaygroundActivityId;
  ageYears: number;
  childId: number;
  playground: PlaygroundStateApi;
  onExit: () => void;
}

export function MathPlaygroundSession({
  activityId,
  ageYears,
  childId,
  playground,
  onExit,
}: MathPlaygroundSessionProps) {
  const { t } = useTranslation();
  const amy = usePlaygroundAmy();
  const [starsEarned, setStarsEarned] = useState<number | null>(null);
  const [newBadges, setNewBadges] = useState<string[]>([]);
  const startedAtRef = useRef(Date.now());

  const adaptivityTier = useMemo(
    () =>
      activityId === "daily_challenge"
        ? ("standard" as const)
        : deriveAdaptivityTier(activityId, playground.learning),
    [activityId, playground.learning],
  );

  const activity = useMemo(
    () =>
      generateActivity({
        activityId,
        ageYears,
        childId,
        learning: playground.learning,
        adaptivityTier,
      }),
    [activityId, ageYears, childId, playground.learning, adaptivityTier],
  );

  const card = ACTIVITY_CARDS.find((c) => c.id === activityId);
  const accentColor = card?.color ?? "hsl(var(--brand-amber-300))";

  const handleComplete = useCallback(
    (hintsUsed: number) => {
      const stars =
        activityId === "daily_challenge" ? 5 : starsForCompletion(hintsUsed);
      setStarsEarned(stars);

      playground.recordSession({
        activityId,
        completedAt: Date.now(),
        hintsUsed,
        durationMs: Date.now() - startedAtRef.current,
        success: true,
        tierUsed: adaptivityTier,
      });

      playground.persistRewards((prev) => {
        const before = prev.badges.length;
        const next =
          activityId === "daily_challenge"
            ? applyDailyComplete(prev, stars)
            : applyActivityComplete(prev, activityId, stars);
        const unlocked = next.badges.slice(before).map((b) => b.titleKey);
        if (unlocked.length > 0) setNewBadges(unlocked);
        return next;
      });
    },
    [activityId, playground, adaptivityTier],
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-3 gap-2">
        <button
          type="button"
          onClick={onExit}
          className="text-xs font-bold text-white/50 hover:text-white/80 transition-colors shrink-0"
        >
          ← {t("components.math_playground.back_to_hub")}
        </button>
        <div className="flex items-center gap-2 min-w-0">
          {activityId !== "daily_challenge" && <AdaptivePaceBadge tier={adaptivityTier} />}
          {card && (
            <span className="text-xs font-black truncate" style={{ color: accentColor }}>
              {card.emoji} {t(`components.math_playground.${card.titleKey}`)}
            </span>
          )}
        </div>
      </div>

      {starsEarned !== null ? (
        <SessionComplete
          stars={starsEarned}
          accentColor={accentColor}
          newBadges={newBadges}
          onHome={onExit}
        />
      ) : activityId === "daily_challenge" ? (
        <DailyChallenge
          payload={activity.payload as DailyPayload}
          amy={amy}
          accentColor={accentColor}
          onComplete={handleComplete}
        />
      ) : (
        <ActivityTaskRenderer
          activity={activity}
          amy={amy}
          accentColor={accentColor}
          onComplete={handleComplete}
        />
      )}
    </div>
  );
}

function SessionComplete({
  stars,
  accentColor,
  newBadges,
  onHome,
}: {
  stars: number;
  accentColor: string;
  newBadges: string[];
  onHome: () => void;
}) {
  const { t } = useTranslation();
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center py-8 rounded-2xl"
      style={{ background: "rgba(255,255,255,0.06)" }}
    >
      <p className="text-4xl mb-2">⭐</p>
      <p className="text-lg font-black text-white">
        +{stars} {t("components.math_playground.stars")}
      </p>
      {newBadges.length > 0 && (
        <p className="text-xs font-bold mt-2" style={{ color: accentColor }}>
          🏅 {t("components.math_playground.new_badge")}:{" "}
          {newBadges.map((k) => t(`components.math_playground.${k}`)).join(", ")}
        </p>
      )}
      <button
        type="button"
        onClick={onHome}
        className="mt-4 px-6 py-3 rounded-2xl font-black text-sm text-white active:scale-95"
        style={{ background: `linear-gradient(135deg, ${accentColor}, hsl(var(--brand-amber-500)))` }}
      >
        {t("components.math_playground.back_to_hub")}
      </button>
    </motion.div>
  );
}
