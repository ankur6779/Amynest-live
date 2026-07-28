export type { PublishingProvider } from "./types.js";
export {
  PublishingError,
  isPublishingError,
  toPublishingError,
} from "./errors.js";
export {
  MockPublishingProvider,
  type MockPublishingProviderOptions,
} from "./mock.js";
export {
  YouTubePublishingProvider,
  type YouTubePublishingProviderOptions,
} from "./youtube.js";
export { FuturePublishingProvider } from "./future.js";
export {
  PublishingProviderRegistry,
  createDefaultPublishingRegistry,
  type ProviderFallbackMode,
  type PublishingProviderRegistryOptions,
} from "./registry.js";
export {
  readYouTubeOAuthCredentials,
  refreshYouTubeAccessToken,
  resolveYouTubeAccessToken,
  type ResolveYouTubeAccessTokenOptions,
  type YouTubeAccessTokenResult,
  type YouTubeOAuthCredentials,
} from "./oauth.js";
