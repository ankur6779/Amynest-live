import { useState } from "react";
import { BookOpen, ChevronDown, ChevronUp, Package } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AudioPlayButton } from "@/components/audio-play-button";
import { cn } from "@/lib/utils";
import type { DisplayPhonicsItem, PhonicsProgressMap } from "@/hooks/use-phonics-data";
import type { PhonicsLevel } from "@/lib/phonics-content";
import { sanitizeDisplayPhonicsItems } from "@/lib/phonics-item-guards";
import {
  phonicsTilePlaybackText,
  phonicsTileCvcWordKey,
  phonicsTileUsesPhonicsMode,
} from "@/lib/phonics-tile-playback";
import {
  buildWeakSoundsProfile,
  classifyReviewTier,
  resolveAdaptiveDifficulty,
  reviewTierLabel,
  sortItemsForSmartReview,
} from "@/lib/phonics-journey-adaptive";

type PackKind = "sounds" | "letters" | "words" | "reading";

type LearningPack = {
  id: PackKind;
  title: string;
  subtitle: string;
  emoji: string;
  items: DisplayPhonicsItem[];
};

const PACK_META: Record<
  PackKind,
  { title: string; subtitle: string; emoji: string; types: DisplayPhonicsItem["type"][] }
> = {
  sounds: {
    title: "Sound Discovery Pack",
    subtitle: "Hear and recognise everyday sounds",
    emoji: "👂",
    types: ["sound"],
  },
  letters: {
    title: "Letter Sounds Pack",
    subtitle: "Connect each letter to its sound",
    emoji: "🔤",
    types: ["letter"],
  },
  words: {
    title: "Word Building Pack",
    subtitle: "Blend sounds into readable words",
    emoji: "🧩",
    types: ["word"],
  },
  reading: {
    title: "Reading Together Pack",
    subtitle: "Sentences and stories to read aloud",
    emoji: "📖",
    types: ["sentence", "story"],
  },
};

function groupIntoPacks(items: DisplayPhonicsItem[]): LearningPack[] {
  const buckets: Record<PackKind, DisplayPhonicsItem[]> = {
    sounds: [],
    letters: [],
    words: [],
    reading: [],
  };

  for (const item of sanitizeDisplayPhonicsItems(items)) {
    if (item.type === "sound") buckets.sounds.push(item);
    else if (item.type === "letter") buckets.letters.push(item);
    else if (item.type === "word") buckets.words.push(item);
    else buckets.reading.push(item);
  }

  return (Object.keys(PACK_META) as PackKind[])
    .filter((kind) => buckets[kind].length > 0)
    .map((kind) => ({
      id: kind,
      title: PACK_META[kind].title,
      subtitle: PACK_META[kind].subtitle,
      emoji: PACK_META[kind].emoji,
      items: buckets[kind],
    }));
}

function practicePlaybackText(it: DisplayPhonicsItem): string {
  return phonicsTilePlaybackText(it);
}

export type PhonicsLearningPacksProps = {
  level: PhonicsLevel;
  items: DisplayPhonicsItem[];
  progress: PhonicsProgressMap;
  recordPlay: (id: string, contentId?: number) => void;
  toggleMastered?: (id: string, contentId?: number) => void;
  lockedCount?: number;
};

