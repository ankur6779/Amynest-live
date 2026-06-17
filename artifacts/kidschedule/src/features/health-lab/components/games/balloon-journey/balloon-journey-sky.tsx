import { memo, useMemo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  BALLOON_SKY_PHASES,
  getSkyGradient,
} from "./balloon-journey-constants";

const PARALLAX_LAYERS = [
  { id: "far-clouds", speed: 0.15, emoji: "☁️", count: 6, size: "text-3xl", opacity: 0.35 },
  { id: "near-clouds", speed: 0.35, emoji: "☁️", count: 5, size: "text-4xl", opacity: 0.55 },
  { id: "mountains", speed: 0.55, emoji: "⛰️", count: 4, size: "text-2xl", opacity: 0.7 },
  { id: "stars", speed: 0.8, emoji: "✨", count: 8, size: "text-sm", opacity: 0.9 },
] as const;

function layerVisible(layerId: string, elapsed: number): boolean {
  if (layerId === "mountains") return elapsed >= 8;
  if (layerId === "stars") return elapsed >= 45;
  return true;
}

export const BalloonJourneySky = memo(function BalloonJourneySky({
  elapsed,
  altitude,
  reduced,
}: {
  elapsed: number;
  altitude: number;
  reduced: boolean;
}) {
  const gradient = getSkyGradient(elapsed);
  const parallaxOffset = altitude * 0.08;

  const items = useMemo(
    () =>
      PARALLAX_LAYERS.flatMap((layer) =>
        Array.from({ length: layer.count }, (_, i) => ({
          key: `${layer.id}-${i}`,
          layer,
          left: `${(i * 23 + 7) % 92}%`,
          baseTop: `${(i * 31 + 5) % 85}%`,
          delay: i * 0.4,
        })),
      ),
    [],
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div
        className="absolute inset-0 transition-[background] duration-[1.2s] ease-out"
        style={{ background: gradient }}
      />

      {!reduced &&
        items.map(({ key, layer, left, baseTop, delay }) => {
          if (!layerVisible(layer.id, elapsed)) return null;
          const offsetY = parallaxOffset * layer.speed;
          return (
            <motion.span
              key={key}
              className={cn("absolute will-change-transform", layer.size)}
              style={{
                left,
                top: baseTop,
                opacity: layer.opacity,
                transform: `translate3d(0, ${offsetY}px, 0)`,
              }}
              animate={{ x: [0, 12, 0] }}
              transition={{ duration: 8 + delay, repeat: Infinity, ease: "easeInOut", delay }}
            >
              {layer.emoji}
            </motion.span>
          );
        })}

      {elapsed >= 50 && !reduced && (
        <div className="absolute inset-0">
          {[...Array(12)].map((_, i) => (
            <motion.div
              key={`space-star-${i}`}
              className="absolute rounded-full bg-white"
              style={{
                left: `${(i * 29 + 3) % 100}%`,
                top: `${(i * 37 + 8) % 100}%`,
                width: 1 + (i % 2),
                height: 1 + (i % 2),
              }}
              animate={{ opacity: [0.2, 1, 0.2] }}
              transition={{ duration: 2 + (i % 3), repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/15 to-transparent" />

      <div className="absolute left-3 top-[4.5rem] z-[2] rounded-full border border-white/15 bg-black/25 px-3 py-1 backdrop-blur-sm">
        <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-white/45">
          {BALLOON_SKY_PHASES.find((p) => elapsed >= p.startSec && elapsed < p.endSec)?.name ??
            "Outer Space"}
        </p>
      </div>
    </div>
  );
});
