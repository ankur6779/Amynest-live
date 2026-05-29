import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lightbulb, CheckCircle2 } from "lucide-react";
import { AudioPlayButton } from "@/components/audio-play-button";
import { scheduleLearningZoneAudioPrewarm } from "@/lib/learning-zone-audio-prewarm";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import type { LifeSkillsLesson } from "@workspace/content-bank";
import { useContentBankFeed } from "@/hooks/use-content-bank";
import { getApiUrl } from "@/lib/api";

type LifeSkillsLessonWithAudio = LifeSkillsLesson & {
  audioHash?: string;
  staticAudioUrl?: string | null;
};

type Props = {
  childId: number;
  onCompleted?: (activityId: string) => void;
};

export function ContentBankScenarios({ childId, onCompleted }: Props) {
  const authFetch = useAuthFetch();
  const { data, loading, error } = useContentBankFeed<LifeSkillsLessonWithAudio>(
    "life-skills",
    childId,
    { limit: 3 },
  );
  const [activeId, setActiveId] = useState<string | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (loading && !data) {
    return (
      <p className="text-sm text-muted-foreground">Loading scenario lessons…</p>
    );
  }
  if (error || !data?.items?.length) {
    return null;
  }

  const active = data.items.find((x) => x.id === activeId) ?? data.items[0];

  useEffect(() => {
    const texts = data?.items?.map((i) => i.audioText).filter(Boolean) ?? [];
    if (texts.length === 0) return;
    scheduleLearningZoneAudioPrewarm(authFetch, {
      module: "learn_with_amy",
      texts,
      stateKey: `content-bank:life-skills:${childId}`,
    });
  }, [authFetch, childId, data?.items]);

  const submitChoice = async (lesson: LifeSkillsLessonWithAudio, choice: string) => {
    setPicked(choice);
    setSubmitting(true);
    try {
      const correct = choice === lesson.correctAnswer;
      await authFetch(getApiUrl("/api/learning-progress/complete-activity"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          childId,
          activityId: `cb:life-skills:${lesson.id}`,
          section: "lifeSkills",
          correct,
        }),
      });
      onCompleted?.(`cb:life-skills:${lesson.id}`);
    } catch {
      /* best-effort */
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <Lightbulb className="h-4 w-4 text-amber-500" />
        Scenario practice
      </h4>
      <div className="flex gap-2 flex-wrap">
        {data.items.map((lesson) => (
          <Button
            key={lesson.id}
            type="button"
            size="sm"
            variant={active?.id === lesson.id ? "default" : "outline"}
            className="rounded-full text-xs"
            onClick={() => {
              setActiveId(lesson.id);
              setPicked(null);
            }}
          >
            {lesson.skillCategory}
          </Button>
        ))}
      </div>
      {active && (
        <Card className="rounded-2xl border-amber-200/60 bg-amber-50/40 dark:bg-amber-950/20">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <p className="font-medium text-foreground flex-1">{active.title}</p>
              {active.audioText ? (
                <AudioPlayButton
                  text={active.audioText}
                  size="sm"
                  variant="outline"
                  ariaLabel="Listen to Amy"
                />
              ) : null}
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{active.story}</p>
            <p className="text-sm font-medium">{active.scenario}</p>
            <p className="text-sm">{active.question}</p>
            <div className="flex flex-col gap-2">
              {active.choices.map((choice) => {
                const isCorrect = picked && choice === active.correctAnswer;
                const isWrong = picked === choice && choice !== active.correctAnswer;
                return (
                  <Button
                    key={choice}
                    type="button"
                    variant="outline"
                    disabled={!!picked || submitting}
                    className={`justify-start text-left h-auto py-2 ${
                      isCorrect ? "border-emerald-500 bg-emerald-50" : ""
                    } ${isWrong ? "border-red-300 bg-red-50" : ""}`}
                    onClick={() => void submitChoice(active, choice)}
                  >
                    {choice}
                    {isCorrect && <CheckCircle2 className="ml-auto h-4 w-4 text-emerald-600" />}
                  </Button>
                );
              })}
            </div>
            {picked && (
              <p className="text-sm text-muted-foreground italic">{active.amyTip}</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
