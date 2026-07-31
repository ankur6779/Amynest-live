import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  buildPlatformStickerCatalog,
  isPlatformStickerUnlocked,
} from "@workspace/world-engine";
import { loadDiscoveryWorldProgress } from "@/lib/discovery-worlds-progress";
import type { DiscoveryWorldRuntimeConfig } from "@/lib/discovery-world-config";
import { cn } from "@/lib/utils";
import { DiscoveryEmptyState } from "./discovery-world-polish";
import {
  AnimatedScore,
  ObjectBounce,
  ProgressiveStarFill,
  StickerUnlockCelebration,
  useSoundWorldMotion,
} from "./sound-world-motion";

type PlatformStickerAlbumProps = {
  config: DiscoveryWorldRuntimeConfig;
  childId: number;
};

function StickerThumb({
  emoji,
  item,
  resolveAssetUrl,
}: {
  emoji: string;
  item?: { imageGcsPath: string; heroCartoonGcsPath?: string };
  resolveAssetUrl: (p: string) => string;
}) {
  const [failed, setFailed] = useState(false);
  if (!item || failed) return <span className="text-4xl">{emoji}</span>;
  const cardPath = item.heroCartoonGcsPath ?? item.imageGcsPath.replace(/hero\.webp$/, "card.webp");
  return (
    <img
      src={resolveAssetUrl(cardPath)}
      alt=""
      width={64}
      height={64}
      loading="lazy"
      onError={() => setFailed(true)}
      className="h-14 w-14 rounded-xl object-cover"
    />
  );
}

export function PlatformStickerAlbum({ config, childId }: PlatformStickerAlbumProps) {
  const { springGentle, reduced } = useSoundWorldMotion();
  const [celebrateEmoji, setCelebrateEmoji] = useState<string | null>(null);
  const progress = loadDiscoveryWorldProgress(config.worldId, childId);
  const prevCollected = useRef(progress.stickersEarned.length);
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

  useEffect(() => {
    if (collected > prevCollected.current) {
      const newestId = progress.stickersEarned[progress.stickersEarned.length - 1];
      const newest = catalog.find((s) => s.id === newestId);
      if (newest) setCelebrateEmoji(newest.emoji);
    }
    prevCollected.current = collected;
  }, [catalog, collected, progress.stickersEarned]);

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-4" aria-labelledby="sticker-book-heading">
      <StickerUnlockCelebration
        active={Boolean(celebrateEmoji)}
        emoji={celebrateEmoji ?? "⭐"}
        onDone={() => setCelebrateEmoji(null)}
      />
      <div>
        <h2 id="sticker-book-heading" className="text-lg font-bold text-foreground">
          Sticker book
        </h2>
        <p className="text-sm text-muted-foreground">
          <AnimatedScore value={collected} /> of {catalog.length} collected ·{" "}
          <AnimatedScore value={pct} suffix="% complete" />
        </p>
        <ProgressiveStarFill pct={pct} className="mt-2" />
      </div>

      {collected === 0 && (
        <DiscoveryEmptyState variant="emptyStickers" testId="discovery-stickers-empty" />
      )}

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
                  whileHover={unlocked && !reduced ? { scale: 1.05, y: -2 } : undefined}
                  whileTap={unlocked && !reduced ? { scale: 0.96, y: 2 } : undefined}
                  transition={springGentle}
                  onClick={() => unlocked && setCelebrateEmoji(sticker.emoji)}
                  className={cn(
                    "flex aspect-square flex-col items-center justify-center rounded-[20px] border border-white/10 p-2 text-center will-change-transform",
                    unlocked
                      ? "bg-primary/10 shadow-[0_8px_24px_rgba(99,102,241,0.15)]"
                      : "bg-white/[0.03] opacity-50",
                    rare && unlocked && "ring-1 ring-amber-400/40",
                  )}
                >
                  <ObjectBounce active={celebrateEmoji === sticker.emoji}>
                    <div
                      className={cn(
                        "transition-[filter] duration-500",
                        !unlocked && "grayscale opacity-60",
                      )}
                    >
                      <StickerThumb
                        emoji={sticker.emoji}
                        item={config.manifest.items.find((i) => i.id === sticker.itemId)}
                        resolveAssetUrl={config.resolveAssetUrl}
                      />
                    </div>
                  </ObjectBounce>
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
