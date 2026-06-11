import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FeedTheMonster } from "./FeedTheMonster";
import { BuildTheWord } from "./BuildTheWord";
import { FindTheFamily } from "./FindTheFamily";
import { Gamepad2 } from "lucide-react";

type GameId = "feed" | "build" | "family";

type PhonicsGamesHubProps = {
  practiceWord?: string;
  onGameComplete?: (gameId: GameId) => void;
};

export function PhonicsGamesHub({
  practiceWord = "cat",
  onGameComplete,
}: PhonicsGamesHubProps) {
  const [active, setActive] = useState<GameId>("feed");

  const distractors = useMemo(() => {
    const pool = ["dog", "pig", "sun", "pen", "bus"];
    return pool.filter((w) => w !== practiceWord).slice(0, 2);
  }, [practiceWord]);

  const familyOptions = useMemo(() => {
    if (practiceWord.endsWith("at") || ["cat", "bat", "hat"].includes(practiceWord)) {
      return ["cat", "dog", "pig"];
    }
    return [practiceWord, "dog", "pig"];
  }, [practiceWord]);

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

        {active === "feed" && (
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
        {active === "family" && (
          <FindTheFamily
            targetFamilyId={
              practiceWord.endsWith("at") || practiceWord === "cat" ? "at" : "og"
            }
            options={familyOptions}
            onCorrect={() => onGameComplete?.("family")}
          />
        )}
      </CardContent>
    </Card>
  );
}
