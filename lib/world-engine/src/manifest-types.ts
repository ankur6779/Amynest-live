import type { WorldId } from "./types.js";

/** Shared on-disk / GCS manifest shape for all discovery worlds. */
export type WorldManifestSound = {
  id: string;
  label: string;
  gcsPath: string;
  durationSec: number;
  waveform: number[];
};

export type WorldManifestNarration = {
  intro: string;
  introGcsPath: string;
  soundCue: string;
  soundCueGcsPath: string;
};

export type WorldManifestItem = {
  id: string;
  name: string;
  category: string;
  emoji: string;
  imageGcsPath: string;
  heroRealGcsPath?: string;
  heroCartoonGcsPath?: string;
  funFact?: string;
  sounds: WorldManifestSound[];
  narration: WorldManifestNarration;
  quizSoundId: string;
  quizPrompt: string;
};

export type WorldManifest = {
  version: number;
  worldId: WorldId;
  /** Relative to bucket root, e.g. worlds/vehicles/manifest.json */
  manifestPath: string;
  categories: Array<{ id: string; label: string; emoji: string }>;
  items: WorldManifestItem[];
};
