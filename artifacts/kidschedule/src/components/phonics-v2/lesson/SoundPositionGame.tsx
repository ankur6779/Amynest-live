import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  buildSoundPositionOptions,
  type SoundPictureOption,
} from "@/lib/phonics-v3/reading-lesson-engine";
import { PRESS_FEEDBACK } from "@/lib/experience-system";

type SoundPositionGameProps = {
  grapheme: string;
  position: "beginning" | "ending";
  unlockedWords: string[];
  /** When true, hide letter spellings (phonemic awareness mode). */
  hideLetters?: boolean;
  seed?: number;
  onComplete: (correct: boolean, attempts: number) => void;
};

export function SoundPositionGame({
  grapheme,
  position,
  unlockedWords,
  hideLetters = false,
  seed = 1,
  onComplete,
}: SoundPositionGameProps) {
  const options = useMemo(
    () => buildSoundPositionOptions(grapheme, position, unlockedWords, seed),
    [grapheme, position, unlockedWords, seed],
  );
  const [attempts, setAttempts] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [resolved, setResolved] = useState(false);

  const prompt =
    position === "beginning"
      ? `Which word starts with /${grapheme}/?`
      : `Which word ends with /${grapheme}/?`;

  const choose = (opt: SoundPictureOption) => {
    if (resolved) return;
    const nextAttempts = attempts + 1;
    setAttempts(nextAttempts);
    setPicked(opt.word);
    if (opt.isTarget) {
      setResolved(true);
      onComplete(true, nextAttempts);
    } else if (nextAttempts >= 2) {
      setResolved(true);
      onComplete(false, nextAttempts);
    }
  };

  return (
    <div data-testid={`sound-position-${position}`} className="space-y-4">
      <p className="text-center font-quicksand text-base font-bold">{prompt}</p>
      {hideLetters && (
        <p className="text-center text-[11px] text-muted-foreground">
          Listen in your mind — no letters shown yet.
        </p>
      )}
      <div className="grid grid-cols-3 gap-2">
        {options.map((opt) => {
          const showFeedback = resolved || picked === opt.word;
          const ok = opt.isTarget && showFeedback && (resolved || picked === opt.word);
          const bad = !opt.isTarget && picked === opt.word;
          return (
            <button
              key={opt.word}
              type="button"
              disabled={resolved}
              onClick={() => choose(opt)}
              className={cn(
                PRESS_FEEDBACK,
                "flex min-h-[88px] flex-col items-center justify-center gap-1 rounded-2xl border-2 px-2 py-3 text-center transition-colors",
                ok && "border-emerald-500 bg-emerald-500/10",
                bad && "border-rose-400 bg-rose-500/10",
                !ok && !bad && "border-border bg-card hover:border-primary/40",
              )}
              aria-label={hideLetters ? `Picture option ${opt.emoji}` : opt.word}
            >
              <span className="text-3xl" aria-hidden>
                {opt.emoji}
              </span>
              {!hideLetters && (
                <span className="font-quicksand text-sm font-bold">{opt.word}</span>
              )}
            </button>
          );
        })}
      </div>
      {resolved && !options.find((o) => o.word === picked)?.isTarget && (
        <p className="text-center text-xs text-muted-foreground">
          Nice try! The answer was{" "}
          <strong>{options.find((o) => o.isTarget)?.word}</strong>.
        </p>
      )}
      {resolved && (
        <Button
          type="button"
          className="mx-auto flex rounded-full"
          size="sm"
          onClick={() => {
            /* parent already got onComplete */
          }}
          disabled
        >
          Great listening!
        </Button>
      )}
    </div>
  );
}
