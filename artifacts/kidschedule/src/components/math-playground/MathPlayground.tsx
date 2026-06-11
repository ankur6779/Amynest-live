import { useCallback, useEffect, useState } from "react";
import type { PlaygroundActivityId } from "@workspace/math-playground";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { scheduleLearningZoneAudioPrewarm } from "@/lib/learning-zone-audio-prewarm";
import { buildMathPlaygroundPrewarmContext } from "./lib/playground-audio";
import { ageYearsToBand } from "@workspace/math-playground";
import { useTranslation } from "react-i18next";
import { usePlaygroundState } from "./hooks/usePlaygroundState";
import { usePlaygroundIntelligence } from "./hooks/usePlaygroundIntelligence";
import { usePlayMode } from "./mode/usePlayMode";
import { MathPlaygroundHub } from "./MathPlaygroundHub";
import { MathPlaygroundSession } from "./MathPlaygroundSession";
import { VoicePlaygroundSession } from "./VoicePlaygroundSession";
import { isMpPhase6Enabled } from "./lib/feature-flags";
import { isVoiceSupportedActivity } from "@workspace/math-playground-voice";

const STATIC_PHRASE_KEYS = [
  "amy_count_prompt",
  "amy_great_job",
  "amy_try_together",
  "amy_getting_better",
  "amy_count_together",
  "amy_addition_intro",
  "amy_tap_to_basket",
  "amy_subtraction_intro",
  "amy_daily_intro",
  "amy_daily_done",
  "amy_keep_going",
  "amy_multiply_intro",
  "amy_groups_of",
  "amy_division_intro",
  "amy_fair_share",
  "amy_pattern_intro",
  "amy_puzzle_bigger",
  "amy_puzzle_match",
  "amy_puzzle_sort",
  "amy_mini_pop",
  "amy_mini_rocket",
  "amy_mini_balloon",
  "amy_mini_monkey",
  "amy_mini_train",
  "amy_mini_castle",
  "amy_voice_count",
  "amy_voice_how_many",
  "amy_voice_add",
  "amy_voice_sub",
  "amy_voice_multiply",
  "amy_voice_divide",
] as const;

interface MathPlaygroundProps {
  childName: string;
  ageYears: number;
  childId?: number;
}

export function MathPlayground({ childName, ageYears, childId = 0 }: MathPlaygroundProps) {
  const { t } = useTranslation();
  const authFetch = useAuthFetch();
  const playground = usePlaygroundState(childId);
  const playMode = usePlayMode(playground);
  const intelligenceApi = usePlaygroundIntelligence(childId, ageYears, childName, playground);
  const [activeActivity, setActiveActivity] = useState<PlaygroundActivityId | null>(null);
  const ageBand = ageYearsToBand(ageYears);
  const useVoiceSession =
    playMode.isVoiceModeActive &&
    activeActivity !== null &&
    isVoiceSupportedActivity(activeActivity);

  useEffect(() => {
    const texts = STATIC_PHRASE_KEYS.map((key) =>
      t(`components.math_playground.${key}`, {
        count: 5,
        objects: "apples",
        a: 3,
        b: 2,
        pick: 3,
        total: 12,
        groups: 3,
        each: 4,
        children: 3,
      }),
    );
    const prewarmCtx = buildMathPlaygroundPrewarmContext(ageBand);
    scheduleLearningZoneAudioPrewarm(authFetch, {
      ...prewarmCtx,
      texts,
    });
  }, [authFetch, ageBand, t]);

  const handleSelect = useCallback((id: PlaygroundActivityId) => {
    setActiveActivity(id);
  }, []);

  const handleExit = useCallback(() => {
    setActiveActivity(null);
  }, []);

  return (
    <div
      data-testid="math-playground"
      className="rounded-2xl overflow-hidden"
      style={{
        background: "linear-gradient(160deg, rgba(69,26,3,0.6) 0%, rgba(28,10,0,0.8) 100%)",
        border: "1px solid rgba(245,158,11,0.15)",
      }}
    >
      <div className="px-3 py-3">
        {activeActivity ? (
          useVoiceSession ? (
            <VoicePlaygroundSession
              activityId={activeActivity}
              ageYears={ageYears}
              childId={childId}
              childName={childName}
              playground={playground}
              onExit={handleExit}
            />
          ) : (
            <MathPlaygroundSession
              activityId={activeActivity}
              ageYears={ageYears}
              childId={childId}
              childName={childName}
              playground={playground}
              onExit={handleExit}
            />
          )
        ) : (
          <MathPlaygroundHub
            childName={childName}
            ageYears={ageYears}
            rewards={playground.rewards}
            learning={playground.learning}
            lastParentSnapshot={playground.lastParentSnapshot}
            playMode={playMode}
            childId={childId}
            intelligenceApi={isMpPhase6Enabled() ? intelligenceApi : undefined}
            onSelectActivity={handleSelect}
          />
        )}
      </div>
    </div>
  );
}
