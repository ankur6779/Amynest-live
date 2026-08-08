import { useState } from "react";
import {
  Award,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  Clock3,
  Map,
  PawPrint,
  Play,
  Settings,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  isGrowLivingV1Enabled,
  livingGrowAdventureEyebrow,
  livingGrowPointsLabel,
} from "@/lib/grow/living-room";
import type { LearningHubModel, HubLessonRow } from "@/lib/phonics-v3/learning-hub";
import type { DailySessionPlanItem } from "@/lib/phonics-v3/daily-session";
import { PulseCta } from "./PulseCta";
import { GuidedAmyCue } from "./GuidedAmyCue";

export type PhonicsLearningHubProps = {
  model: LearningHubModel;
  planItems: DailySessionPlanItem[];
  estimatedMinutes?: number;
  sessionCompleteToday?: boolean;
  onPrimaryAction: () => void;
  onSelectLesson: (grapheme: string) => void;
  onOpenJourney: () => void;
  journeyOpen?: boolean;
  className?: string;
};

function LessonStatusIcon({ status }: { status: HubLessonRow["status"] }) {
  if (status === "done") {
    return <Check className="h-4 w-4 text-emerald-600" aria-hidden />;
  }
  if (status === "current") {
    return <Play className="h-4 w-4 text-primary" aria-hidden />;
  }
  return (
    <span
      className="inline-block h-2.5 w-2.5 rounded-full border-2 border-muted-foreground/40"
      aria-hidden
    />
  );
}

