import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  getAllAnimals,
  getPrimaryQuizSound,
  resolveAnimalAssetUrl,
  resolveAnimalSoundUrl,
  type Animal,
} from "@workspace/animal-world";
import { cn } from "@/lib/utils";
import { TRANSITION } from "@/lib/experience-system";
import { animalAudioManager } from "@/lib/animal-world-audio-manager";
import { AnimalHeroImage } from "./animal-hero-image";

type ToddlerModeProps = {
  childId: number;
  onOpenAnimal: (animal: Animal) => void;
};

export function ToddlerMode({ onOpenAnimal }: ToddlerModeProps) {
  const animals = getAllAnimals();
  const [index, setIndex] = useState(0);
  const animal = animals[index % animals.length];

  const playNarration = useCallback(async (target: Animal) => {
    animalAudioManager.unlockFromGesture();
    await animalAudioManager.play(resolveAnimalAssetUrl(target.narration.introGcsPath), {
      animalId: target.id,
      soundId: "narration-intro",
      label: target.narration.intro,
    });
    const primary = getPrimaryQuizSound(target);
    if (primary) {
      await animalAudioManager.play(resolveAnimalSoundUrl(primary), {
        animalId: target.id,
        soundId: primary.id,
        label: primary.label,
      });
    }
    await animalAudioManager.play(resolveAnimalAssetUrl(target.narration.soundCueGcsPath), {
      animalId: target.id,
      soundId: "narration-sound",
      label: target.narration.soundCue,
    });
  }, []);

  useEffect(() => {
    void playNarration(animal);
  }, [animal, playNarration]);

  const next = () => setIndex((i) => (i + 1) % animals.length);

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-6 px-4 py-6">
      <AnimatePresence mode="wait">
        <motion.button
          key={animal.id}
          type="button"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={TRANSITION.warm}
          onClick={() => {
            void playNarration(animal);
            onOpenAnimal(animal);
          }}
          className={cn(
            "flex w-full flex-col items-center gap-5 rounded-[32px] border border-white/10",
            "bg-[rgba(18,28,60,0.82)] px-6 py-10 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl",
          )}
        >
          <AnimalHeroImage animal={animal} eager className="max-h-[200px]" />
          <p className="text-4xl font-bold tracking-tight text-foreground">{animal.name}</p>
          <p className="text-lg text-muted-foreground">Tap to hear</p>
        </motion.button>
      </AnimatePresence>

      <button
        type="button"
        onClick={next}
        className="min-h-[56px] min-w-[200px] rounded-full bg-primary px-8 py-4 text-lg font-bold text-primary-foreground shadow-lg active:scale-[0.98]"
      >
        Next animal →
      </button>
    </div>
  );
}
