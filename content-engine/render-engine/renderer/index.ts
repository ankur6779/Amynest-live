/** Renderer selection surface — providers implement RenderProvider. */
export {
  createDefaultRenderRegistry,
  FFmpegRenderer,
  FutureRenderer,
  MockRenderer,
  RemotionRenderer,
  RenderProviderRegistry,
  type RenderProvider,
  type RenderProviderRegistryOptions,
} from "../providers/index.js";
