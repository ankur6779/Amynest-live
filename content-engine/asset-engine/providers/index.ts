export type { AssetProvider } from "./types.js";
export { BaseAssetProvider } from "./base.js";
export { LocalLibraryProvider, listLocalLibraryEntries } from "./local-library.js";
export { ScreenRecordingProvider } from "./screen-recording.js";
export { IllustrationProvider } from "./illustration.js";
export { PlaceholderProvider } from "./placeholder.js";
export {
  FutureAiProvider,
  createDefaultAiProviders,
  type FutureAiProviderOptions,
} from "./future-ai.js";
export {
  GeminiVideoProvider,
  GeminiVeoClient,
  GeminiVideoError,
  isGeminiVideoError,
  buildVeoPrompt,
  buildAmyNestTestVeoPrompt,
  estimateVeoCostUsd,
  resolveGeminiVideoSettings,
  type GenerateVideoOptions,
  type GeminiVideoProviderOptions,
  type VeoPromptInput,
  type VeoPromptResult,
} from "./gemini-video/index.js";
export {
  GeminiImageProvider,
  type GeminiImageProviderOptions,
  type GenerateImageOptions,
} from "./gemini-image/index.js";
export {
  GeminiTtsProvider,
  type GeminiTtsProviderOptions,
  type GenerateNarrationOptions,
} from "./gemini-tts/index.js";
export {
  GeminiMusicProvider,
  type GeminiMusicProviderOptions,
  type GenerateMusicOptions,
} from "./gemini-music/index.js";
