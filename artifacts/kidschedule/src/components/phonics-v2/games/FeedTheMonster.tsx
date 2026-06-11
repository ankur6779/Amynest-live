import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getCvcWordEntry } from "@workspace/phonics-sounds";
import { AudioPlayButton } from "@/components/audio-play-button";
import { motion, AnimatePresence } from "framer-motion";

type FeedTheMonsterProps = {
  targetWord: string;
  distractors: string[];
  onCorrect: () => void;
  onRetry?: () => void;
};

export function FeedTheMonster({
  targetWord,
  distractors,
  onCorrect,
  onRetry,
}: FeedTheMonsterProps) {
  const [picked, setPicked] = useState<string | null>(null);
  const [celebrate, setCelebrate] = useState(false);

  const options = useMemo(() => {
    const all = [targetWord, ...distractors].filter(Boolean);
    return [...new Set(all.map((w) => w.toLowerCase()))].sort(() => Math.random() - 0.5);
  }, [targetWord, distractors]);

  const handlePick = (word: string) => {
    setPicked(word);
    if (word === targetWord.toLowerCase()) {
      setCelebrate(true);
      onCorrect();
    } else {
      onRetry?.();
    }
  };

  return (
    <div data-testid="feed-the-monster" className="space-y-4 text-center">
      <div className="text-5xl">{celebrate ? "🎉" : "👾"}</div>
      <p className="text-sm font-bold">
        Feed the monster: <span className="text-primary uppercase">{targetWord}</span>
      </p>
      <AudioPlayButton
        text={targetWord}
        mode="phonics"
        cvcWordKey={targetWord}
        size="sm"
        variant="violet"
        ariaLabel={`Hear ${targetWord}`}
      />
      <div className="grid grid-cols-3 gap-2">
        {options.map((w) => {
          const isTarget = w === targetWord.toLowerCase();
          const showResult = picked === w;
          return (
            <Button
              key={w}
              type="button"
              variant="outline"
              disabled={celebrate}
              className={cn(
                "rounded-2xl h-14 font-quicksand font-bold text-lg capitalize",
                showResult && isTarget && "border-emerald-500 bg-emerald-500/10",
                showResult && !isTarget && picked === w && "border-amber-400",
              )}
              onClick={() => handlePick(w)}
            >
              {w}
            </Button>
          );
        })}
      </div>
      <AnimatePresence>
        {picked && picked !== targetWord.toLowerCase() && (
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-xs text-muted-foreground"
          >
            Almost! Listen again and pick {targetWord}.
          </motion.p>
        )}
      </AnimatePresence>
      {celebrate && (
        <p className="text-sm font-bold text-emerald-600">Yum! Great reading!</p>
      )}
      {!getCvcWordEntry(targetWord) && (
        <p className="text-[10px] text-muted-foreground">Using word audio catalog</p>
      )}
    </div>
  );
}