export function PhonicsLearningPacks({
  level,
  items,
  progress,
  recordPlay,
  toggleMastered,
  lockedCount = 0,
}: PhonicsLearningPacksProps) {
  const packs = groupIntoPacks(items);
  const [expandedPack, setExpandedPack] = useState<string | null>(
    packs[0]?.id ?? null,
  );
  const [highlightId, setHighlightId] = useState<string | null>(null);

  const weakProfile = buildWeakSoundsProfile([], progress, items);
  const practicedCount = Object.keys(progress.practiced).length;
  const masteredCount = Object.keys(progress.mastered).length;
  const masteryPct =
    practicedCount > 0 ? Math.round((masteredCount / practicedCount) * 100) : 0;
  const adaptiveMode = resolveAdaptiveDifficulty(masteryPct, masteryPct);

  if (packs.length === 0) {
    return (
      <Card data-testid="phonics-practice-sounds" className="rounded-3xl border-border bg-card">
        <CardContent className="p-5 text-sm text-muted-foreground">
          Loading practice packs…
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3" data-testid="phonics-practice-sounds">
      <div className="flex items-center gap-2 px-1">
        <Package className="h-4 w-4 text-primary" />
        <h3 className="font-quicksand text-sm font-bold text-foreground">Learning packs</h3>
        <Badge variant="secondary" className="ml-auto text-[10px]">
          {items.length} items
          {lockedCount > 0 ? ` · +${lockedCount} 🔒` : ""}
        </Badge>
      </div>

      {packs.map((pack) => {
        const isOpen = expandedPack === pack.id;
        const masteredInPack = pack.items.filter((i) => progress.mastered[i.id]).length;
        const packPct =
          pack.items.length > 0
            ? Math.round((masteredInPack / pack.items.length) * 100)
            : 0;
        const visibleItems = sortItemsForSmartReview(
          pack.items,
          progress,
          weakProfile.sounds,
          adaptiveMode,
        );

        return (
          <Card
            key={pack.id}
            data-testid={`phonics-pack-${pack.id}`}
            className={cn(
              "overflow-hidden rounded-3xl border border-white/[0.06] bg-card/90 shadow-[0_4px_24px_-10px_rgba(0,0,0,0.35)] transition-all duration-300",
              isOpen && "ring-1 ring-primary/15",
            )}
          >
            <CardContent className="p-0">
              <button
                type="button"
                className="flex w-full items-center gap-3 p-4 text-left"
                onClick={() => setExpandedPack(isOpen ? null : pack.id)}
                aria-expanded={isOpen}
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-muted text-xl">
                  {pack.emoji}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-quicksand text-sm font-bold text-foreground">
                    {pack.title}
                  </p>
                  <p className="text-[11px] text-muted-foreground">{pack.subtitle}</p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${packPct}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-bold text-muted-foreground">
                      {masteredInPack}/{pack.items.length}
                    </span>
                  </div>
                </div>
                {isOpen ? (
                  <ChevronUp className="h-5 w-5 shrink-0 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground" />
                )}
              </button>

              {isOpen && (
                <div className="border-t border-border px-4 pb-4 pt-2">
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {visibleItems.map((it, idx) => {
                      const mastered = !!progress.mastered[it.id];
                      const count = progress.practiced[it.id] ?? 0;
                      const reviewTier = classifyReviewTier(it, progress);
                      const tierLabel = reviewTierLabel(reviewTier);
                      const nextItem = visibleItems[idx + 1];
                      const prefetchNextText = nextItem
                        ? practicePlaybackText(nextItem)
                        : undefined;
                      const playbackText = practicePlaybackText(it);
                      const isActive = highlightId === it.id;

                      const canMaster = count > 0 || mastered;

                      return (
                        <div
                          key={it.id}
                          data-testid={`phonics-tile-${it.id}`}
                          className={cn(
                            "relative rounded-2xl border bg-card/80 p-3 transition-all duration-300",
                            mastered
                              ? "border-emerald-500/35 ring-1 ring-emerald-500/20"
                              : "border-white/[0.06] hover:border-primary/25",
                            isActive && "ring-2 ring-violet-500/60",
                          )}
                        >
                          <div className="flex items-center gap-2">
                            {it.emoji && (
                              <span className="text-xl shrink-0">{it.emoji}</span>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="font-quicksand text-base font-bold text-foreground">
                                {it.symbol}
                              </p>
                              {mastered && (
                                <div data-testid={`phonics-mastered-${it.id}`}>
                                  <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                                    ✓ Mastered
                                    {count > 0
                                      ? ` after ${count} successful read${count !== 1 ? "s" : ""}`
                                      : ""}
                                  </p>
                                  <p className="text-[9px] font-bold text-amber-600/90">
                                    +10 Reading Points
                                  </p>
                                </div>
                              )}
                              {!mastered && tierLabel && (
                                <p
                                  className={cn(
                                    "text-[9px] font-bold uppercase tracking-wide",
                                    reviewTier === "needs_review"
                                      ? "text-amber-600 dark:text-amber-400"
                                      : "text-primary/80",
                                  )}
                                >
                                  {tierLabel}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="mt-2 flex items-center justify-between gap-1">
                            <AudioPlayButton
                              text={playbackText}
                              mode={phonicsTileUsesPhonicsMode(it) ? "phonics" : undefined}
                              phonemeKey={it.phoneme}
                              cvcWordKey={phonicsTileCvcWordKey(it)}
                              prefetchNextText={prefetchNextText}
                              size="sm"
                              variant="violet"
                              ariaLabel={`Play ${it.symbol}`}
                              onPlay={() => {
                                setHighlightId(it.id);
                                recordPlay(it.id, it.contentId);
                              }}
                              onSpeakingEnd={() =>
                                setHighlightId((id) => (id === it.id ? null : id))
                              }
                            />
                            {!mastered && toggleMastered && count > 0 && (
                              <button
                                type="button"
                                onClick={() => toggleMastered(it.id, it.contentId)}
                                className="text-[9px] font-bold text-primary hover:underline"
                              >
                                Mark mastered
                              </button>
                            )}
                            {count > 0 && !mastered && (
                              <span className="text-[10px] text-muted-foreground">
                                {count}×
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {level.features.blending && pack.id === "words" && (
                    <p className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <BookOpen className="h-3.5 w-3.5" />
                      Tap a word tile, then use Blend below for CVC practice
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
