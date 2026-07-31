/**
 * Performance Director v2.0 — additive acting layer on top of AI Director 1.2.0.
 * Direction / prompt enrichment only. No providers, validators, or render changes.
 */

import type { BrandCharacterId } from "../brand/types.js";

export const PERFORMANCE_DIRECTOR_VERSION = "2.0.0";

export type PerformanceRole =
  | "speaking"
  | "listening"
  | "reacting"
  | "moving"
  | "thinking"
  | "waiting";

export type DominantEmotion =
  | "Curiosity"
  | "Confusion"
  | "Hope"
  | "Achievement"
  | "Joy"
  | "Pride"
  | "Relief";

export type LipSyncStrategy =
  | "speaking-beat-medium"
  | "speaking-beat-ots"
  | "listening-reaction"
  | "external-narration-reactions";

export interface CharacterPerformanceCast {
  character: BrandCharacterId;
  role: PerformanceRole;
  beat: string;
}

export interface MicroActingBeat {
  atSecond: number;
  action: string;
}

export interface ScenePerformancePlan {
  sceneId: string;
  index: number;
  /** Cast with explicit actor jobs — never all frozen. */
  cast: CharacterPerformanceCast[];
  speaker: BrandCharacterId | "external-narration" | "none";
  listeners: BrandCharacterId[];
  reactors: BrandCharacterId[];
  movers: BrandCharacterId[];
  thinkers: BrandCharacterId[];
  waiters: BrandCharacterId[];
  dominantEmotion: DominantEmotion;
  relationshipNote: string;
  microActing: MicroActingBeat[];
  lipSyncStrategy: LipSyncStrategy;
  cameraMotivation: string;
  framingPreference: "over-the-shoulder" | "medium" | "close-up-safe" | "wide-group";
  groupScene: boolean;
  dialogueBeat: string;
}

export interface PerformanceDirectorPackage {
  id: string;
  version: typeof PERFORMANCE_DIRECTOR_VERSION;
  createdAt: string;
  title: string;
  filmActingObjective: string;
  scenes: ScenePerformancePlan[];
  /** Duo+ share among living scenes (legacy group metric). */
  groupSceneRatio: number;
  livingSceneCount: number;
  groupSceneCount: number;
  /** Scene complexity mix — target ~70% duo / ~20% solo / ~10% trio. */
  complexity: {
    soloRatio: number;
    duoRatio: number;
    trioRatio: number;
    avgCharactersPerShot: number;
  };
  summary: string;
}
