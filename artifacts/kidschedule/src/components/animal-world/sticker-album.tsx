import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  buildStickerCatalog,
  getAllAnimals,
  getAnimalById,
  isStickerUnlocked,
} from "@workspace/animal-world";
import { loadAnimalWorldProgress } from "@/lib/animal-world-progress";
import { TRANSITION } from "@/lib/experience-system";
import { cn } from "@/lib/utils";

type StickerAlbumProps = {
  childId: number;
};

export function StickerAlbum({ childId }: StickerAlbumProps) {
  const progress = loadAnimalWorldProgress(childId);
  const catalog = useMemo(() => buildStickerCatalog(getAllAnimals()), []);

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-4">
      <h2 className="text-lg font-bold text-foreground">Sticker album</h2>
      <p className="text-sm text-muted-foreground">
        {progress.stickersEarned.length} of {catalog.length} collected
      </p>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {catalog.map((sticker) => {
          const unlocked = isStickerUnlocked(sticker, progress);
          const animal = getAnimalById(sticker.animalId);
          return (
            <motion.div
              key={sticker.id}
              whileHover={unlocked ? { scale: 1.05, y: -2 } : undefined}
              transition={TRANSITION.springGentle}
              className={cn(
                "flex aspect-square flex-col items-center justify-center rounded-[20px] border border-white/10 p-2 text-center",
                unlocked ? "bg-primary/10 shadow-[0_8px_24px_rgba(255,120,80,0.12)]" : "bg-white/[0.03] opacity-50",
              )}
            >
              <span className={cn("text-4xl", !unlocked && "grayscale")}>{sticker.emoji}</span>
              <p className="mt-1 line-clamp-2 text-[10px] font-semibold text-foreground">
                {unlocked ? sticker.title : "???"}
              </p>
              {animal && unlocked && (
                <p className="text-[9px] text-muted-foreground">{animal.name}</p>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
