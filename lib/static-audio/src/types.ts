export type StaticAudioMode = "default" | "phonics";

export type StaticAudioMap = {
  default: Record<string, string>;
  phonics: Record<string, string>;
};

export type StaticTtsEntry = {
  text: string;
  mode: StaticAudioMode;
};
