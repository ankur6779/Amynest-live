import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { buildSegmentChoices } from "@/lib/phonics-v3/reading-lesson-engine";
import { PRESS_FEEDBACK } from "@/lib/experience-system";

type SegmentWordRoundProps = {
  word: string;
  /** When true, show the word first then ask for sounds (classic segmenting). */
  revealWord?: boolean;
  onComplete: (correct: boolean, attempts: number) => void;
};

/**
 * Segmenting engine — child selects letters/sounds in order for a spoken/shown word.
 */
export function SegmentWordRound({
  word,
  revealWord = true,
  onComplete,
}: SegmentWordRoundProps) {
  const target = word.trim().toLowerCase();
  const { displayLetters, distractors } = useMemo(
    () => buildSegmentChoices(target),
    [target],
  );
  const pool = useMemo(() => {
    const letters = [...displayLetters, ...distractors];
    return letters.sort(() => Math.random() - 0.5);
  }, [displayLetters, distractors]);

  const [built, setBuilt] = useState<string[]>([]);
  const [used, setUsed] = useState<Set<number>>(new Set());
  const [attempts, setAttempts] = useState(0);
  const [done, setDone] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const place = (letter: string, idx: number) => {
    if (done || used.has(idx)) return;
    const next = [...built, letter];
    setBuilt(next);
    setUsed(new Set([...used, idx]));
    const expected = displayLetters[next.length - 1];
    if (letter !== expected) {
      const nextAttempts = attempts + 1;
      setAttempts(nextAttempts);
      setFeedback(`Almost — try the next sound for "${target}".`);
      setBuilt([]);
      setUsed(new Set());
      if (nextAttempts >= 3) {
        setDone(true);
        onComplete(false, nextAttempts);
      }
      return;
    }
    setFeedback(null);
    if (next.length === displayLetters.length) {
      setDone(true);
      onComplete(true, attempts + 1);
    }
  };

  return (
    <div data-testid="segment-word-round" className="space-y-4">
      <p className="text-center font-quicksand text-base font-bold">
        Break the word into sounds
      </p>
      {revealWord && (
        <p className="text-center font-quicksand text-3xl font-black tracking-wide">
          {target}
        </p>
      )}
      <div className="flex justify-center gap-2">
        {displayLetters.map((_, i) => (
          <div
            key={i}
            className={cn(
              "flex h-12 w-12 items-center justify-center rounded-xl border-2 border-dashed font-quicksand text-xl font-bold",
              built[i]
                ? "border-primary bg-primary/10"
                : "border-muted-foreground/30",
            )}
          >
            {built[i] ?? ""}
          </div>
        ))}
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {pool.map((letter, idx) => (
          <button
            key={`${letter}-${idx}`}
            type="button"
            disabled={done || used.has(idx)}
            onClick={() => place(letter, idx)}
            className={cn(
              PRESS_FEEDBACK,
              "h-14 min-w-[3rem] rounded-2xl border-2 border-border bg-card px-3 font-quicksand text-2xl font-bold",
              used.has(idx) && "opacity-30",
            )}
            aria-label={`Sound ${letter}`}
          >
            {letter}
          </button>
        ))}
      </div>
      {feedback && (
        <p className="text-center text-xs text-amber-700 dark:text-amber-300">
          {feedback}
        </p>
      )}
      {done && (
        <Button type="button" size="sm" className="mx-auto flex rounded-full" disabled>
          {built.join("") === target ? "Perfect segments!" : "Let's practise again later"}
        </Button>
      )}
    </div>
  );
}
