import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/firebase-auth-hooks";
import { getApiUrl } from "@/lib/api";
import { parseApiJson } from "@/lib/safe-json-response";
import { todayIso } from "@workspace/study-zone";
import type { FreshLessonSummary } from "@workspace/content-bank";
import { studyGlassCard } from "@/lib/study-zone-theme";

type Props = {
  childId: number;
  subjectId: string;
  topicId: string;
  onStart: (lessonId: string) => void;
};

export function ContinueLearningCta({ childId, subjectId, topicId, onStart }: Props) {
  const { t } = useTranslation();
  const { getToken } = useAuth();
  const [lesson, setLesson] = useState<FreshLessonSummary | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        if (!token) return;
        const qs = new URLSearchParams({
          childId: String(childId),
          subjectId,
          topicId,
          date: todayIso(),
        });
        const res = await fetch(getApiUrl(`/api/smart-study/recommended-next?${qs}`), {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await parseApiJson<{ lesson: FreshLessonSummary | null }>(res);
        if (!cancelled) setLesson(data.lesson);
      } catch {
        /* fallback: hide CTA */
      }
    })();
    return () => { cancelled = true; };
  }, [childId, getToken, subjectId, topicId]);

  if (!lesson) return null;

  return (
    <div
      className={studyGlassCard()}
      data-testid="continue-learning-cta"
    >
      <div className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <Sparkles className="h-5 w-5 text-fuchsia-300 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("screens.study.continue_learning_label", "Continue Learning →")}
            </div>
            <div className="font-quicksand font-bold text-foreground truncate">
              {lesson.title}
            </div>
            <div className="text-xs text-muted-foreground">
              {lesson.subject} · ~{lesson.estimatedMinutes} min
            </div>
          </div>
        </div>
        <Button
          size="sm"
          className="rounded-full shrink-0 bg-gradient-to-r from-fuchsia-500 to-violet-600"
          onClick={() => onStart(lesson.id)}
        >
          {t("screens.study.continue_learning_cta", "Recommended next lesson")}
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
