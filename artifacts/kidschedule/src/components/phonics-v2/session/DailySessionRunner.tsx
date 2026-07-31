import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ReadingLessonRunner } from "../lesson/ReadingLessonRunner";
import { KaraokeBlendRound } from "../KaraokeBlendRound";
import { AiPronunciationCoach } from "../lesson/AiPronunciationCoach";
import { SessionStepHeader } from "./SessionStepHeader";
import { SessionFinishScreen } from "./SessionFinishScreen";
import type { DailySessionState } from "@/lib/phonics-v3/daily-session";
import {
  advanceDailySession,
  buildSessionSummary,
  pauseDailySession,
} from "@/lib/phonics-v3/daily-session";
import type { CoachEvaluation } from "@/lib/phonics-v3/ai-reading-coach";
import type { ReadingLessonCompletePayload } from "../lesson/ReadingLessonRunner";
import { GuidedAmyCue } from "../ux/GuidedAmyCue";
import type { GeneratedDecodableStory } from "@/lib/phonics-v3/ai-decodable-stories";

export type DailySessionRunnerProps = {
  session: DailySessionState;
  childId: number;
  childName: string;
  totalAgeMonths: number;
  story: GeneratedDecodableStory;
  petLabel: string;
  streak: number;
  tomorrowPreview: string;
  onSessionChange: (next: DailySessionState) => void;
  onLessonComplete: (payload: ReadingLessonCompletePayload) => void;
  onCoachEvaluation?: (evaluation: CoachEvaluation) => void;
  /** Learning Platform — word practice completed (no local mastery). */
  onWordCompleted?: (word: string) => void;
  /** Learning Platform — session phase / page started. */
  onPhaseStarted?: (phase: DailySessionState["phase"]) => void;
  onExit: (paused: DailySessionState) => void;
  onFinished: (completed: DailySessionState) => void;
};

