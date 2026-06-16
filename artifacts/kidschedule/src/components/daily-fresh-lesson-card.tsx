import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Sparkles, Clock, ChevronRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/firebase-auth-hooks";
import { getApiUrl } from "@/lib/api";
import { parseApiJson } from "@/lib/safe-json-response";
import { todayIso } from "@workspace/study-zone";
import type { FreshLessonSummary } from "@workspace/content-bank";
import { cn } from "@/lib/utils";
import { studyGlassCard, studyPanelCard } from "@/lib/study-zone-theme";

type Props = {
  childId: number;
  planDate?: string;
  /** When daily-plan already returned the lesson, skip fetch. */
  initialLesson?: FreshLessonSummary | null;
  onStart: (lessonId: string) => void;
  className?: string;
};

export function DailyFreshLessonCard({
  childId,
  planDate,
  initialLesson,
  onStart,
  className,
}: Props) {
  const { t } = useTranslation();
  const { getToken } = useAuth();
  const [lesson, setLesson] = useState<FreshLessonSummary | null | undefined>(
    initialLesson,
  );
  const [loading, setLoading] = useState(initialLesson === undefined);
  const dateIso = planDate ?? todayIso();

  useEffect(() => {
    if (initialLesson !== undefined) {
      setLesson(initialLesson);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const token = await getToken();
        if (!token) {
          if (!cancelled) setLoading(false);
          return;
        }
        const res = await fetch(
          getApiUrl(`/api/smart-study/daily-fresh-lesson?childId=${childId}&date=${dateIso}`),
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (!res.ok) {
          if (!cancelled) {
            setLesson(null);
            setLoading(false);
          }
          return;
        }
        const data = await parseApiJson<{ lesson: FreshLessonSummary | null }>(res);
        if (!cancelled) {
          setLesson(data.lesson);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setLesson(null);
          setLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [childId, dateIso, getToken, initialLesson]);

  if (loading) {
    return <Skeleton className={cn("h-28 w-full rounded-[24px]", className)} />;
  }
  if (!lesson) return null;

  return (
    <div className={cn(studyPanelCard(), "mb-3", className)} data-testid="daily-fresh-lesson">
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-4 w-4 text-[hsl(var(--brand-fuchsia-400))]" />
          <h3 className="font-quicksand text-lg font-bold text-foreground">
            {t("screens.study.daily_fresh_lesson_title", "Daily Fresh Lesson ✨")}
          </h3>
          {lesson.isCompleted ? (
            <span className="text-[10px] uppercase tracking-wide font-semibold px-1.5 py-0.5 rounded-full bg-sky-500/20 text-sky-200 border border-sky-400/30 inline-flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              {t("screens.study.daily_fresh_completed", "Completed")}
            </span>
          ) : lesson.isUnseen ? (
            <span className="text-[10px] uppercase tracking-wide font-semibold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
              {t("screens.study.daily_fresh_new", "New")}
            </span>
          ) : null}
        </div>
        <div
          className={cn(
            studyGlassCard(),
            "bg-gradient-to-br from-fuchsia-500/10 via-violet-600/5 to-transparent",
          )}
        >
          <div className="flex items-start gap-3 p-4">
            <div className="text-3xl shrink-0">{lesson.subjectEmoji}</div>
            <div className="min-w-0 flex-1">
              <div className="font-quicksand font-bold text-foreground">{lesson.title}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{lesson.subject}</div>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{lesson.description}</p>
              <div className="mt-2 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                <Clock className="h-3 w-3" />
                {t("screens.study.daily_fresh_duration", {
                  minutes: lesson.estimatedMinutes,
                  defaultValue: "~{{minutes}} min",
                })}
              </div>
            </div>
          </div>
          <div className="px-4 pb-4">
            <Button
              className="w-full rounded-full bg-gradient-to-r from-fuchsia-500 to-violet-600 hover:from-fuchsia-400 hover:to-violet-500"
              onClick={() => onStart(lesson.id)}
              data-testid="daily-fresh-start"
            >
              {lesson.isCompleted
                ? t("screens.study.daily_fresh_review_cta", "Continue Learning")
                : t("screens.study.daily_fresh_cta", "Start Learning")}
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
