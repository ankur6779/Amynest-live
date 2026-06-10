import type { PlaygroundPlayMode } from "./types";

export type PlaygroundExtensionKind =
  | "voice_scenario"
  | "mini_game"
  | "input_modality"
  | "assessment"
  | "worksheet_generator"
  | "teacher_dashboard";

export interface ExtensionContext {
  childId: number;
  ageYears: number;
  playMode: PlaygroundPlayMode;
  featureFlags: Record<string, boolean>;
}

export interface PlaygroundExtension<TConfig = unknown> {
  id: string;
  kind: PlaygroundExtensionKind;
  minPlaygroundVersion: 3;
  isEnabled(ctx: ExtensionContext): boolean;
  config: TConfig;
}

export interface PlaygroundExtensionRegistry {
  register(ext: PlaygroundExtension): void;
  list(kind: PlaygroundExtensionKind, ctx: ExtensionContext): PlaygroundExtension[];
}

/** In-memory registry — Phase 4a scaffold; voice + mini-games register in later phases. */
export function createPlaygroundExtensionRegistry(): PlaygroundExtensionRegistry {
  const extensions: PlaygroundExtension[] = [];

  return {
    register(ext: PlaygroundExtension) {
      extensions.push(ext);
    },
    list(kind: PlaygroundExtensionKind, ctx: ExtensionContext) {
      return extensions.filter(
        (ext) => ext.kind === kind && ext.minPlaygroundVersion <= 3 && ext.isEnabled(ctx),
      );
    },
  };
}

/** Future conversational math — interface only (implemented in @workspace/math-playground-voice). */
export interface VoiceMathConversationBridge {
  startRound(): Promise<void>;
  onTranscript(text: string): unknown;
  onAmySpeakComplete(): void;
  endRound(): unknown;
}

/** Future camera object counting. */
export interface ObjectCountingInputBridge {
  detectCount(image: ImageBitmap): Promise<{ count: number; confidence: number }>;
}

/** Future sibling multiplayer challenges. */
export interface SiblingChallengeBridge {
  createRoom(childIds: number[]): Promise<string>;
  submitScore(roomId: string, score: number): Promise<void>;
}
