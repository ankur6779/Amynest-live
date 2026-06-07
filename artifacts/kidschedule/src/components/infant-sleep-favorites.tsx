/**
 * Favorites and recently played row for the infant sleep library.
 */
import { useMemo, useState } from "react";
import { Heart, Clock } from "lucide-react";
import { resolveSleepLibraryEntry } from "@/lib/infant-sleep-resolve";
import type { SleepLibraryItem } from "@/data/infant-sleep-catalog";
import { loadInfantSleepLibraryState } from "@/lib/infant-sleep-library-state";

export function InfantSleepFavoritesRow({
  childId,
  onSelect,
}: {
  childId?: string;
  onSelect: (item: SleepLibraryItem) => void;
}) {
  const [tick, setTick] = useState(0);
  const { favorites, recentlyPlayed } = useMemo(() => {
    void tick;
    return loadInfantSleepLibraryState(childId);
  }, [childId, tick]);

  const favoriteItems = favorites
    .map((id) => resolveSleepLibraryEntry(id))
    .filter((x): x is SleepLibraryItem => Boolean(x))
    .slice(0, 8);

  const recentItems = recentlyPlayed
    .map((r) => resolveSleepLibraryEntry(r.id))
    .filter((x): x is SleepLibraryItem => Boolean(x))
    .slice(0, 5);

  if (favoriteItems.length === 0 && recentItems.length === 0) {
    return (
      <p className="text-[11px] text-muted-foreground px-1" data-testid="sleep-favorites-empty">
        Tap the heart on any track to save favorites. Your recently played tracks will appear here.
      </p>
    );
  }

  return (
    <div className="space-y-2" data-testid="sleep-favorites-row">
      {favoriteItems.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1">
            <Heart className="h-3 w-3" /> Favorites
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {favoriteItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  onSelect(item);
                  setTick((n) => n + 1);
                }}
                data-testid={`sleep-fav-${item.id}`}
                className="shrink-0 px-3 py-2 rounded-xl bg-white/50 dark:bg-white/5 border border-border text-[11px] font-bold text-foreground"
              >
                {item.title}
              </button>
            ))}
          </div>
        </div>
      )}
      {recentItems.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1">
            <Clock className="h-3 w-3" /> Recently played
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {recentItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onSelect(item)}
                data-testid={`sleep-recent-${item.id}`}
                className="shrink-0 px-3 py-2 rounded-xl bg-white/40 dark:bg-white/5 border border-border text-[11px] font-medium text-muted-foreground"
              >
                {item.title}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
