import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ANIMAL_CATEGORIES,
  buildDiscoverySequence,
  CATEGORY_LABELS,
  discoveryPhaseDurationMs,
  DISCOVERY_PHASE_ORDER,
  getAllAnimals,
  getPrimaryQuizSound,
  resolveAnimalAssetUrl,
  resolveAnimalSoundUrl,
  type AnimalCategory,
  type DiscoverySlidePhase,
} from "@workspace/animal-world";
import { TRANSITION } from "@/lib/experience-system";
import { cn } from "@/lib/utils";
import { animalAudioManager } from "@/lib/animal-world-audio-manager";
import { trackAnimalWorldEvent } from "@/lib/animal-world-telemetry";
import { grantXp } from "@/lib/animal-world-progress";
import { AnimalHeroImage } from "./animal-hero-image";

type DiscoveryModeProps = {
  childId: number;
};

export function DiscoveryMode({ childId }: DiscoveryModeProps) {
  const [categoryFilter, setCategoryFilter] = useState<AnimalCategory | "all">("all");
  const [speed, setSpeed] = useState(1);
  const [autoRepeat, setAutoRepeat] = useState(false);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<DiscoverySlidePhase>("image");

  const sequence = useMemo(
    () =>
      buildDiscoverySequence(
        getAllAnimals(),
        24,
        categoryFilter === "all" ? undefined : categoryFilter,
      ),
    [categoryFilter],
  );

  const animal = sequence[index % Math.max(sequence.length, 1)];

  const advanceSlide = useCallback(() => {
    setIndex((i) => (autoRepeat && i >= sequence.length - 1 ? 0 : i + 1));
    setPhase("image");
  }, [autoRepeat, sequence.length]);

  useEffect(() => {
    if (!animal) return;
    const phaseIndex = DISCOVERY_PHASE_ORDER.indexOf(phase);
    const ms = discoveryPhaseDurationMs(phase, speed);

    if (phase === "narration") {
      animalAudioManager.unlockFromGesture();
      void animalAudioManager.play(resolveAnimalAssetUrl(animal.narration.introGcsPath), {
        animalId: animal.id,
        soundId: "narration-intro",
        label: "intro",
      });
    }
    if (phase === "sound") {
      const sound = getPrimaryQuizSound(animal);
      if (sound) {
        void animalAudioManager.play(resolveAnimalSoundUrl(sound), {
          animalId: animal.id,
          soundId: sound.id,
          label: sound.label,
        });
      }
    }
    if (phase === "image" && phaseIndex === 0) {
      trackAnimalWorldEvent("discovery_slide", { childId, animalId: animal.id, index, phase });
    }

    const timer = window.setTimeout(() => {
      const nextPhase = DISCOVERY_PHASE_ORDER[phaseIndex + 1];
      if (nextPhase && nextPhase !== "advance") {
        setPhase(nextPhase);
      } else {
        if (index > 0 && index % 6 === 0) {
          grantXp(childId, "discoverySession");
          trackAnimalWorldEvent("discovery_session_complete", { childId, index });
        }
        advanceSlide();
      }
    }, ms);

    return () => window.clearTimeout(timer);
  }, [animal, childId, index, phase, speed, advanceSlide]);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-6">
      <div className="flex w-full flex-wrap gap-2">
        <FilterChip active={categoryFilter === "all"} label="All" onClick={() => setCategoryFilter("all")} />
        {ANIMAL_CATEGORIES.map((cat) => (
          <FilterChip
            key={cat}
            active={categoryFilter === cat}
            label={CATEGORY_LABELS[cat].replace(" Animals", "")}
            onClick={() => {
              setCategoryFilter(cat);
              setIndex(0);
              setPhase("image");
            }}
          />
        ))}
      </div>

      <div className="flex w-full items-center justify-center gap-2">
        <SpeedButton label="Slow" active={speed === 0.7} onClick={() => setSpeed(0.7)} />
        <SpeedButton label="Normal" active={speed === 1} onClick={() => setSpeed(1)} />
        <SpeedButton label="Fast" active={speed === 1.4} onClick={() => setSpeed(1.4)} />
        <button
          type="button"
          onClick={() => setAutoRepeat((r) => !r)}
          className={cn(
            "rounded-full px-3 py-1.5 text-xs font-semibold",
            autoRepeat ? "bg-primary/20 text-primary" : "bg-white/5 text-muted-foreground",
          )}
        >
          {autoRepeat ? "Repeat on" : "Repeat off"}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {animal && (
          <motion.div
            key={`${animal.id}-${index}-${phase}`}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            transition={TRANSITION.warmLong}
            className="flex w-full flex-col items-center gap-4 rounded-[28px] border border-white/10 bg-[rgba(18,28,60,0.78)] px-6 py-10 shadow-[0_16px_48px_rgba(0,0,0,0.32)]"
          >
            {(phase === "image" || phase === "name" || phase === "sound") && (
              <AnimalHeroImage animal={animal} eager className="max-h-[180px]" />
            )}
            {(phase === "name" || phase === "narration" || phase === "sound") && (
              <p className="text-3xl font-bold text-foreground">{animal.name}</p>
            )}
            {phase === "narration" && (
              <p className="text-center text-sm text-muted-foreground">{animal.narration.intro}</p>
            )}
            {phase === "sound" && (
              <p className="text-center text-sm font-semibold text-primary">{animal.narration.soundCue}</p>
            )}
            {phase === "image" && (
              <p className="text-sm text-muted-foreground">{animal.funFact}</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
        Discovery · {phase}
      </p>
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
      onClick={onClick}
      className={cn(
        "rounded-full px-3 py-1.5 text-xs font-semibold",
        active ? "bg-primary/15 text-foreground" : "bg-white/5 text-muted-foreground",
      )}
    >
      {label}
    </button>
  );
}

function SpeedButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-3 py-1.5 text-xs font-semibold",
        active ? "bg-white/10 text-foreground" : "text-muted-foreground",
      )}
    >
      {label}
    </button>
  );
}
