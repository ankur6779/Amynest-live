import { useState } from "react";
import { motion } from "framer-motion";
import type { WorldManifestItem } from "@workspace/world-engine";
import { Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { CARD_VARIANTS, TOUCH_FEEDBACK, TRANSITION } from "@/lib/experience-system";
import { worldItemVisualPaths, WORLD_CARD_IMAGE_SIZE } from "@/lib/world-visual-assets";

type WorldItemCardProps = {
  item: WorldManifestItem;
  resolveAssetUrl: (gcsPath: string) => string;
  onSelect: (item: WorldManifestItem) => void;
};

export function WorldItemCard({ item, resolveAssetUrl, onSelect }: WorldItemCardProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const visuals = worldItemVisualPaths(item, resolveAssetUrl);
  const src = imgFailed ? null : visuals.card;

  return (
    <motion.button
      type="button"
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.97 }}
      transition={TRANSITION.springGentle}
      onClick={() => onSelect(item)}
      className={cn(
        CARD_VARIANTS.premium,
        TOUCH_FEEDBACK,
        "group relative flex h-full w-full flex-col overflow-hidden rounded-[24px] border border-white/10 bg-[rgba(18,28,60,0.78)] text-left shadow-[0_12px_40px_rgba(0,0,0,0.28)]",
      )}
      aria-label={item.name}
    >
      <div
        className="relative flex flex-1 items-center justify-center overflow-hidden bg-gradient-to-br from-white/[0.06] via-transparent to-black/20"
        style={{ aspectRatio: `${WORLD_CARD_IMAGE_SIZE.width} / ${WORLD_CARD_IMAGE_SIZE.height}` }}
      >
        {src ? (
          <img
            src={src}
            alt=""
            width={WORLD_CARD_IMAGE_SIZE.width}
            height={WORLD_CARD_IMAGE_SIZE.height}
            loading="lazy"
            decoding="async"
            onError={() => setImgFailed(true)}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <span className="text-6xl">{item.emoji}</span>
        )}
      </div>
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <div>
          <p className="text-base font-semibold tracking-tight text-foreground">{item.name}</p>
          <p className="text-xs text-muted-foreground">{item.emoji}</p>
        </div>
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-primary">
          <Volume2 className="h-4 w-4" aria-hidden />
        </span>
      </div>
    </motion.button>
  );
}
