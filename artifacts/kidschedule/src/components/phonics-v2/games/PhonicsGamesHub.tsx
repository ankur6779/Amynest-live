import { useMemo, useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FeedTheMonster } from "./FeedTheMonster";
import { BuildTheWord } from "./BuildTheWord";
import { FindTheFamily } from "./FindTheFamily";
import { Gamepad2 } from "lucide-react";
import { getFamilyForWord } from "@/lib/phonics-v2/content/word-families";
import { prefetchPhonicsGameWords } from "@/lib/phonics-v2/audio-prefetch";
import type { WordFamilyId } from "@/lib/phonics-v2/content/word-families";

type GameId = "feed" | "build" | "family";

type PhonicsGamesHubProps = {
  practiceWords: string[];
  onGameComplete?: (gameId: GameId) => void;
};

export function PhonicsGamesHub({
  practiceWords,
  onGameComplete,
}: PhonicsGamesHubProps) {
  const [active, setActive] = useState<GameId>("feed");

  const practiceWord = practiceWords[0] ?? "";

  const distractors = useMemo(
    () => practiceWords.filter((w) => w !== practiceWord).slice(0, 2),
    [practiceWords, practiceWord],
  );

  const familyOptions = useMemo(() => {
    const sameFamily = practiceWords.filter((w) => {
      const fam = getFamilyForWord(w);
      const targetFam = getFamilyForWord(practiceWord);
      return fam && targetFam && fam.id === targetFam.id;
    });
    const pool = sameFamily.length >= 2 ? sameFamily : practiceWords;
    return pool.slice(0, 3);
  }, [practiceWords, practiceWord]);

  const targetFamilyId = useMemo((): WordFamilyId => {
    return getFamilyForWord(practiceWord)?.id ?? "at";
  }, [practiceWord]);

  useEffect(() => {
    prefetchPhonicsGameWords(practiceWords);
  }, [practiceWords]);

  if (practiceWords.length === 0 || !practiceWord) {
    return null;
  }

  return (
    <Card
      id="phonics-v2-games"
      data-testid="phonics-games-hub"
      className="rounded-3xl border border-white/[0.08] bg-card/90"
    >
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Gamepad2 className="h-5 w-5 text-primary" />
          <h3 className="font-quicksand text-base font-bold">Phonics Games</h3>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-4">
          {(
            [
              ["feed", "Feed Monster"],
              ["build", "Build Word"],
              ["family", "Find Family"],
            ] as const
          ).map(([id, label]) => (
            <Button
              key={id}
              type="button"
              size="sm"
              variant={active === id ? "default" : "outline"}
              className="rounded-full text-[10px] font-bold"
              onClick={() => setActive(id)}
            >
              {label}
            </Button>
          ))}
        </div>

        {active === "feed" && distractors.length >= 1 && (
          <FeedTheMonster
            targetWord={practiceWord}
            distractors={distractors}
            onCorrect={() => onGameComplete?.("feed")}
          />
        )}
        {active === "build" && (
          <BuildTheWord
            word={practiceWord}
            onComplete={() => onGameComplete?.("build")}
          />
        )}
        {active === "family" && familyOptions.length >= 2 && (
          <FindTheFamily
            targetFamilyId={targetFamilyId}
            options={familyOptions}
            onCorrect={() => onGameComplete?.("family")}
          />
        )}
      </CardContent>
    </Card>
  );
}
