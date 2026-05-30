import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import { MasteryRing } from "./mastery-ring";
import { ProgressionBar } from "./progression-bar";
import { PremiumCard } from "./premium-polish";
import { HUB_XP_GOLD } from "@/lib/parent-hub-premium";
import type { LearningProgressProfile } from "@workspace/learning-progress-engine";

interface ProgressionStripProps {
  profile: LearningProgressProfile;
  className?: string;
  parentHub?: boolean;
}

export function ProgressionStrip({ profile, className, parentHub = false }: ProgressionStripProps) {
  return (
    <PremiumCard parentHub={parentHub} testId="progression-strip" className={className}>
      <div className="flex flex-wrap items-center gap-4 p-4">
        <MasteryRing score={profile.masteryScore} label="Growing" parentHub={parentHub} />
        <div className="flex-1 min-w-[140px] space-y-2">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>
              Level{" "}
              <span className={parentHub ? "font-semibold text-foreground" : "font-semibold text-foreground"}>
                {profile.learningLevel}
              </span>
            </span>
            <span className="capitalize opacity-75">{profile.currentPhase.replace(/_/g, " ")}</span>
            {profile.streakDays > 0 && (
              <span className="inline-flex items-center gap-1 text-orange-400">
                <Flame className="h-3.5 w-3.5" />
                {profile.streakDays}d rhythm
              </span>
            )}
            <span>
              <span className={parentHub ? HUB_XP_GOLD : "font-semibold text-foreground"}>{profile.totalXP}</span> XP
            </span>
          </div>
          <ProgressionBar
            label="Learning momentum"
            value={profile.masteryScore}
            showPercent
            parentHub={parentHub}
          />
        </div>
      </div>
    </PremiumCard>
  );
}
