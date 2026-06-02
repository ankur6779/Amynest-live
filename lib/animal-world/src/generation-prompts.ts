import type { Animal, AnimalSound } from "./types.js";

export type AnimalAudioJobKind = "sound_effect" | "narration";

export type AnimalAudioJob = {
  gcsPath: string;
  kind: AnimalAudioJobKind;
  /** Sound-effect prompt or narration speak text */
  prompt: string;
  durationSec: number;
  promptInfluence?: number;
  animalId: string;
  assetId: string;
};

const VARIANT_HINTS: Record<string, string> = {
  "02": "slightly different variation",
  happy: "happy and cheerful",
  angry: "intense and powerful",
  baby: "cute baby animal, softer and smaller",
  family: "small group of animals together",
};

function variantHint(soundId: string): string {
  for (const [key, hint] of Object.entries(VARIANT_HINTS)) {
    if (soundId.includes(key)) return hint;
  }
  return "clear single vocalization";
}

/** ElevenLabs Sound Generation prompt for one animal clip. */
export function buildAnimalSoundEffectPrompt(animal: Animal, sound: AnimalSound): string {
  const hint = variantHint(sound.id);
  const label = sound.label.toLowerCase();

  const templates: Record<string, string> = {
    cow: `Realistic cow mooing, ${hint}, farm animal, warm and friendly, no music, no speech`,
    horse: `Realistic horse neighing, ${hint}, farm animal, clean recording for kids`,
    sheep: `Realistic sheep baaing, ${hint}, pastoral farm sound, gentle`,
    lion: `Realistic lion roaring, ${hint}, safari wildlife, powerful but not scary for toddlers`,
    elephant: `Realistic elephant trumpeting call, ${hint}, wildlife, deep resonant`,
    dolphin: `Realistic dolphin clicks and squeaks underwater, ${hint}, marine mammal`,
    whale: `Realistic whale song vocalization, ${hint}, deep ocean mammal, melodic`,
    owl: `Realistic owl hooting at night, ${hint}, forest bird`,
    parrot: `Realistic parrot squawking, ${hint}, tropical bird, colorful personality`,
    bee: `Realistic bee buzzing and flying, ${hint}, insect, gentle loop-friendly`,
    dog: `Realistic dog barking, ${hint}, friendly pet, single bark`,
    cat: `Realistic cat ${label.includes("purr") ? "purring softly" : "meowing"}, ${hint}, pet animal`,
    monkey: `Realistic monkey chattering and ooh-ooh calls, ${hint}, jungle primate`,
    tiger: `Realistic tiger growling, ${hint}, jungle big cat, deep rumble`,
    penguin: `Realistic penguin honking call, ${hint}, arctic bird colony`,
    "polar-bear": `Realistic polar bear growling, ${hint}, arctic wildlife, deep bear vocal`,
  };

  return (
    templates[animal.id] ??
    `Realistic ${animal.name.toLowerCase()} ${label} sound effect, ${hint}, clean toddler-friendly recording, no music`
  );
}

export function collectAnimalWorldAudioJobs(animals: Animal[]): AnimalAudioJob[] {
  const jobs: AnimalAudioJob[] = [];

  for (const animal of animals) {
    for (const sound of animal.sounds) {
      jobs.push({
        gcsPath: sound.gcsPath,
        kind: "sound_effect",
        prompt: buildAnimalSoundEffectPrompt(animal, sound),
        durationSec: clampDuration(sound.durationSec),
        promptInfluence: sound.id.includes("baby") ? 0.75 : 0.85,
        animalId: animal.id,
        assetId: sound.id,
      });
    }

    jobs.push({
      gcsPath: animal.narration.introGcsPath,
      kind: "narration",
      prompt: animal.narration.intro,
      durationSec: estimateNarrationDuration(animal.narration.intro),
      animalId: animal.id,
      assetId: "narration-intro",
    });

    jobs.push({
      gcsPath: animal.narration.soundCueGcsPath,
      kind: "narration",
      prompt: animal.narration.soundCue,
      durationSec: estimateNarrationDuration(animal.narration.soundCue),
      animalId: animal.id,
      assetId: "narration-sound",
    });
  }

  return jobs;
}

function clampDuration(sec: number): number {
  return Math.min(30, Math.max(0.5, Math.round(sec * 10) / 10));
}

function estimateNarrationDuration(text: string): number {
  const words = text.trim().split(/\s+/).length;
  return clampDuration(Math.max(1.2, words * 0.45));
}
