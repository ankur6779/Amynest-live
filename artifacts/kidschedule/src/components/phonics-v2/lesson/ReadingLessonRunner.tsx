import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { AudioPlayButton } from "@/components/audio-play-button";
import { getPhonemeAudioText } from "@workspace/phonics-sounds";
import {
  advanceLessonStep,
  buildLetterIdOptions,
  buildLessonTarget,
  createLessonState,
  currentStep,
  emojiForWord,
  lessonProgressPct,
  READING_LESSON_STEPS,
  type ReadingLessonState,
} from "@/lib/phonics-v3/reading-lesson-engine";
import {
  applyResumeToState,
  clearLessonResume,
  loadLessonResume,
  saveLessonResume,
  saveLessonResumeForce,
} from "@/lib/phonics-v3/lesson-resume";
import { getUnlockedGroupWords } from "@workspace/phonics-curriculum";
import { MouthShapeCue } from "./MouthShapeCue";
import { LetterTracePad } from "./LetterTracePad";
import { SoundPositionGame } from "./SoundPositionGame";
import { BuildTheWord } from "../games/BuildTheWord";
import { KaraokeBlendRound } from "../KaraokeBlendRound";
import { SegmentWordRound } from "./SegmentWordRound";
import { AiPronunciationCoach } from "./AiPronunciationCoach";
import type { CoachEvaluation } from "@/lib/phonics-v3/ai-reading-coach";
import { CheckCircle2, Star, Snail, ChevronRight } from "lucide-react";
import { PRESS_FEEDBACK } from "@/lib/experience-system";

export type ReadingLessonCompletePayload = {
  grapheme: string;
  focusWord: string;
  starsEarned: number;
  results: ReadingLessonState["results"];
  state: ReadingLessonState;
  /** Latest AI coach evaluations from this lesson (no audio retained). */
  coachEvaluations?: CoachEvaluation[];
};

type ReadingLessonRunnerProps = {
  grapheme: string;
  letterGroupIndex?: number;
  slowPlayback?: boolean;
  highContrast?: boolean;
  /** Required for AI mic coaching; omit to keep self-report fallback only. */
  childId?: number;
  childName?: string;
  totalAgeMonths?: number;
  onComplete: (payload: ReadingLessonCompletePayload) => void;
  onCancel?: () => void;
  onCoachEvaluation?: (evaluation: CoachEvaluation) => void;
};

