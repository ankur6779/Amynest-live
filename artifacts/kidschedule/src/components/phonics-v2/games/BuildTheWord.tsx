import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getCvcWordEntry } from "@workspace/phonics-sounds";
import { KaraokeBlendRound } from "../KaraokeBlendRound";
import { motion } from "framer-motion";

type BuildTheWordProps = {
  word: string;
  onComplete: () => void;
};

export function BuildTheWord({ word, onComplete }: BuildTheWordProps) {
  const entry = getCvcWordEntry(word);
  const letters = (entry ? word : word).split("");
  const [slots, setSlots] = useState<(string | null)[]>([null, null, null]);
  const [pool, setPool] = useState(() => [...letters].sort(() => Math.random() - 0.5));
  const [done, setDone] = useState(false);

  const placeLetter = useCallback(
    (letter: string, fromPoolIdx: number) => {
      const emptyIdx = slots.findIndex((s) => s === null);
      if (emptyIdx < 0) return;
      const next = [...slots];
      next[emptyIdx] = letter;
      setSlots(next);
      setPool((p) => p.filter((_, i) => i !== fromPoolIdx));
      const built = next.join("").toLowerCase();
      if (built === word.toLowerCase() && !next.includes(null)) {
        setDone(true);
        onComplete();
      }
    },
    [slots, word, onComplete],
  );

  const reset = () => {
    setSlots([null, null, null]);
    setPool([...letters].sort(() => Math.random() - 0.5));
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
