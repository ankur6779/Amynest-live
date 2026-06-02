import type { WorldManifestItem, WorldManifestSound } from "./manifest-types.js";
import type { WorldId } from "./types.js";

export type WorldAudioJobKind = "sound_effect" | "narration";

export type WorldAudioJob = {
  gcsPath: string;
  kind: WorldAudioJobKind;
  prompt: string;
  durationSec: number;
  promptInfluence?: number;
  itemId: string;
  assetId: string;
  worldId: WorldId;
};

function clampDuration(sec: number): number {
  return Math.min(30, Math.max(0.5, Math.round(sec * 10) / 10));
}

function estimateNarrationDuration(text: string): number {
  const words = text.trim().split(/\s+/).length;
  return clampDuration(Math.max(1.2, words * 0.45));
}

function variantHint(soundId: string): string {
  if (soundId.includes("02")) return "slightly different variation";
  if (soundId.includes("happy")) return "happy and cheerful";
  return "clear single sound, toddler-friendly";
}

export function buildWorldSoundEffectPrompt(item: WorldManifestItem, sound: WorldManifestSound): string {
  const hint = variantHint(sound.id);
  const label = sound.label.toLowerCase();
  const name = item.name.toLowerCase();

  const byItem: Record<string, string> = {
    car: `Realistic car engine revving and driving, ${hint}, no music, no speech`,
    "fire-truck": `Realistic fire truck emergency siren wailing, ${hint}, clear for kids`,
    train: `Realistic train whistle choo choo and rail clatter, ${hint}`,
    rocket: `Realistic rocket launch blast off whoosh, ${hint}, space vehicle`,
    rain: `Gentle rain falling pitter patter, ${hint}, relaxing weather, loop-friendly`,
    thunder: `Distant thunder rumble boom, ${hint}, weather, not too scary`,
    "ocean-waves": `Ocean waves crashing on beach, ${hint}, relaxing nature`,
    "door-bell": `Home doorbell ding dong chime, ${hint}, clear indoor sound`,
    vacuum: `Vacuum cleaner humming and whooshing, ${hint}, household appliance`,
    microwave: `Microwave oven beep ding, ${hint}, kitchen appliance`,
    piano: `Single piano note plink, ${hint}, musical instrument, clean tone`,
    drums: `Drum kit boom and tap beat, ${hint}, percussion`,
    trumpet: `Trumpet toot brass note, ${hint}, musical instrument`,
  };

  return (
    byItem[item.id] ??
    `Realistic ${name} ${label} sound effect, ${hint}, clean recording for toddlers, no music, no speech`
  );
}

export function collectWorldAudioJobs(
  worldId: WorldId,
  items: WorldManifestItem[],
): WorldAudioJob[] {
  const jobs: WorldAudioJob[] = [];

  for (const item of items) {
    for (const sound of item.sounds) {
      jobs.push({
        worldId,
        gcsPath: sound.gcsPath,
        kind: "sound_effect",
        prompt: buildWorldSoundEffectPrompt(item, sound),
        durationSec: clampDuration(sound.durationSec),
        promptInfluence: 0.85,
        itemId: item.id,
        assetId: sound.id,
      });
    }

    jobs.push({
      worldId,
      gcsPath: item.narration.introGcsPath,
      kind: "narration",
      prompt: item.narration.intro,
      durationSec: estimateNarrationDuration(item.narration.intro),
      itemId: item.id,
      assetId: "narration-intro",
    });

    jobs.push({
      worldId,
      gcsPath: item.narration.soundCueGcsPath,
      kind: "narration",
      prompt: item.narration.soundCue,
      durationSec: estimateNarrationDuration(item.narration.soundCue),
      itemId: item.id,
      assetId: "narration-sound",
    });
  }

  return jobs;
}