export function ReadingLessonRunner({
  grapheme,
  letterGroupIndex = 1,
  slowPlayback = true,
  highContrast = false,
  childId,
  childName = "friend",
  totalAgeMonths = 48,
  onComplete,
  onCancel,
  onCoachEvaluation,
}: ReadingLessonRunnerProps) {
  const target = useMemo(
    () => buildLessonTarget(grapheme, letterGroupIndex),
    [grapheme, letterGroupIndex],
  );
  const [state, setState] = useState(() => {
    if (typeof childId === "number" && childId > 0) {
      return applyResumeToState(target, loadLessonResume(childId));
    }
    return createLessonState(target);
  });
  const [slow, setSlow] = useState(slowPlayback);
  const [attempts, setAttempts] = useState(0);
  const [showSegmentBonus, setShowSegmentBonus] = useState(false);
  const [coachEvals, setCoachEvals] = useState<CoachEvaluation[]>([]);
  const coachEnabled = typeof childId === "number" && childId > 0;

  useEffect(() => {
    const resumed =
      typeof childId === "number" && childId > 0
        ? applyResumeToState(target, loadLessonResume(childId))
        : createLessonState(target);
    setState(resumed);
    setAttempts(0);
    setShowSegmentBonus(false);
    setCoachEvals([]);
  }, [target, childId]);

  useEffect(() => {
    if (!coachEnabled || typeof childId !== "number") return;
    if (state.complete) {
      clearLessonResume(childId);
      return;
    }
    saveLessonResume(childId, state);
  }, [state, childId, coachEnabled]);

  const step = currentStep(state);
  const unlockedWords = useMemo(
    () => getUnlockedGroupWords(letterGroupIndex),
    [letterGroupIndex],
  );
  const letterOpts = useMemo(
    () => buildLetterIdOptions(target.grapheme, target.focusWord.charCodeAt(0)),
    [target.grapheme, target.focusWord],
  );

  const finishStep = useCallback(
    (correct: boolean, stepAttempts = 1, skipped = false) => {
      setState((prev) => {
        const next = advanceLessonStep(prev, {
          correct,
          attempts: stepAttempts,
          skipped,
        });
        if (next.complete) {
          queueMicrotask(() =>
            onComplete({
              grapheme: next.target.grapheme,
              focusWord: next.target.focusWord,
              starsEarned: next.starsEarned,
              results: next.results,
              state: next,
              coachEvaluations: coachEvals,
            }),
          );
        }
        return next;
      });
      setAttempts(0);
    },
    [onComplete, coachEvals],
  );

  const handleCoachEval = useCallback(
    (evaluation: CoachEvaluation) => {
      setCoachEvals((prev) => [...prev, evaluation].slice(-12));
      onCoachEvaluation?.(evaluation);
    },
    [onCoachEvaluation],
  );

  if (state.complete) {
    return (
      <div
        data-testid="reading-lesson-complete"
        className="space-y-4 rounded-3xl border border-emerald-500/30 bg-emerald-500/[0.06] p-5 text-center"
      >
        <p className="text-3xl" aria-hidden>
          🎉
        </p>
        <h3 className="font-quicksand text-lg font-black">
          You read <span className="text-primary">{target.focusWord}</span>!
        </h3>
        <div className="flex justify-center gap-1">
          {Array.from({ length: 3 }).map((_, i) => (
            <Star
              key={i}
              className={cn(
                "h-6 w-6",
                i < state.starsEarned
                  ? "fill-amber-400 text-amber-400"
                  : "text-muted-foreground/30",
              )}
            />
          ))}
        </div>
        <p className="text-sm text-muted-foreground">
          Reading stars earned — keep blending every day.
        </p>
      </div>
    );
  }

  return (
    <div
      data-testid="reading-lesson-runner"
      className={cn(
        "space-y-4 rounded-3xl border border-white/[0.08] bg-card/95 p-4 sm:p-5",
        highContrast && "border-foreground/40 bg-background",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-black uppercase tracking-wide text-primary">
            Reading lesson · Step {state.stepIndex + 1}/{READING_LESSON_STEPS.length}
          </p>
          <h3 className="font-quicksand text-base font-black">{step.title}</h3>
          <p className="text-xs text-muted-foreground">{step.instruction}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <Badge variant="secondary" className="font-quicksand text-sm">
            /{target.grapheme}/
          </Badge>
          <button
            type="button"
            className="inline-flex items-center gap-1 text-[10px] text-muted-foreground"
            onClick={() => setSlow((s) => !s)}
            aria-pressed={slow}
          >
            <Snail className="h-3 w-3" />
            {slow ? "Slow on" : "Slow off"}
          </button>
        </div>
      </div>

      <Progress value={lessonProgressPct(state)} className="h-1.5" />

      {step.id === "hear" && (
        <div className="flex flex-col items-center gap-4 py-4">
          <p className="font-quicksand text-5xl font-black">{target.displayLetter}</p>
          <AudioPlayButton
            text={getPhonemeAudioText(target.phonemeKey)}
            size="lg"
            ariaLabel="Hear the sound"
            mode="phonics"
            phonemeKey={target.phonemeKey}
            slow={slow}
          />
          <Button
            type="button"
            className="rounded-full"
            onClick={() => finishStep(true, 1)}
          >
            I heard it <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      )}

      {step.id === "mouth" && (
        <div className="space-y-3">
          <MouthShapeCue grapheme={target.grapheme} />
          <Button
            type="button"
            className="mx-auto flex rounded-full"
            onClick={() => finishStep(true, 1)}
          >
            I watched Amy <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      )}

      {step.id === "repeat" && (
        <div className="flex flex-col items-center gap-4 py-2">
          <AudioPlayButton
            text={getPhonemeAudioText(target.phonemeKey)}
            size="lg"
            ariaLabel="Hear again"
            mode="phonics"
            phonemeKey={target.phonemeKey}
            slow={slow}
          />
          {coachEnabled ? (
            <AiPronunciationCoach
              childId={childId!}
              childName={childName}
              totalAgeMonths={totalAgeMonths}
              expected={target.grapheme}
              targetKind="phoneme"
              showArticulation={false}
              onEvaluation={handleCoachEval}
              onPassed={(ev) => finishStep(ev.correct, 1)}
              onSkip={() => finishStep(true, 1, true)}
            />
          ) : (
            <div className="flex flex-wrap justify-center gap-2">
              <Button
                type="button"
                className="rounded-full"
                onClick={() => finishStep(true, 1)}
              >
                <CheckCircle2 className="mr-1 h-4 w-4" /> I said it
              </Button>
              <Button
                type="button"
                variant="outline"
                className="rounded-full"
                onClick={() => finishStep(true, 1, true)}
              >
                Skip (no mic)
              </Button>
            </div>
          )}
        </div>
      )}

      {step.id === "letter_id" && (
        <div className="space-y-3">
          <p className="text-center text-sm font-semibold">
            Tap the letter for /{target.grapheme}/
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {letterOpts.map((opt) => (
              <button
                key={opt.letter}
                type="button"
                className={cn(
                  PRESS_FEEDBACK,
                  "flex h-16 min-w-[4rem] items-center justify-center rounded-2xl border-2 border-border bg-card font-quicksand text-3xl font-black",
                )}
                onClick={() => {
                  const next = attempts + 1;
                  setAttempts(next);
                  if (opt.isTarget) finishStep(true, next);
                  else if (next >= 2) finishStep(false, next);
                }}
                aria-label={`Letter ${opt.letter}`}
              >
                {opt.letter.length === 1 ? opt.letter.toUpperCase() : opt.letter}
              </button>
            ))}
          </div>
        </div>
      )}

      {step.id === "trace" && (
        <LetterTracePad
          letter={target.displayLetter}
          onComplete={() => finishStep(true, 1)}
        />
      )}

      {step.id === "find_sound" && (
        <SoundPositionGame
          grapheme={target.grapheme}
          position="beginning"
          unlockedWords={
            unlockedWords.length > 0 ? unlockedWords : target.practiceWords
          }
          hideLetters
          seed={target.focusWord.charCodeAt(0)}
          onComplete={(correct, a) => finishStep(correct, a)}
        />
      )}

      {step.id === "beginning" && (
        <SoundPositionGame
          grapheme={target.grapheme}
          position="beginning"
          unlockedWords={
            unlockedWords.length > 0 ? unlockedWords : target.practiceWords
          }
          seed={target.focusWord.charCodeAt(0) + 3}
          onComplete={(correct, a) => finishStep(correct, a)}
        />
      )}

      {step.id === "ending" && (
        <SoundPositionGame
          grapheme={
            // Prefer ending consonant from focus word when target is a vowel
            "aeiou".includes(target.grapheme)
              ? target.focusWord.slice(-1)
              : target.grapheme
          }
          position="ending"
          unlockedWords={
            unlockedWords.length > 0 ? unlockedWords : target.practiceWords
          }
          seed={target.focusWord.charCodeAt(0) + 7}
          onComplete={(correct, a) => finishStep(correct, a)}
        />
      )}

      {step.id === "build_word" && (
        <div className="space-y-4">
          <p className="text-center text-sm">
            Build{" "}
            <span className="font-bold">
              {emojiForWord(target.focusWord)} {target.focusWord}
            </span>
          </p>
          <BuildTheWord
            word={target.focusWord}
            onComplete={() => finishStep(true, 1)}
          />
          <KaraokeBlendRound
            word={target.focusWord}
            slowMode={slow}
            onComplete={() => {
              /* blend reinforcement while building */
            }}
          />
        </div>
      )}

      {step.id === "read_independent" && (
        <div className="space-y-4">
          {!showSegmentBonus ? (
            <>
              <p
                className={cn(
                  "text-center font-quicksand text-5xl font-black tracking-widest",
                  highContrast && "underline decoration-2",
                )}
                lang="en"
              >
                {target.focusWord}
              </p>
              {coachEnabled ? (
                <AiPronunciationCoach
                  childId={childId!}
                  childName={childName}
                  totalAgeMonths={totalAgeMonths}
                  expected={target.focusWord}
                  targetKind="word"
                  showArticulation={false}
                  onEvaluation={handleCoachEval}
                  onPassed={(ev) => finishStep(ev.correct, 1)}
                  onSkip={() => finishStep(true, 1, true)}
                />
              ) : (
                <div className="flex flex-wrap justify-center gap-2">
                  <Button
                    type="button"
                    className="rounded-full"
                    onClick={() => finishStep(true, 1)}
                  >
                    I read it!
                  </Button>
                </div>
              )}
              <div className="flex flex-wrap justify-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full"
                  onClick={() => setShowSegmentBonus(true)}
                >
                  Need a hint — segment first
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="rounded-full text-xs"
                  onClick={() => finishStep(false, 1)}
                >
                  Hear the word (practice)
                </Button>
              </div>
            </>
          ) : (
            <SegmentWordRound
              word={target.focusWord}
              onComplete={(correct, a) => finishStep(correct, a)}
            />
          )}
        </div>
      )}

      {onCancel && (
        <button
          type="button"
          className="mx-auto block min-h-12 px-4 text-[11px] text-muted-foreground underline"
          onClick={() => {
            if (typeof childId === "number" && childId > 0 && !state.complete) {
              saveLessonResumeForce(childId, state);
            }
            onCancel();
          }}
        >
          Exit lesson
        </button>
      )}
    </div>
  );
}
