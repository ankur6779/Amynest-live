import { Button } from "@/components/ui/button";
import type { DailySessionSummary } from "@/lib/phonics-v3/daily-session";
import { GuidedAmyCue } from "../ux/GuidedAmyCue";
import { Star } from "lucide-react";

export type SessionFinishScreenProps = {
  childName: string;
  summary: DailySessionSummary;
  petLabel: string;
  streak: number;
  tomorrowPreview: string;
  parentSummary: {
    timeSpent: string;
    wordsRead: number;
    soundsMastered: number;
    storyCompleted: boolean;
    recommendedPractice: string;
  };
  onDone: () => void;
};

export function SessionFinishScreen({
  childName,
  summary,
  petLabel,
  streak,
  tomorrowPreview,
  parentSummary,
  onDone,
}: SessionFinishScreenProps) {
  return (
    <div
      className="space-y-4 rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/[0.08] via-card to-amber-500/[0.06] p-5 text-center"
      data-testid="daily-session-finish"
    >
      <p className="text-4xl" aria-hidden>
        🎉
      </p>
      <h2 className="font-quicksand text-xl font-black leading-tight">
        Today&apos;s Reading Adventure Complete
      </h2>

      <GuidedAmyCue
        line={`Amy is proud of you, ${childName.trim() || "friend"}!`}
      />

      <div className="rounded-2xl border border-border bg-card/80 p-4 text-left text-sm">
        <p className="mb-2 text-[10px] font-black uppercase tracking-wide text-muted-foreground">
          Today you learned
        </p>
        <ul className="space-y-1.5 font-semibold">
          <li>• {summary.soundsLearned} new sound{summary.soundsLearned === 1 ? "" : "s"}</li>
          <li>• {summary.wordsRead} new word{summary.wordsRead === 1 ? "" : "s"}</li>
          <li>• {summary.storiesCompleted} story</li>
        </ul>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 text-sm font-bold">
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-3 py-1.5 text-amber-800 dark:text-amber-200">
          <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
          +{summary.starsEarned} Stars
        </span>
        <span className="rounded-full bg-primary/10 px-3 py-1.5">
          Pet grew · {petLabel}
        </span>
        <span className="rounded-full bg-muted px-3 py-1.5">
          Streak {Math.max(1, streak)} day{streak === 1 ? "" : "s"}
        </span>
      </div>

      <p className="text-xs text-muted-foreground">
        Tomorrow&apos;s preview: {tomorrowPreview}
      </p>

      <section
        className="rounded-2xl border border-border bg-muted/20 p-4 text-left"
        data-testid="daily-session-parent-summary"
      >
        <p className="text-[10px] font-black uppercase tracking-wide text-muted-foreground">
          Parent summary
        </p>
        <p className="mt-1 text-sm font-bold">Today&apos;s session completed</p>
        <dl className="mt-2 grid grid-cols-2 gap-2 text-xs">
          <div>
            <dt className="text-muted-foreground">Time spent</dt>
            <dd className="font-bold">{parentSummary.timeSpent}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Words read</dt>
            <dd className="font-bold">{parentSummary.wordsRead}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Sounds mastered</dt>
            <dd className="font-bold">{parentSummary.soundsMastered}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Story</dt>
            <dd className="font-bold">
              {parentSummary.storyCompleted ? "Completed" : "Skipped"}
            </dd>
          </div>
        </dl>
        <p className="mt-2 text-xs text-muted-foreground">
          Recommended: {parentSummary.recommendedPractice}
        </p>
      </section>

      <Button
        type="button"
        size="lg"
        className="min-h-12 w-full rounded-2xl font-quicksand text-base font-black"
        onClick={onDone}
        data-testid="daily-session-done"
      >
        Finished
      </Button>
    </div>
  );
}
