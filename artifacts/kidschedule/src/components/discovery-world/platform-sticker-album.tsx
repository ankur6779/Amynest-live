import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  buildPlatformStickerCatalog,
  isPlatformStickerUnlocked,
} from "@workspace/world-engine";
import { loadDiscoveryWorldProgress } from "@/lib/discovery-worlds-progress";
import type { DiscoveryWorldRuntimeConfig } from "@/lib/discovery-world-config";
import { TRANSITION } from "@/lib/experience-system";
import { cn } from "@/lib/utils";
import { DelightBurst } from "./delight-burst";

type PlatformStickerAlbumProps = {
  config: DiscoveryWorldRuntimeConfig;
  childId: number;
};

export function PlatformStickerAlbum({ config, childId }: PlatformStickerAlbumProps) {
  const [celebrate, setCelebrate] = useState(false);
  const progress = loadDiscoveryWorldProgress(config.worldId, childId);
  const catalog = useMemo(
    () => buildPlatformStickerCatalog(config.manifest.items),
    [config.manifest.items],
  );

  const pages = useMemo(() => {
    const byCat = new Map<string, typeof catalog>();
    for (const sticker of catalog) {
      const item = config.manifest.items.find((i) => i.id === sticker.itemId);
      const cat = item?.category ?? "all";
      const list = byCat.get(cat) ?? [];
      list.push(sticker);
      byCat.set(cat, list);
    }
    return [...byCat.entries()].map(([categoryId, stickers]) => {
      const cat = config.manifest.categories.find((c) => c.id === categoryId);
      return {
        categoryId,
        label: cat?.label ?? "Collection",
        emoji: cat?.emoji ?? "📖",
        stickers,
      };
    });
  }, [catalog, config]);

  const collected = progress.stickersEarned.length;
  const pct = catalog.length ? Math.round((collected / catalog.length) * 100) : 0;

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-4">
      <DelightBurst active={celebrate} onDone={() => setCelebrate(false)} />
      <div>
        <h2 className="text-lg font-bold text-foreground">Sticker book</h2>
        <p className="text-sm text-muted-foreground">
          {collected} of {catalog.length} collected · {pct}% complete
        </p>
      </div>

      {pages.map((page) => (
        <section key={page.categoryId}>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {page.emoji} {page.label}
          </h3>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {page.stickers.map((sticker) => {
              const unlocked = isPlatformStickerUnlocked(sticker, progress);
              const rare = sticker.unlockSoundsPlayed >= 5;
              return (
                <motion.button
                  key={sticker.id}
                  type="button"
                  whileHover={unlocked ? { scale: 1.05, y: -2 } : undefined}
                  transition={TRANSITION.springGentle}
                  onClick={() => unlocked && setCelebrate(true)}
                  className={cn(
                    "flex aspect-square flex-col items-center justify-center rounded-[20px] border border-white/10 p-2 text-center",
                    unlocked
                      ? "bg-primary/10 shadow-[0_8px_24px_rgba(99,102,241,0.15)]"
                      : "bg-white/[0.03] opacity-50",
                    rare && unlocked && "ring-1 ring-amber-400/40",
                  )}
                >
                  <span className={cn("text-4xl", !unlocked && "grayscale")}>{sticker.emoji}</span>
                  <p className="mt-1 line-clamp-2 text-[10px] font-semibold">
                    {unlocked ? sticker.title : "???"}
                  </p>
                  {rare && unlocked && (
                    <span className="mt-0.5 text-[9px] font-bold text-amber-300">Rare</span>
                  )}
                </motion.button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
