import { useState } from "react";
import { cn } from "@/lib/utils";
import { SKELETON_BASE } from "@/lib/experience-system";
import { WORLD_CARD_IMAGE_SIZE } from "@/lib/world-visual-assets";

type WorldHeroImageProps = {
  src?: string;
  emoji: string;
  alt: string;
  className?: string;
};

export function WorldHeroImage({ src, emoji, alt, className }: WorldHeroImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={cn(
          "flex aspect-square items-center justify-center rounded-[24px] bg-white/[0.04] text-7xl",
          className,
        )}
        aria-label={alt}
      >
        {emoji}
      </div>
    );
  }

  return (
    <div className={cn("relative aspect-square overflow-hidden rounded-[24px]", className)}>
      {!loaded && <div className={cn(SKELETON_BASE, "absolute inset-0")} />}
      <img
        src={src}
        alt={alt}
        width={WORLD_CARD_IMAGE_SIZE.width}
        height={WORLD_CARD_IMAGE_SIZE.height}
        loading="eager"
        decoding="async"
        fetchPriority="high"
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
        className={cn(
          "h-full w-full object-cover transition-opacity duration-300",
          loaded ? "opacity-100" : "opacity-0",
        )}
      />
    </div>
  );
}
