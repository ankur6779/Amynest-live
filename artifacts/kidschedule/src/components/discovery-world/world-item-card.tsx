import { useState } from "react";
import type { WorldManifestItem } from "@workspace/world-engine";
import { Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { CARD_VARIANTS } from "@/lib/experience-system";
import { worldItemVisualPaths, WORLD_CARD_IMAGE_SIZE } from "@/lib/world-visual-assets";
import { ObjectBounce, SoundWorldTiltCard } from "./sound-world-motion";
import { ObjectLife } from "./object-life";

type WorldItemCardProps = {
  item: WorldManifestItem;
  resolveAssetUrl: (gcsPath: string) => string;
  onSelect: (item: WorldManifestItem) => void;
  idleIndex?: number;
};

export function WorldVisualThumb({
  item,
  resolveAssetUrl,
  size = 72,
  className,
}: {
  item: WorldManifestItem;
  resolveAssetUrl: (gcsPath: string) => string;
  size?: number;
  className?: string;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const visuals = worldItemVisualPaths(item, resolveAssetUrl);
  const src = imgFailed ? null : visuals.thumbnail || visuals.card;

  if (!src) {
    return (
      <span className={cn("text-4xl", className)} aria-hidden>
        {item.emoji}
      </span>
    );
  }

  return (
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      onError={() => setImgFailed(true)}
      className={cn("rounded-xl object-cover", className)}
      style={{ width: size, height: size }}
    />
  );
}

export function WorldItemCard({
  item,
  resolveAssetUrl,
  onSelect,
  idleIndex = 0,
}: WorldItemCardProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const [bounce, setBounce] = useState(false);
  const visuals = worldItemVisualPaths(item, resolveAssetUrl);
  const src = imgFailed ? null : visuals.card;

  return (
    <SoundWorldTiltCard
      idleIndex={idleIndex}
      ariaLabel={`${item.name}, tap to explore sounds`}
      onClick={() => {
        setBounce(true);
        window.setTimeout(() => setBounce(false), 400);
        onSelect(item);
      }}
      className={cn(
        CARD_VARIANTS.premium,
        "group relative flex h-full w-full flex-col overflow-hidden rounded-[24px] border border-white/10 bg-[rgba(18,28,60,0.78)] text-left shadow-[0_12px_40px_rgba(0,0,0,0.28)]",
      )}
    >
      <div
        className="relative flex flex-1 items-center justify-center overflow-hidden bg-gradient-to-br from-white/[0.06] via-transparent to-black/20"
        style={{ aspectRatio: `${WORLD_CARD_IMAGE_SIZE.width} / ${WORLD_CARD_IMAGE_SIZE.height}` }}
      >
        <ObjectLife seed={idleIndex + item.id.length}>
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
            <ObjectBounce active={bounce}>
              <span className="text-6xl">{item.emoji}</span>
            </ObjectBounce>
          )}
        </ObjectLife>
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
    </SoundWorldTiltCard>
  );
}