export function PhonicsLearningHub({
  model,
  planItems,
  estimatedMinutes = 8,
  sessionCompleteToday = false,
  onPrimaryAction,
  onSelectLesson,
  onOpenJourney,
  journeyOpen = false,
  className,
}: PhonicsLearningHubProps) {
  const [exploreOpen, setExploreOpen] = useState(false);
  const [lessonsOpen, setLessonsOpen] = useState(false);
  const starsDisplay = Math.min(
    5,
    Math.max(
      0,
      Math.round(model.starsEarned / 3) ||
        (model.lessonsCompletedInGroup > 0 ? 1 : 0),
    ),
  );

  return (
    <div
      id="phonics-learning-hub"
      data-testid="phonics-learning-hub"
      className={cn("space-y-4", className)}
    >
      {/* Above the fold — one card, one CTA */}
      <section
        id="phonics-start-here"
        data-testid="phonics-start-here"
        aria-label="Today's reading adventure"
        className="rounded-3xl border border-amber-500/35 bg-gradient-to-br from-amber-500/[0.12] via-card to-emerald-500/[0.07] p-4 sm:p-5"
      >
        <GuidedAmyCue
          line={
            sessionCompleteToday
              ? isGrowLivingV1Enabled()
                ? `${model.greeting} You finished today's practice.`
                : `${model.greeting} You finished today's adventure!`
              : `${model.greeting} Amy prepared today's session.`
          }
        />

        <p
          className={cn(
            "mt-3 text-[10px] font-bold uppercase tracking-wide",
            isGrowLivingV1Enabled()
              ? "gw-living-deep-eyebrow"
              : "font-black text-amber-700 dark:text-amber-300",
          )}
        >
          {isGrowLivingV1Enabled()
            ? livingGrowAdventureEyebrow()
            : "Today's Reading Adventure"}
        </p>
        <h2 className="mt-1 font-quicksand text-xl font-black leading-tight text-foreground">
          Group {model.group.id}
        </h2>
        <p className="mt-1 text-sm font-semibold text-foreground/90">
          Lesson {model.lessonNumber} of {model.lessonTotal}
          <span className="text-muted-foreground"> · /{model.focusGrapheme}/</span>
        </p>

        <div
          className="mt-2 inline-flex items-center gap-0.5"
          aria-label={`${starsDisplay} of 5 stars`}
        >
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={cn(
                "h-4 w-4",
                i < starsDisplay
                  ? "fill-amber-400 text-amber-400"
                  : "text-muted-foreground/25",
              )}
            />
          ))}
        </div>

        <div className="mt-4 space-y-2">
          <p className="text-[10px] font-black uppercase tracking-wide text-muted-foreground">
            Today&apos;s plan
          </p>
          <ul className="space-y-1.5 text-sm font-semibold">
            {planItems.map((item) => (
              <li key={item.id} className="flex items-center gap-2">
                <span aria-hidden>{item.done || sessionCompleteToday ? "✅" : "○"}</span>
                <span className={cn((item.done || sessionCompleteToday) && "text-muted-foreground")}>
                  {item.label}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-foreground/80">
          <Clock3 className="h-3.5 w-3.5" aria-hidden />
          Time · {estimatedMinutes} minutes
        </p>

        {!sessionCompleteToday ? (
          <PulseCta className="mt-4">
            <Button
              type="button"
              size="lg"
              className="min-h-12 w-full rounded-2xl font-quicksand text-base font-black"
              onClick={onPrimaryAction}
              data-testid="phonics-hub-primary-cta"
            >
              {model.primaryLabel}
              <ChevronRight className="ml-1 h-5 w-5" />
            </Button>
          </PulseCta>
        ) : (
          <div
            className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-center text-sm font-bold text-emerald-800 dark:text-emerald-200"
            data-testid="phonics-hub-session-done"
          >
            Today&apos;s session completed ✨
          </div>
        )}
      </section>

      {/* Everything else — secondary */}
      <section className="rounded-3xl border border-border bg-card/90">
        <button
          type="button"
          className="flex min-h-12 w-full items-center justify-between gap-2 px-4 py-3 text-left"
          onClick={() => setExploreOpen((v) => !v)}
          aria-expanded={exploreOpen}
          data-testid="phonics-explore-more"
        >
          <span className="font-quicksand text-sm font-bold">Explore More</span>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform",
              exploreOpen && "rotate-180",
            )}
          />
        </button>

        {exploreOpen && (
          <div className="space-y-2 border-t border-border px-3 py-3">
            <button
              type="button"
              className="flex min-h-12 w-full items-center gap-3 rounded-xl px-2 py-2 text-left text-sm font-semibold hover:bg-muted/40"
              onClick={() => setLessonsOpen((v) => !v)}
              data-testid="phonics-hub-lessons-toggle"
            >
              <BookOpen className="h-4 w-4 text-primary" />
              My Lessons
              <ChevronDown
                className={cn(
                  "ml-auto h-4 w-4 text-muted-foreground transition-transform",
                  lessonsOpen && "rotate-180",
                )}
              />
            </button>
            {lessonsOpen && (
              <ul
                className="mb-2 space-y-1 rounded-xl bg-muted/20 px-2 py-2"
                data-testid="phonics-hub-lessons-list"
              >
                <li className="px-1 pb-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                  {model.group.name} Group {model.group.id}
                </li>
                {model.lessons.map((lesson) => {
                  const interactive =
                    lesson.status === "done" || lesson.status === "current";
                  return (
                    <li key={lesson.grapheme}>
                      <button
                        type="button"
                        disabled={!interactive || sessionCompleteToday}
                        onClick={() => interactive && onSelectLesson(lesson.grapheme)}
                        className={cn(
                          "flex min-h-11 w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left text-sm",
                          lesson.status === "current" && "bg-primary/10 font-bold",
                          lesson.status === "upcoming" && "opacity-50",
                        )}
                        data-testid={`phonics-hub-lesson-${lesson.grapheme}`}
                      >
                        <LessonStatusIcon status={lesson.status} />
                        <span>
                          {lesson.label}
                          {lesson.status === "current" ? " (Current)" : ""}
                          <span className="text-muted-foreground">
                            {" "}
                            · /{lesson.grapheme}/
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            <button
              type="button"
              onClick={onOpenJourney}
              className="flex min-h-12 w-full items-center gap-3 rounded-xl px-2 py-2 text-left text-sm font-semibold hover:bg-muted/40"
              data-testid="phonics-hub-open-journey"
              aria-expanded={journeyOpen}
            >
              <Map className="h-4 w-4 text-muted-foreground" />
              {isGrowLivingV1Enabled() ? "Practice path" : "Journey / Adventure Map"}
            </button>

            {!isGrowLivingV1Enabled() ? (
              <div className="flex min-h-12 items-center gap-3 rounded-xl px-2 py-2 text-sm font-semibold text-muted-foreground">
                <PawPrint className="h-4 w-4" />
                Reading Pet · {model.petLabel}
              </div>
            ) : null}

            <div className="flex min-h-12 items-center gap-3 rounded-xl px-2 py-2 text-sm font-semibold text-muted-foreground">
              <Award className="h-4 w-4" />
              {isGrowLivingV1Enabled()
                ? `${livingGrowPointsLabel()} · ${model.starsEarned}`
                : `Achievements · ${model.starsEarned} stars`}
            </div>

            <div className="flex min-h-12 items-center gap-3 rounded-xl px-2 py-2 text-sm font-semibold text-muted-foreground">
              <Star className="h-4 w-4" />
              {isGrowLivingV1Enabled()
                ? `Today · ${model.dailyGoalLabel}`
                : `Badges · ${model.dailyGoalLabel}`}
            </div>

            <div className="flex min-h-12 items-center gap-3 rounded-xl px-2 py-2 text-sm font-semibold text-muted-foreground">
              <Settings className="h-4 w-4" />
              Settings · coming soon
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
