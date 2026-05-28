import { Flame } from "lucide-react";
import { MasteryRing } from "./mastery-ring";
import { ProgressionBar } from "./progression-bar";
import { PremiumCard } from "./premium-polish";
import type { LearningProgressProfile } from "@workspace/learning-progress-engine";

interface ProgressionStripProps {
  profile: LearningProgressProfile;
  className?: string;
}

export function ProgressionStrip({ profile, className }: ProgressionStripProps) {
  return (
    <PremiumCard testId="progression-strip" className={className}>
      <div className="flex flex-wrap items-center gap-4 p-4">
        <MasteryRing score={profile.masteryScore} label="Growing" />
        <div className="flex-1 min-w-[140px] space-y-2">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>
              Level <span className="font-semibold text-foreground">{profile.learningLevel}</span>
            </span>
            <span className="capitalize">{profile.currentPhase.replace(/_/g, " ")}</span>
            {profile.streakDays > 0 && (
              <span className="inline-flex items-center gap-1 text-orange-600 dark:text-orange-400">
                <Flame className="h-3.5 w-3.5" />
                {profile.streakDays}d rhythm
              </span>
            )}
            <span>{profile.totalXP} XP</span>
          </div>
          <ProgressionBar label="Learning momentum" value={profile.masteryScore} showPercent />
        </div>
      </div>
    </PremiumCard>
  );
}
