import {
  COLLECTION_CATALOG,
  type CollectionItemId,
  type CollectionState,
} from "@workspace/abacus";
import { cn } from "@/lib/utils";

export function AbacusCollectionShelf({
  collection,
  highlight,
}: {
  collection: CollectionState;
  highlight?: CollectionItemId[];
}) {
  const unlocked = new Set(collection.unlocked);
  const hi = new Set(highlight ?? []);

  return (
    <div
      className="rounded-2xl border border-border bg-card p-3 space-y-2"
      data-testid="abacus-collection-shelf"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-black uppercase tracking-wide text-muted-foreground">
          My Collection
        </p>
        <p className="text-[11px] font-bold text-foreground">
          💎 {collection.gems} · ⭐ {collection.stars}
        </p>
      </div>
      <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
        {COLLECTION_CATALOG.map((item) => {
          const has = unlocked.has(item.id);
          return (
            <div
              key={item.id}
              title={has ? item.title : item.unlockHint}
              className={cn(
                "rounded-xl border aspect-square flex flex-col items-center justify-center p-1",
                has
                  ? "bg-amber-500/10 border-amber-400/40"
                  : "bg-muted/40 border-border opacity-40 grayscale",
                hi.has(item.id) && "ring-2 ring-teal-400 animate-pulse",
              )}
              data-testid={`abacus-collect-${item.id}`}
            >
              <span className="text-lg leading-none" aria-hidden>
                {item.emoji}
              </span>
              <span className="text-[8px] font-bold text-center leading-tight mt-0.5 line-clamp-2">
                {item.title}
              </span>
            </div>
          );
        })}
      </div>
      <p className="text-[10px] text-muted-foreground font-semibold">
        Earn everything by learning — never by paying.
      </p>
    </div>
  );
}
