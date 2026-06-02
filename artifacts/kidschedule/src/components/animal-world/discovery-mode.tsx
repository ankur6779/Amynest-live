import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  buildDiscoverySequence,
  getAllAnimals,
  getPrimaryQuizSound,
  resolveAnimalSoundUrl,
} from "@workspace/animal-world";
import { TRANSITION } from "@/lib/experience-system";
import { animalAudioManager } from "@/lib/animal-world-audio-manager";
import { trackAnimalWorldEvent } from "@/lib/animal-world-telemetry";
import { AnimalHeroImage } from "./animal-hero-image";

const SLIDE_MS = 4500;

type DiscoveryModeProps = {
  childId: number;
};

export function DiscoveryMode({ childId }: DiscoveryModeProps) {
  const sequence = useMemo(() => buildDiscoverySequence(getAllAnimals(), 24), []);
  const [index, setIndex] = useState(0);
  const animal = sequence[index % sequence.length];

  useEffect(() => {
    if (!animal) return;
    const sound = getPrimaryQuizSound(animal);
    animalAudioManager.unlockFromGesture();
    if (sound) {
      void animalAudioManager.play(resolveAnimalSoundUrl(sound), {
        animalId: animal.id,
        soundId: sound.id,
        label: sound.label,
      });
    }
    trackAnimalWorldEvent("discovery_slide", { childId, animalId: animal.id, index });
    const timer = window.setTimeout(() => setIndex((i) => i + 1), SLIDE_MS);
    return () => window.clearTimeout(timer);
  }, [animal, childId, index]);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-6 px-4 py-8">
      <AnimatePresence mode="wait">
        <motion.div
          key={animal.id + index}
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.02 }}
          transition={TRANSITION.warmLong}
          className="flex w-full flex-col items-center gap-4 rounded-[28px] border border-white/10 bg-[rgba(18,28,60,0.78)] px-6 py-10 shadow-[0_16px_48px_rgba(0,0,0,0.32)]"
        >
          <AnimalHeroImage animal={animal} eager className="max-h-[180px]" />
          <p className="text-3xl font-bold text-foreground">{animal.name}</p>
          <p className="text-sm text-muted-foreground">{animal.funFact}</p>
        </motion.div>
      </AnimatePresence>
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Discovery mode</p>
    </div>
  );
}