export function DailySessionRunner({
  session,
  childId,
  childName,
  totalAgeMonths,
  story,
  petLabel,
  streak,
  tomorrowPreview,
  onSessionChange,
  onLessonComplete,
  onCoachEvaluation,
  onWordCompleted,
  onPhaseStarted,
  onExit,
  onFinished,
}: DailySessionRunnerProps) {
  const [wordIdx, setWordIdx] = useState(() =>
    Math.min(session.wordsCompleted.length, Math.max(0, session.practiceWords.length - 1)),
  );
  const [storyLine, setStoryLine] = useState(0);
  const lastPhaseRef = useRef<DailySessionState["phase"] | null>(null);

  const practiceWord = session.practiceWords[wordIdx] ?? session.focusWord;
  const summary = useMemo(() => buildSessionSummary(session), [session]);

  useEffect(() => {
    if (lastPhaseRef.current === session.phase) return;
    lastPhaseRef.current = session.phase;
    if (session.phase !== "idle" && session.phase !== "complete") {
      onPhaseStarted?.(session.phase);
    }
  }, [onPhaseStarted, session.phase]);

  const goNext = useCallback(
    (patch?: Parameters<typeof advanceDailySession>[1]) => {
      const next = advanceDailySession(session, patch);
      onSessionChange(next);
    },
    [session, onSessionChange],
  );

  const completeWord = useCallback(
    (word: string) => {
      onWordCompleted?.(word);
      const nextWords = session.wordsCompleted.includes(word)
        ? session.wordsCompleted
        : [...session.wordsCompleted, word];
      if (wordIdx >= 2 || nextWords.length >= 3) {
        goNext({ wordsCompleted: nextWords.slice(0, 3) });
        return;
      }
      onSessionChange({
        ...session,
        wordsCompleted: nextWords,
      });
      setWordIdx((i) => i + 1);
    },
    [goNext, onSessionChange, onWordCompleted, session, wordIdx],
  );

  if (session.phase === "complete") {
    return (
      <SessionFinishScreen
        childName={childName}
        summary={summary}
        petLabel={petLabel}
        streak={streak}
        tomorrowPreview={tomorrowPreview}
        parentSummary={{
          timeSpent: `${summary.minutesSpent} min`,
          wordsRead: summary.wordsRead,
          soundsMastered: summary.soundsLearned,
          storyCompleted: summary.storiesCompleted > 0,
          recommendedPractice: "Short sound review tomorrow keeps the streak strong.",
        }}
        onDone={() => onFinished(session)}
      />
    );
  }

  return (
    <div
      id="phonics-daily-session"
      data-testid="daily-session-runner"
      className="space-y-4 rounded-3xl border border-amber-500/25 bg-gradient-to-br from-amber-500/[0.06] via-card to-transparent p-4 sm:p-5"
    >
      <SessionStepHeader session={session} />

      {session.phase === "lesson" && (
        <div className="space-y-3">
          <GuidedAmyCue line="Let's learn today's sound together." />
          <ReadingLessonRunner
            grapheme={session.grapheme}
            letterGroupIndex={session.letterGroupIndex}
            childId={childId}
            childName={childName}
            totalAgeMonths={totalAgeMonths}
            onComplete={(payload) => {
              onLessonComplete(payload);
              goNext({
                lessonCompleted: true,
                focusWord: payload.focusWord,
                soundsLearned: 1,
                starsEarned: (session.starsEarned || 0) + payload.starsEarned * 5,
              });
            }}
            onCancel={() => onExit(pauseDailySession(session))}
            onCoachEvaluation={onCoachEvaluation}
          />
        </div>
      )}

      {session.phase === "words" && (
        <div className="space-y-3" data-testid="daily-session-words">
          <GuidedAmyCue line={`Blend and read: ${practiceWord}`} />
          <p className="text-xs font-semibold text-muted-foreground">
            Word {Math.min(wordIdx + 1, 3)} of 3
          </p>
          <KaraokeBlendRound
            key={practiceWord}
            word={practiceWord}
            onComplete={() => completeWord(practiceWord)}
          />
          <Button
            type="button"
            variant="outline"
            className="min-h-12 w-full rounded-2xl"
            onClick={() => completeWord(practiceWord)}
          >
            Next word
          </Button>
        </div>
      )}

      {session.phase === "coach" && (
        <div className="space-y-3" data-testid="daily-session-coach">
          <GuidedAmyCue line="Say the word out loud — Amy is listening." />
          <AiPronunciationCoach
            childId={childId}
            childName={childName}
            totalAgeMonths={totalAgeMonths}
            expected={session.focusWord || session.grapheme}
            targetKind="word"
            onEvaluation={onCoachEvaluation}
            onPassed={() => goNext({ coachCompleted: true })}
            onSkip={() => goNext({ coachCompleted: true })}
          />
        </div>
      )}

      {session.phase === "story" && (
        <div className="space-y-3" data-testid="daily-session-story">
          <GuidedAmyCue line={`Story time: ${story.title}`} />
          <div className="rounded-2xl border border-sky-500/20 bg-sky-500/[0.05] p-4">
            <p className="mb-2 text-[10px] font-black uppercase tracking-wide text-sky-700 dark:text-sky-300">
              Line {storyLine + 1} of {story.lines.length}
            </p>
            <p className="font-quicksand text-2xl font-black tracking-wide">
              {story.lines[storyLine]?.text}
            </p>
          </div>
          <Button
            type="button"
            size="lg"
            className="min-h-12 w-full rounded-2xl font-black"
            onClick={() => {
              if (storyLine < story.lines.length - 1) {
                setStoryLine((n) => n + 1);
                return;
              }
              goNext({ storyCompleted: true });
            }}
            data-testid="daily-session-story-next"
          >
            {storyLine < story.lines.length - 1 ? "Next line" : "Finish story"}
          </Button>
        </div>
      )}

      {session.phase !== "lesson" && (
        <button
          type="button"
          className="mx-auto block min-h-12 px-4 text-xs text-muted-foreground underline"
          onClick={() => onExit(pauseDailySession(session))}
        >
          Pause for later
        </button>
      )}
    </div>
  );
}
