import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { KaraokeBlendRound } from "../KaraokeBlendRound";
import { motion } from "framer-motion";

type BuildTheWordProps = {
  word: string;
  onComplete: () => void;
};

function emptySlots(count: number): (string | null)[] {
  return Array.from({ length: count }, () => null);
}

function shuffledLetters(word: string): string[] {
  return [...word.trim().toLowerCase()].sort(() => Math.random() - 0.5);
}

export function BuildTheWord({ word, onComplete }: BuildTheWordProps) {
  const target = word.trim().toLowerCase();
  const letters = useMemo(() => [...target], [target]);
  const slotCount = letters.length;

  const [slots, setSlots] = useState<(string | null)[]>(() => emptySlots(slotCount));
  const [pool, setPool] = useState(() => shuffledLetters(target));
  const [done, setDone] = useState(false);

  useEffect(() => {
    setSlots(emptySlots(slotCount));
    setPool(shuffledLetters(target));
    setDone(false);
  }, [target, slotCount]);

  const placeLetter = useCallback(
    (letter: string, fromPoolIdx: number) => {
      const emptyIdx = slots.findIndex((s) => s === null);
      if (emptyIdx < 0) return;
      const next = [...slots];
      next[emptyIdx] = letter;
      setSlots(next);
      setPool((p) => p.filter((_, i) => i !== fromPoolIdx));
      const built = next.join("");
      if (built === target && !next.includes(null)) {
        setDone(true);
        onComplete();
      }
    },
    [slots, target, onComplete],
  );

  const reset = () => {
    setSlots(emptySlots(slotCount));
    setPool(shuffledLetters(target));
    setDone(false);
  };

  return (
    <div data-testid="build-the-word" className="space-y-4">
      <p className="text-sm font-bold text-center">Build the word</p>
      <div className="flex justify-center gap-2">
        {slots.map((s, i) => (
          <div
            key={`slot-${i}`}
            className={cn(
              "h-14 w-12 rounded-xl border-2 border-dashed flex items-center justify-center font-quicksand text-2xl font-bold",
              s ? "border-primary bg-primary/10" : "border-muted-foreground/30",
            )}
          >
            {s ?? ""}
          </div>
        ))}
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {pool.map((l, i) => (
          <motion.button
            key={`${l}-${i}`}
            type="button"
            disabled={done}
            whileTap={{ scale: 0.9 }}
            className="h-12 w-12 rounded-xl bg-card border border-border font-quicksand text-xl font-bold shadow-sm"
            onClick={() => placeLetter(l, i)}
          >
            {l}
          </motion.button>
        ))}
      </div>
      {done && (
        <div className="border-t border-border pt-4">
          <p className="text-xs text-center text-emerald-600 font-bold mb-2">
            Perfect! Now hear the blend:
          </p>
          <KaraokeBlendRound word={word} autoStart onComplete={onComplete} />
        </div>
      )}
      {!done && (
        <Button type="button" size="sm" variant="ghost" className="w-full" onClick={reset}>
          Reset
        </Button>
      )}
    </div>
  );
}
