import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ACTIVITY_CARDS,
  pickComebackActivity,
  type ParentRetentionSnapshot,
  type PlaygroundActivityId,
  type PlaygroundLearningState,
  type PlaygroundRewardState,
} from "@workspace/math-playground";
import { ActivityCard } from "./shared/ActivityCard";
import { RewardsDrawer } from "./rewards/RewardsDrawer";
import { ParentSummaryCard } from "./rewards/ParentSummaryCard";
import { ComebackMissionCard } from "./shell/ComebackMissionCard";
import { PlayModeSelector } from "./mode/PlayModeSelector";
import type { PlayModeApi } from "./mode/usePlayMode";

interface MathPlaygroundHubProps {
  childName: string;
  ageYears: number;
  childId: number;
  rewards: PlaygroundRewardState;
  learning: PlaygroundLearningState;
  lastParentSnapshot?: ParentRetentionSnapshot;
  playMode: PlayModeApi;
  onSelectActivity: (id: PlaygroundActivityId) => void;
}

export function MathPlaygroundHub({
  childName,
  ageYears,
  rewards,
  learning,
  lastParentSnapshot,
  playMode,
  childId,
  onSelectActivity,
}: MathPlaygroundHubProps) {
  const { t } = useTranslation();
  const [rewardsOpen, setRewardsOpen] = useState(false);
  const comebackId = useMemo(
    () => pickComebackActivity(learning, ageYears),
    [learning, ageYears],
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-3 px-1">
        <div>
          <p className="text-sm font-black text-white/90">
            {t("components.math_playground.hub_title")}
          </p>
          <p className="text-[10px] text-white/40">{t("components.math_playground.hub_subtitle")}</p>
        </div>
        <button
          type="button"
          onClick={() => setRewardsOpen(true)}
          className="text-right active:scale-95 transition-transform"
        >
          {rewards.streakDays > 0 && (
            <p className="text-[10px] font-bold text-amber-300">🔥 {rewards.streakDays}</p>
          )}
          <p className="text-[11px] font-bold text-amber-300">⭐ {rewards.stars}</p>
          <p className="text-[9px] text-white/30">{t("components.math_playground.view_rewards")}</p>
        </button>
      </div>

      <PlayModeSelector playMode={playMode} childId={childId} />

      <ParentSummaryCard
        childName={childName}
        rewards={rewards}
        learning={learning}
        ageYears={ageYears}
        lastParentSnapshot={lastParentSnapshot}
      />

      {comebackId && (
        <ComebackMissionCard
          ageYears={ageYears}
          learning={learning}
          onSelect={() => onSelectActivity(comebackId)}
        />
      )}

      {rewards.badges.length > 0 && (
        <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
          {rewards.badges.map((b) => (
            <span
              key={b.id}
              className="shrink-0 px-2 py-1 rounded-full text-[10px] font-bold"
              style={{ background: "rgba(245,158,11,0.2)", color: "hsl(var(--brand-amber-300))" }}
            >
              {b.emoji} {t(`components.math_playground.${b.titleKey}`)}
            </span>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        {ACTIVITY_CARDS.map((card) => (
          <ActivityCard
            key={card.id}
            card={card}
            ageYears={ageYears}
            completions={rewards.activityCompletions[card.id]}
            masteryScore={learning.activityStats[card.id]?.masteryScore}
            isPracticeTarget={card.id === comebackId}
            onSelect={() => onSelectActivity(card.id)}
          />
        ))}
      </div>

      <RewardsDrawer open={rewardsOpen} onClose={() => setRewardsOpen(false)} rewards={rewards} />
    </div>
  );
}
