import { useState } from "react";
import { cn } from "@/lib/utils";
import { SKELETON_BASE } from "@/lib/experience-system";
import { WORLD_CARD_IMAGE_SIZE } from "@/lib/world-visual-assets";
import { DiscoveryHeroFallback } from "./discovery-world-polish";

type WorldHeroImageProps = {
  src?: string;
  emoji: string;
  alt: string;
  className?: string;
  priority?: "high" | "low";
};

export function WorldHeroImage({
  src,
  emoji,
  alt,
  className,
  priority = "high",
}: WorldHeroImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return <DiscoveryHeroFallback emoji={emoji} alt={alt} className={className} />;
  }

  return (
    <div
      className={cn(
        "relative aspect-square overflow-hidden rounded-[24px] ring-1 ring-inset ring-white/10",
        className,
      )}
    >
      {!loaded && (
        <div className={cn(SKELETON_BASE, "absolute inset-0")} aria-hidden />
      )}
      <img
        src={src}
        alt={alt}
        width={WORLD_CARD_IMAGE_SIZE.width}
        height={WORLD_CARD_IMAGE_SIZE.height}
        loading={priority === "high" ? "eager" : "lazy"}
        decoding="async"
        fetchPriority={priority}
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
