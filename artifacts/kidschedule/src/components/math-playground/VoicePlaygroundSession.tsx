import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ACTIVITY_CARDS,
  applyActivityComplete,
  deriveAdaptivityTierV4,
  generateActivity,
  starsForCompletion,
  type CountingPayload,
  type PlaygroundActivityId,
} from "@workspace/math-playground";
import {
  isVoiceSupportedActivity,
  voiceScenarioFromActivity,
  type VoiceRoundSummary,
} from "@workspace/math-playground-voice";
import { usePlaygroundAmy } from "./hooks/usePlaygroundAmy";
import { usePlaygroundEngagement } from "./hooks/usePlaygroundEngagement";
import { AdaptivePaceBadge } from "./shell/AdaptivePaceBadge";
import { SessionComplete } from "./shell/SessionComplete";
import { MathPlaygroundSession } from "./MathPlaygroundSession";
import type { PlaygroundStateApi } from "./hooks/usePlaygroundState";
import { trackPlaygroundSessionStart, trackPlaygroundSessionComplete } from "./lib/playground-analytics";
import { useVoiceMathSession } from "./voice/useVoiceMathSession";
import { VoiceMathRound } from "./voice/VoiceMathRound";

interface VoicePlaygroundSessionProps {
  activityId: PlaygroundActivityId;
  ageYears: number;
  childId: number;
  playground: PlaygroundStateApi;
  onExit: () => void;
}

export function VoicePlaygroundSession({
  activityId,
  ageYears,
  childId,
  playground,
  onExit,
}: VoicePlaygroundSessionProps) {
  const { t } = useTranslation();
  const amy = usePlaygroundAmy();
  const engagement = usePlaygroundEngagement(childId, playground, amy);
  const [starsEarned, setStarsEarned] = useState<number | null>(null);
  const [newBadges, setNewBadges] = useState<string[]>([]);
  const startedAtRef = useRef(Date.now());
  const voiceSupported = isVoiceSupportedActivity(activityId);

  useEffect(() => {
    trackPlaygroundSessionStart(childId, activityId, "voice");
  }, [childId, activityId]);

  const adaptivityTier = useMemo(
    () => deriveAdaptivityTierV4(activityId, playground.learning),
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
        enableMiniGames: false,
      }),
    [activityId, ageYears, childId, playground.learning, adaptivityTier],
  );

  const scenario = useMemo(
    () => voiceScenarioFromActivity(activityId, activity.payload),
    [activityId, activity.payload],
  );

  const card = ACTIVITY_CARDS.find((c) => c.id === activityId);
  const accentColor = card?.color ?? "hsl(var(--brand-amber-300))";

  const handleVoiceComplete = useCallback(
    (summary: VoiceRoundSummary) => {
      const hintsUsed = summary.hintsUsed;
      const stars = starsForCompletion(hintsUsed);
      setStarsEarned(stars);

      if (summary.success) engagement.recordSuccess();
      else engagement.recordFailure();

      playground.recordSessionV4({
        activityId,
        completedAt: Date.now(),
        hintsUsed,
        durationMs: Date.now() - startedAtRef.current,
        success: summary.success,
        tierUsed: adaptivityTier,
        playMode: "voice",
        responseTimeMs: summary.responseTimeMs,
        voiceConfidence: summary.voiceConfidence,
        retryCount: summary.attempts,
      });

      playground.persistRewards((prev) => {
        const before = prev.badges.length;
        const next = applyActivityComplete(prev, activityId, stars);
        const unlocked = next.badges.slice(before).map((b) => b.titleKey);
        if (unlocked.length > 0) setNewBadges(unlocked);
        return next;
      });

      trackPlaygroundSessionComplete(childId, {
        activityId,
        playMode: "voice",
        tierUsed: adaptivityTier,
        hintsUsed,
        durationMs: Date.now() - startedAtRef.current,
        starsEarned: stars,
      });

      playground.generateParentSnapshot(ageYears);
    },
    [activityId, playground, adaptivityTier, engagement, childId, ageYears],
  );

  if (!voiceSupported || !scenario) {
    return (
      <MathPlaygroundSession
        activityId={activityId}
        ageYears={ageYears}
        childId={childId}
        playground={playground}
        onExit={onExit}
      />
    );
  }

  return (
    <VoiceSessionBody
      accentColor={accentColor}
      cardEmoji={card?.emoji}
      cardTitleKey={card?.titleKey}
      adaptivityTier={adaptivityTier}
      starsEarned={starsEarned}
      newBadges={newBadges}
      onExit={onExit}
      scenario={scenario}
      amy={amy}
      engagement={engagement}
      childId={childId}
      countingPayload={
        activityId === "counting_adventure" ? (activity.payload as CountingPayload) : undefined
      }
      objectKind={scenario.objectKind}
      ageYears={ageYears}
      onVoiceComplete={handleVoiceComplete}
      t={t}
    />
  );
}

function VoiceSessionBody({
  ageYears,
  accentColor,
  cardEmoji,
  cardTitleKey,
  adaptivityTier,
  starsEarned,
  newBadges,
  onExit,
  scenario,
  amy,
  engagement,
  childId,
  countingPayload,
  objectKind,
  onVoiceComplete,
  t,
}: {
  ageYears: number;
  accentColor: string;
  cardEmoji?: string;
  cardTitleKey?: string;
  adaptivityTier: ReturnType<typeof deriveAdaptivityTierV4>;
  starsEarned: number | null;
  newBadges: string[];
  onExit: () => void;
  scenario: NonNullable<ReturnType<typeof voiceScenarioFromActivity>>;
  amy: ReturnType<typeof usePlaygroundAmy>;
  engagement: ReturnType<typeof usePlaygroundEngagement>;
  childId: number;
  countingPayload?: CountingPayload;
  objectKind: CountingPayload["objectKind"];
  onVoiceComplete: (summary: VoiceRoundSummary) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
  const voiceSession = useVoiceMathSession({
    scenario,
    amy,
    ageYears,
    childId,
    onRoundComplete: onVoiceComplete,
  });

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
          <AdaptivePaceBadge tier={adaptivityTier} />
          {cardTitleKey && (
            <span className="text-xs font-black truncate" style={{ color: accentColor }}>
              {cardEmoji} {t(`components.math_playground.${cardTitleKey}`)} 🎤
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
      ) : (
        <VoiceMathRound
          scenario={scenario}
          amy={amy}
          engagement={engagement}
          accentColor={accentColor}
          childId={childId}
          voiceSession={voiceSession}
          countingObjects={countingPayload?.objects}
          objectKind={objectKind}
        />
      )}
    </div>
  );
}
