import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Heart, VolumeX, Volume2 } from "lucide-react";
import {
  CATEGORY_LABELS,
  getPrimaryQuizSound,
  resolveAnimalAssetUrl,
  resolveAnimalSoundUrl,
  type Animal,
} from "@workspace/animal-world";
import { cn } from "@/lib/utils";
import { fadeUp, SCREEN_SPACING } from "@/lib/experience-system";
import { animalAudioManager } from "@/lib/animal-world-audio-manager";
import { warmAnimalDetail } from "@/lib/animal-world-audio-warmup";
import {
  isFavorite,
  recordAnimalOpened,
  recordSoundPlayed,
  toggleFavorite,
} from "@/lib/animal-world-storage";
import { trackAnimalWorldEvent } from "@/lib/animal-world-telemetry";
import { AnimalHeroImage } from "./animal-hero-image";
import { SoundRow } from "./sound-row";

type AnimalDetailProps = {
  animal: Animal;
  childId: number;
  onBack: () => void;
  muted: boolean;
  onToggleMute: () => void;
};

export function AnimalDetail({
  animal,
  childId,
  onBack,
  muted,
  onToggleMute,
}: AnimalDetailProps) {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [favorited, setFavorited] = useState(() => isFavorite(childId, animal.id));

  useEffect(() => {
    warmAnimalDetail(animal);
    recordAnimalOpened(childId, animal.id);
    trackAnimalWorldEvent("animal_opened", { childId, animalId: animal.id, category: animal.category });
  }, [animal, childId]);

  const playSound = async (soundId: string, url: string, label: string) => {
    animalAudioManager.unlockFromGesture();
    setPlayingId(soundId);
    await animalAudioManager.play(url, { animalId: animal.id, soundId, label });
    recordSoundPlayed(childId, animal.id, soundId);
    trackAnimalWorldEvent("sound_played", { childId, animalId: animal.id, soundId });
    setPlayingId(null);
  };

  const onFavorite = () => {
    const { added } = toggleFavorite(childId, animal.id);
    setFavorited(!favorited);
    trackAnimalWorldEvent(added ? "favorite_added" : "favorite_removed", {
      childId,
      animalId: animal.id,
    });
  };

  const primary = getPrimaryQuizSound(animal);

  return (
    <motion.div {...fadeUp} className={cn("mx-auto max-w-2xl space-y-5", SCREEN_SPACING.pageX)}>
      <div className="flex items-center justify-between gap-3 pt-2">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-2 text-sm font-semibold text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleMute}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-foreground"
            aria-label={muted ? "Unmute" : "Mute"}
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={onFavorite}
            className={cn(
              "inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/5",
              favorited ? "text-rose-400" : "text-foreground",
            )}
            aria-label={favorited ? "Remove favorite" : "Add favorite"}
          >
            <Heart className={cn("h-4 w-4", favorited && "fill-current")} />
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-[28px] border border-white/10 bg-[rgba(18,28,60,0.78)] shadow-[0_16px_48px_rgba(0,0,0,0.32)] backdrop-blur-xl">
        <div className="flex min-h-[240px] items-center justify-center bg-gradient-to-b from-white/[0.05] to-transparent p-8">
          <AnimalHeroImage animal={animal} eager className="max-h-[220px]" />
        </div>
        <div className="space-y-2 px-5 pb-5 pt-2">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            {CATEGORY_LABELS[animal.category]}
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{animal.name}</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">{animal.funFact}</p>
        </div>
      </div>

      {primary && (
        <button
          type="button"
          onClick={() => void playSound(primary.id, resolveAnimalSoundUrl(primary), primary.label)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-4 text-base font-bold text-primary-foreground shadow-[0_10px_30px_rgba(255,120,80,0.25)] active:scale-[0.99]"
        >
          <span className="text-xl">{animal.emoji}</span>
          Tap to hear {primary.label}
        </button>
      )}

      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Sound library</h2>
        {animal.sounds.map((sound) => (
          <SoundRow
            key={sound.id}
            sound={sound}
            playing={playingId === sound.id}
            onPlay={() => void playSound(sound.id, resolveAnimalSoundUrl(sound), sound.label)}
          />
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 pb-8">
        <button
          type="button"
          className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left text-sm font-semibold"
          onClick={() =>
            void playSound("narration-intro", resolveAnimalAssetUrl(animal.narration.introGcsPath), "intro")
          }
        >
          🎙 {animal.narration.intro}
        </button>
        <button
          type="button"
          className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left text-sm font-semibold"
          onClick={() =>
            void playSound(
              "narration-sound",
              resolveAnimalAssetUrl(animal.narration.soundCueGcsPath),
              "sound cue",
            )
          }
        >
          🔊 {animal.narration.soundCue}
        </button>
      </div>
    </motion.div>
  );
}
