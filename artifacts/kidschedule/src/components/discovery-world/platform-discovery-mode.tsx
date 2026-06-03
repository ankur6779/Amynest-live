import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  buildPlatformDiscoverySequence,
  DISCOVERY_PHASE_ORDER,
  discoveryPhaseDurationMs,
  type DiscoverySlidePhase,
} from "@workspace/world-engine";
import { TRANSITION } from "@/lib/experience-system";
import { cn } from "@/lib/utils";
import { discoveryWorldAudioManager } from "@/lib/discovery-world-audio-manager";
import { trackDiscoveryWorldsEvent } from "@/lib/discovery-worlds-telemetry";
import type { DiscoveryWorldRuntimeConfig } from "@/lib/discovery-world-config";
import { applyDiscoverySessionEngagement } from "@/lib/discovery-worlds-engagement";
import { worldItemVisualPaths } from "@/lib/world-visual-assets";
import { WorldHeroImage } from "./world-hero-image";
import { DelightBurst } from "./delight-burst";
import {
  DiscoveryEmptyState,
  DiscoveryProgressDots,
} from "./discovery-world-polish";

type PlatformDiscoveryModeProps = {
  config: DiscoveryWorldRuntimeConfig;
  childId: number;
};

export function PlatformDiscoveryMode({ config, childId }: PlatformDiscoveryModeProps) {
  const [categoryFilter, setCategoryFilter] = useState<string | "all">("all");
  const [speed, setSpeed] = useState(1);
  const [autoRepeat, setAutoRepeat] = useState(false);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<DiscoverySlidePhase>("image");
  const [celebrate, setCelebrate] = useState(false);

  const sequence = useMemo(
    () =>
      buildPlatformDiscoverySequence(
        categoryFilter === "all"
          ? config.manifest.items
          : config.manifest.items.filter((i) => i.category === categoryFilter),
        24,
      ),
    [categoryFilter, config.manifest.items],
  );

  const item = sequence[index % Math.max(sequence.length, 1)];

  const advanceSlide = useCallback(() => {
    setIndex((i) => (autoRepeat && i >= sequence.length - 1 ? 0 : i + 1));
    setPhase("image");
  }, [autoRepeat, sequence.length]);

  useEffect(() => {
    if (!item) return;
    const phaseIndex = DISCOVERY_PHASE_ORDER.indexOf(phase);
    const ms = discoveryPhaseDurationMs(phase, speed);

    if (phase === "narration") {
      discoveryWorldAudioManager.unlockFromGesture();
      void discoveryWorldAudioManager.play(config.resolveAssetUrl(item.narration.introGcsPath), {
        worldId: config.worldId,
        itemId: item.id,
        soundId: "narration-intro",
      });
    }
    if (phase === "sound") {
      const sound = config.getPrimarySound(item);
      if (sound) {
        void discoveryWorldAudioManager.play(config.resolveAssetUrl(sound.gcsPath), {
          worldId: config.worldId,
          itemId: item.id,
          soundId: sound.id,
        });
      }
    }

    const timer = window.setTimeout(() => {
      const nextPhase = DISCOVERY_PHASE_ORDER[phaseIndex + 1];
      if (nextPhase && nextPhase !== "advance") {
        setPhase(nextPhase);
      } else {
        if (index > 0 && index % 6 === 0) {
          applyDiscoverySessionEngagement(config.worldId, childId, config.manifest.items);
          setCelebrate(true);
          trackDiscoveryWorldsEvent(config.worldId, "world_discovery_session_complete", {
            childId,
            index,
          });
        }
        advanceSlide();
      }
    }, ms);

    return () => window.clearTimeout(timer);
  }, [item, childId, index, phase, speed, advanceSlide, config]);

  const heroSrc = item
    ? worldItemVisualPaths(item, config.resolveAssetUrl).hero
    : undefined;

  if (sequence.length === 0) {
    return (
      <div className="px-4 py-6">
        <DiscoveryEmptyState variant="emptyDiscovery" />
      </div>
    );
  }

  return (
    <div
      className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-6"
      role="region"
      aria-label="Discovery slideshow"
    >
      <DelightBurst active={celebrate} variant="confetti" onDone={() => setCelebrate(false)} />

      <div className="flex w-full flex-wrap gap-2">
        <FilterChip active={categoryFilter === "all"} label="All" onClick={() => setCategoryFilter("all")} />
        {config.manifest.categories.map((cat) => (
          <FilterChip
            key={cat.id}
            active={categoryFilter === cat.id}
            label={`${cat.emoji} ${cat.label}`}
            onClick={() => setCategoryFilter(cat.id)}
          />
        ))}
      </div>

      <DiscoveryProgressDots activeIndex={index} total={sequence.length} />

      <div className="flex w-full flex-wrap items-center justify-center gap-2 text-xs">
        <button
          type="button"
          aria-label={`Playback speed ${speed} times`}
          className="min-h-11 rounded-full border border-white/10 px-3 py-1.5 font-semibold"
          onClick={() => setSpeed((s) => (s >= 1.5 ? 0.75 : s + 0.25))}
        >
          Speed {speed}x
        </button>
        <button
          type="button"
          aria-pressed={autoRepeat}
          aria-label={autoRepeat ? "Loop slideshow on" : "Loop slideshow off"}
          className={cn(
            "min-h-11 rounded-full border px-3 py-1.5 font-semibold",
            autoRepeat ? "border-primary/50 bg-primary/15" : "border-white/10",
          )}
          onClick={() => setAutoRepeat((v) => !v)}
        >
          {autoRepeat ? "Loop on" : "Loop off"}
        </button>
        <button
          type="button"
          aria-label="Next item"
          className="min-h-11 rounded-full border border-white/10 px-3 py-1.5 font-semibold"
          onClick={advanceSlide}
        >
          Next
        </button>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={`${item?.id}-${phase}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={TRANSITION.warm}
          className="w-full space-y-4 rounded-[28px] border border-white/10 bg-[rgba(18,28,60,0.78)] p-6 text-center"
        >
          {phase === "image" && item && (
            <WorldHeroImage src={heroSrc} emoji={item.emoji} alt={item.name} className="mx-auto max-w-xs" />
          )}
          {phase !== "image" && item && (
            <>
              <span className="text-6xl">{item.emoji}</span>
              <p className="text-2xl font-bold">{item.name}</p>
            </>
          )}
          {phase === "name" && item?.funFact && (
            <p className="mt-2 text-sm text-muted-foreground">{item.funFact}</p>
          )}
          {phase === "sound" && (
            <p className="mt-2 text-sm font-semibold text-primary">Listen closely…</p>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function FilterChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "min-h-11 rounded-full border px-3 py-1.5 text-xs font-semibold",
        active ? "border-primary/50 bg-primary/15" : "border-white/10 text-muted-foreground",
      )}
    >
      {label}
    </button>
  );
}
