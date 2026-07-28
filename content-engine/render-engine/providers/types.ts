import type {
  RenderJobRequest,
  RenderJobResult,
  RenderProviderHealth,
  RenderProviderId,
  RenderTimeEstimate,
} from "../../types/render-package.js";

/**
 * Provider-agnostic render contract.
 * Orchestration never hardcodes vendor SDKs — only this interface.
 */
export interface RenderProvider {
  readonly id: RenderProviderId;
  health(): Promise<RenderProviderHealth>;
  render(request: RenderJobRequest): Promise<RenderJobResult>;
  cancel(jobId: string): Promise<boolean>;
  estimateTime(request: RenderJobRequest): RenderTimeEstimate;
  supportsGPU(): boolean;
  supportsTransparency(): boolean;
  supportsAudioMix(): boolean;
}
