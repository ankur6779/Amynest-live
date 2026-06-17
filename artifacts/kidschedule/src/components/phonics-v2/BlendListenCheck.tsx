import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AudioPlayButton } from "@/components/audio-play-button";
import { Ear } from "lucide-react";

type BlendListenCheckProps = {
  /** Target word the child should recognise by ear (no mic needed). */
  word: string;
  /** Candidate words to build distractors from (target is added automatically). */
  options: string[];
  onOutcome?: (result: { passed: boolean; confidence: number }) => void;
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/**
 * Non-mic blending check — Amy says the word, the child taps the word they heard.
 * Replaces voice recording so no microphone permission is ever required.
 */
export function BlendListenCheck({ word, options, onOutcome }: BlendListenCheckProps) {
  const target = word.trim().toLowerCase();

  const choices = useMemo(() => {
    const distractors = options
      .map((o) => o.trim().toLowerCase())
      .filter((o) => o && o !== target);
    const pool = [target, ...shuffle([...new Set(distractors)]).slice(0, 2)];
    return shuffle([...new Set(pool)]);
  }, [target, options]);

  const [picked, setPicked] = useState<string | null>(null);
  const solved = picked === target;

  useEffect(() => {
    setPicked(null);
  }, [target]);

  const handlePick = (choice: string) => {
    if (solved) return;
    setPicked(choice);
    const passed = choice === target;
    onOutcome?.({ passed, confidence: passed ? 1 : 0.3 });
  };

  return (
    <div data-testid="blend-listen-check" className="rounded-2xl border border-border p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Ear className="h-4 w-4 text-primary" />
        <p className="text-sm font-bold">Listen &amp; choose the word you hear</p>
      </div>

      <div className="flex justify-center">
        <AudioPlayButton
          text={target}
          mode="phonics"
          cvcWordKey={target}
          size="lg"
          variant="violet"
          ariaLabel={`Play the word ${target}`}
        />
      </div>

      <div className="grid grid-cols-3 gap-2">
        {choices.map((choice) => {
          const isCorrect = choice === target;
          const reveal = picked === choice || (solved && isCorrect);
          return (
            <Button
              key={choice}
              type="button"
              variant="outline"
              className={cn(
                "rounded-2xl h-14 font-quicksand font-bold capitalize",
                reveal && isCorrect && "border-emerald-500 bg-emerald-500/10",
                reveal && !isCorrect && "border-amber-400 bg-amber-400/10",
              )}
              onClick={() => handlePick(choice)}
            >
              {choice}
            </Button>
          );
        })}
      </div>

      {picked && solved && (
        <p className="text-xs font-bold text-emerald-600 text-center">🌟 Yes! You heard it!</p>
      )}
      {picked && !solved && (
        <p className="text-xs text-muted-foreground text-center">
          🎯 Tap 🔊 again and listen carefully.
        </p>
      )}
    </div>
  );
}
