import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { usePlaygroundEngagement } from "./hooks/usePlaygroundEngagement";
import { ActivityTaskRenderer } from "./activities/ActivityTaskRenderer";
import { DailyChallenge } from "./activities/DailyChallenge";
import { AdaptivePaceBadge } from "./shell/AdaptivePaceBadge";
import { SessionComplete } from "./shell/SessionComplete";
import type { PlaygroundStateApi } from "./hooks/usePlaygroundState";
import type { DailyPayload } from "@workspace/math-playground";
import { trackPlaygroundSessionStart } from "./lib/playground-analytics";
import { isMpMiniGamesEnabled, isMpPhase6Enabled } from "./lib/feature-flags";

interface MathPlaygroundSessionProps {
  activityId: PlaygroundActivityId;
  ageYears: number;
  childId: number;
  childName: string;
  playground: PlaygroundStateApi;
  onExit: () => void;
}

export function MathPlaygroundSession({
  activityId,
  ageYears,
  childId,
  childName,
  playground,
  onExit,
}: MathPlaygroundSessionProps) {
  const { t } = useTranslation();
  const amy = usePlaygroundAmy(ageYears);
  const engagement = usePlaygroundEngagement(childId, playground, amy);
  const [starsEarned, setStarsEarned] = useState<number | null>(null);
  const [newBadges, setNewBadges] = useState<string[]>([]);
  const startedAtRef = useRef(Date.now());
  const completedRef = useRef(false);

  useEffect(() => {
    trackPlaygroundSessionStart(childId, activityId, "touch");
  }, [childId, activityId]);

  useEffect(() => {
    return () => {
      amy.pause();
    };
  }, [amy.pause]);

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
        enableMiniGames: isMpMiniGamesEnabled(),
      }),
    [activityId, ageYears, childId, playground.learning, adaptivityTier],
  );

  const card = ACTIVITY_CARDS.find((c) => c.id === activityId);
  const accentColor = card?.color ?? "hsl(var(--brand-amber-300))";

  const handleComplete = useCallback(
    (hintsUsed: number) => {
      if (completedRef.current) return;
      completedRef.current = true;

      const stars =
        activityId === "daily_challenge" ? 5 : starsForCompletion(hintsUsed);
      setStarsEarned(stars);
      engagement.recordSuccess();

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

      playground.generateParentSnapshot(ageYears);
      if (isMpPhase6Enabled()) {
        playground.refreshIntelligence(ageYears, childName, true);
      }
    },
    [activityId, playground, adaptivityTier, engagement, ageYears, childName],
  );

  return (
    <div data-testid="mp-session">
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
          engagement={engagement}
          childId={childId}
          onComplete={handleComplete}
        />
      ) : (
        <ActivityTaskRenderer
          activity={activity}
          amy={amy}
          accentColor={accentColor}
          engagement={engagement}
          childId={childId}
          onComplete={handleComplete}
        />
      )}
    </div>
  );
}
