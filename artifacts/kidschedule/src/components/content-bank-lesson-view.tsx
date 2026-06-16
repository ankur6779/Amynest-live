import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, Sparkles, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/firebase-auth-hooks";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { getApiUrl } from "@/lib/api";
import { parseApiJson } from "@/lib/safe-json-response";
import { AudioPlayButton } from "@/components/audio-play-button";
import type { SmartStudyLesson } from "@workspace/content-bank";
import { cn } from "@/lib/utils";
import {
  STUDY_BACK_BTN,
  STUDY_SECTION_TITLE,
  studyPanelCard,
} from "@/lib/study-zone-theme";

type LessonWithAudio = SmartStudyLesson & {
  audioHash?: string;
  staticAudioUrl?: string | null;
};

function optionsForQuestion(lesson: SmartStudyLesson, qi: number): string[] {
  const correct = lesson.answers[qi] ?? "";
  const distractors = lesson.answers.filter((_, i) => i !== qi && lesson.answers[i] !== correct);
  const unique = [correct, ...distractors];
  const seen = new Set<string>();
  const opts: string[] = [];
  for (const o of unique) {
    if (!seen.has(o)) {
      seen.add(o);
      opts.push(o);
    }
    if (opts.length >= 4) break;
  }
  while (opts.length < 2 && opts.length < unique.length) {
    const extra = lesson.answers.find((a) => !seen.has(a));
    if (!extra) break;
    seen.add(extra);
    opts.push(extra);
  }
  return opts.sort((a, b) => a.localeCompare(b));
}

type Props = {
  childId: number;
  lessonId: string;
  onExit: () => void;
  onCompleted?: () => void;
};

export function ContentBankLessonView({ childId, lessonId, onExit, onCompleted }: Props) {
  const { t } = useTranslation();
  const { getToken } = useAuth();
  const authFetch = useAuthFetch();
  const [lesson, setLesson] = useState<LessonWithAudio | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [picked, setPicked] = useState<(string | null)[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadLesson = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const token = await getToken();
      if (!token) {
        setError(true);
        return;
      }
      await authFetch(getApiUrl("/api/smart-study/lesson-view"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ childId, lessonId }),
      });
      const res = await fetch(
        getApiUrl(`/api/smart-study/lesson/${encodeURIComponent(lessonId)}?childId=${childId}`),
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!res.ok) {
        setError(true);
        return;
      }
      const data = await parseApiJson<{ item: LessonWithAudio }>(res);
      setLesson(data.item);
      setPicked(Array(data.item.questions.length).fill(null));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [authFetch, childId, getToken, lessonId]);

  useEffect(() => {
    void loadLesson();
  }, [loadLesson]);

  const correctCount = useMemo(() => {
    if (!lesson) return 0;
    return lesson.questions.reduce((acc, _q, i) => {
      const expected = lesson.answers[i];
      return acc + (picked[i] === expected ? 1 : 0);
    }, 0);
  }, [lesson, picked]);

  const submit = async () => {
    if (!lesson || submitting) return;
    setSubmitted(true);
    setSubmitting(true);
    const total = lesson.questions.length;
    const correct = correctCount;
    const passed = total === 0 || correct >= Math.ceil(total * 0.6);
    try {
      await authFetch(getApiUrl("/api/learning-progress/complete-activity"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          childId,
          activityId: `cb:smart-study:${lesson.id}`,
          section: "math",
          correct: passed,
        }),
      });
      onCompleted?.();
    } catch {
      /* best-effort */
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <Skeleton className="h-64 w-full rounded-2xl" />;
  }
  if (error || !lesson) {
    return (
      <div className={studyPanelCard()}>
        <div className="p-6 text-center space-y-3">
          <p className="text-sm text-muted-foreground">
            {t("screens.study.lesson_load_error", "Could not load this lesson.")}
          </p>
          <Button variant="outline" className="rounded-full" onClick={onExit}>
            {t("screens.study.back")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <div className="flex items-center gap-2">
        <button type="button" className={STUDY_BACK_BTN} onClick={onExit} aria-label={t("screens.study.back")}>
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h2 className={STUDY_SECTION_TITLE}>
          <Sparkles className="h-5 w-5 text-fuchsia-300" />
          {lesson.title}
        </h2>
      </div>

      <div className={studyPanelCard()}>
        <div className="p-5 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs text-muted-foreground">{lesson.subject}</p>
            {lesson.audioText ? (
              <AudioPlayButton
                text={lesson.audioText}
                size="sm"
                variant="outline"
                ariaLabel={t("screens.study.read_aloud")}
              />
            ) : null}
          </div>
          <p className="text-sm leading-relaxed whitespace-pre-line text-foreground">{lesson.lessonContent}</p>
          {lesson.funFact ? (
            <p className="text-xs text-muted-foreground border-t border-white/10 pt-3">
              💡 {lesson.funFact}
            </p>
          ) : null}
        </div>
      </div>

      {lesson.questions.length > 0 && (
        <div className={studyPanelCard()}>
          <div className="p-5 space-y-4">
            <div className="font-quicksand font-bold text-foreground">
              {t("screens.study.practice_label", { count: lesson.questions.length })}
            </div>
            {lesson.questions.map((q, qi) => {
              const options = optionsForQuestion(lesson, qi);
              const correctAnswer = lesson.answers[qi] ?? "";
              return (
              <div key={qi} className="space-y-2">
                <p className="text-sm font-medium text-foreground">{q}</p>
                <div className="flex flex-col gap-2">
                  {options.map((ans) => {
                    const selected = picked[qi] === ans;
                    const showResult = submitted;
                    const isCorrect = ans === correctAnswer;
                    return (
                      <button
                        key={ans}
                        type="button"
                        disabled={submitted}
                        onClick={() => {
                          setPicked((prev) => {
                            const next = [...prev];
                            next[qi] = ans;
                            return next;
                          });
                        }}
                        className={cn(
                          "rounded-xl border px-3 py-2 text-left text-sm transition-colors",
                          selected && !showResult && "border-fuchsia-400 bg-fuchsia-500/15",
                          showResult && isCorrect && "border-emerald-400 bg-emerald-500/15",
                          showResult && selected && !isCorrect && "border-red-400 bg-red-500/10",
                          !selected && !showResult && "border-white/10 hover:border-white/20",
                        )}
                      >
                        {ans}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
            })}
            {!submitted ? (
              <Button
                className="rounded-full w-full bg-gradient-to-r from-fuchsia-500 to-violet-600"
                disabled={picked.some((p) => !p) || submitting}
                onClick={() => void submit()}
              >
                {t("screens.study.check_answers", "Check answers")}
              </Button>
            ) : (
              <div className="flex items-center gap-2 text-sm text-emerald-300">
                <CheckCircle2 className="h-4 w-4" />
                {t("screens.study.lesson_complete_score", {
                  score: correctCount,
                  total: lesson.questions.length,
                  defaultValue: "Great work! {{score}}/{{total}} correct",
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
