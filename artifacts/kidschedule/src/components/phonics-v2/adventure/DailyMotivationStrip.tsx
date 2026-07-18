import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { GuidedAmyCue } from "../ux/GuidedAmyCue";
import {
  amyDailyGreeting,
  buildDailyMotivationCard,
  claimDailyBonus,
  gentlePracticeDays,
  loadDailyMotivationState,
  recordPracticeDay,
  saveDailyMotivationState,
} from "@/lib/phonics-v3/daily-motivation";
import { getSatpinWorld } from "@/lib/phonics-v3/satpin-worlds";
import { Gift } from "lucide-react";

type DailyMotivationStripProps = {
  childId: number;
  childName: string;
  letterGroupIndex: number;
  onStartLesson?: () => void;
};

export function DailyMotivationStrip({
  childId,
  childName,
  letterGroupIndex,
  onStartLesson,
}: DailyMotivationStripProps) {
  const [state, setState] = useState(() => loadDailyMotivationState(childId));
  const [toast, setToast] = useState<string | null>(null);

  const card = useMemo(
    () => buildDailyMotivationCard({ letterGroupIndex, childId }),
    [letterGroupIndex, childId],
  );
  const world = getSatpinWorld(letterGroupIndex);
  const days = gentlePracticeDays(state);
  const greeting = amyDailyGreeting({
    childName,
    practiceDaysThisWeek: days,
    worldName: world.name,
  });

  return (
    <div
      data-testid="daily-motivation-strip"
      className="space-y-3 rounded-3xl border border-sky-500/20 bg-gradient-to-br from-sky-500/[0.06] to-transparent p-4"
    >
      <GuidedAmyCue line={greeting} />

      <div className="flex items-start gap-3 rounded-2xl border border-border/60 bg-card/80 p-3">
        <span className="text-3xl" aria-hidden>
          {card.emoji}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-quicksand text-sm font-black">{card.title}</p>
          <p className="text-xs text-muted-foreground">{card.subtitle}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              className="rounded-full font-bold"
              onClick={() => {
                const next = recordPracticeDay(state);
                setState(next);
                saveDailyMotivationState(childId, next);
                onStartLesson?.();
              }}
            >
              Let&apos;s go
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="rounded-full"
              onClick={() => {
                const { state: next, claimed } = claimDailyBonus(state);
                setState(next);
                saveDailyMotivationState(childId, next);
                setToast(
                  claimed
                    ? `Bonus star! You have ${next.bonusStars} ⭐`
                    : "You already collected today’s bonus — see you tomorrow!",
                );
              }}
            >
              <Gift className="mr-1 h-3.5 w-3.5" />
              Bonus
            </Button>
          </div>
        </div>
      </div>

      {toast && (
        <p role="status" className="text-center text-xs font-semibold text-amber-700 dark:text-amber-300">
          {toast}
        </p>
      )}
    </div>
  );
}
