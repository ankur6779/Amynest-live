import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getFamilyForWord } from "@/lib/phonics-v2/content/word-families";
import type { WordFamilyId } from "@/lib/phonics-v2/content/word-families";

type FindTheFamilyProps = {
  targetFamilyId: WordFamilyId;
  options: string[];
  onCorrect: () => void;
};

export function FindTheFamily({
  targetFamilyId,
  options,
  onCorrect,
}: FindTheFamilyProps) {
  const [picked, setPicked] = useState<string | null>(null);
  const family = getFamilyForWord(
    options.find((w) => getFamilyForWord(w)?.id === targetFamilyId) ?? "cat",
  );
  const suffix = family?.suffix ?? `-${targetFamilyId}`;

  const handlePick = (word: string) => {
    setPicked(word);
    const f = getFamilyForWord(word);
    if (f?.id === targetFamilyId) onCorrect();
  };

  return (
    <div data-testid="find-the-family" className="space-y-4 text-center">
      <p className="text-sm font-bold">
        Which word belongs to <span className="text-primary">{suffix}</span>?
      </p>
      <div className="grid grid-cols-3 gap-2">
        {options.map((w) => {
          const f = getFamilyForWord(w);
          const correct = f?.id === targetFamilyId;
          const show = picked === w;
          return (
            <Button
              key={w}
              type="button"
              variant="outline"
              className={cn(
                "rounded-2xl h-14 font-quicksand font-bold capitalize",
                show && correct && "border-emerald-500 bg-emerald-500/10",
                show && !correct && "border-amber-400",
              )}
              onClick={() => handlePick(w)}
            >
              {w}
            </Button>
          );
        })}
      </div>
      {picked && getFamilyForWord(picked)?.id !== targetFamilyId && (
        <p className="text-xs text-muted-foreground">
          Listen to the ending — {suffix} words rhyme!
        </p>
      )}
      {picked && getFamilyForWord(picked)?.id === targetFamilyId && (
        <p className="text-xs font-bold text-emerald-600">Yes! Same family!</p>
      )}
    </div>
  );
}
