import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  WORD_FAMILIES,
  splitOnsetRime,
  type WordFamilyId,
} from "@/lib/phonics-v2/content/word-families";
import type { PhonicsV2FamilyProgress } from "@/lib/phonics-v2/family-progress";
import { KaraokeBlendRound } from "./KaraokeBlendRound";
import { Award, ChevronRight } from "lucide-react";
import { PRESS_FEEDBACK } from "@/lib/experience-system";

type WordFamilyExplorerProps = {
  familyProgress: PhonicsV2FamilyProgress;
  onWordPractice: (familyId: WordFamilyId, word: string, mastered?: boolean) => void;
};

function FamilyWordTile({
  word,
  emoji,
  rime,
  onSelect,
}: {
  word: string;
  emoji: string;
  rime: string;
  onSelect: () => void;
}) {
  const { onset, rime: r } = splitOnsetRime(word, rime);
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "rounded-2xl border border-white/10 bg-card/90 p-4 text-center transition-all",
        PRESS_FEEDBACK,
        "hover:border-primary/30 hover:ring-1 hover:ring-primary/20",
      )}
    >
      <span className="text-2xl block mb-2">{emoji}</span>
      <p className="font-quicksand text-xl font-bold tracking-wide">
        <span className="text-foreground">{onset}</span>
        <span className="text-primary underline decoration-primary/50 decoration-2 underline-offset-4">
          {r}
        </span>
      </p>
    </button>
  );
}

export function WordFamilyExplorer({
  familyProgress,
  onWordPractice,
}: WordFamilyExplorerProps) {
  const [activeFamily, setActiveFamily] = useState<WordFamilyId>("at");
  const [blendWord, setBlendWord] = useState<string | null>(null);

  const family = WORD_FAMILIES.find((f) => f.id === activeFamily)!;
  const fp = familyProgress[activeFamily];

  return (
    <div id="phonics-v2-families" data-testid="word-family-explorer" className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {WORD_FAMILIES.map((f) => {
          const status = familyProgress[f.id]?.status ?? "not_started";
          return (
            <Button
              key={f.id}
              type="button"
              size="sm"
              variant={activeFamily === f.id ? "default" : "outline"}
              className="rounded-full text-xs font-bold"
              onClick={() => {
                setActiveFamily(f.id);
                setBlendWord(null);
              }}
            >
              {f.suffix}
              {status === "mastered" && " ✓"}
            </Button>
          );
        })}
      </div>

      <Card className="rounded-3xl border border-white/[0.08] bg-card/90 overflow-hidden">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h3 className="font-quicksand text-lg font-bold flex items-center gap-2">
                {family.badgeEmoji} {family.title}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Same ending sound: <strong className="text-primary">{family.suffix}</strong>
              </p>
            </div>
            <Badge
              variant={
                fp?.status === "mastered"
                  ? "default"
                  : fp?.status === "practicing"
                    ? "secondary"
                    : "outline"
              }
              className="shrink-0 text-[10px]"
            >
              {fp?.status === "mastered"
                ? family.badgeName
                : fp?.status === "practicing"
                  ? "Practicing"
                  : "Start"}
            </Badge>
          </div>

          {fp?.badgeEarned && (
            <div className="flex items-center gap-2 mb-4 rounded-xl bg-amber-500/10 border border-amber-500/20 px-3 py-2">
              <Award className="h-4 w-4 text-amber-600" />
              <span className="text-xs font-bold text-amber-700 dark:text-amber-300">
                Badge earned: {family.badgeName}
              </span>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
            {family.words.map((w) => (
              <FamilyWordTile
                key={w.word}
                word={w.word}
                emoji={w.emoji}
                rime={family.rime}
                onSelect={() => {
                  setBlendWord(w.word);
                  onWordPractice(family.id, w.word);
                }}
              />
            ))}
          </div>

          {blendWord && (
            <div className="border-t border-border pt-4 mt-2">
              <p className="text-xs font-semibold text-muted-foreground mb-3 flex items-center gap-1">
                Karaoke blend <ChevronRight className="h-3 w-3" /> {blendWord}
              </p>
              <KaraokeBlendRound
                word={blendWord}
                emoji={family.words.find((w) => w.word === blendWord)?.emoji}
                autoStart
                onComplete={() =>
                  onWordPractice(family.id, blendWord, true)
                }
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
