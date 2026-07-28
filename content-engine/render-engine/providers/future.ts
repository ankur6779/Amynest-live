import type {
  RenderJobRequest,
  RenderJobResult,
  RenderProviderHealth,
  RenderTimeEstimate,
} from "../../types/render-package.js";
import type { RenderProvider } from "./types.js";

export class FutureRenderer implements RenderProvider {
  readonly id = "future" as const;

  supportsGPU(): boolean {
    return false;
  }
  supportsTransparency(): boolean {
    return false;
  }
  supportsAudioMix(): boolean {
    return false;
  }

  async health(): Promise<RenderProviderHealth> {
    return {
      ok: false,
      message: "FutureRenderer is a reserved extension slot",
      checkedAt: new Date().toISOString(),
    };
  }

  estimateTime(_request: RenderJobRequest): RenderTimeEstimate {
    return { seconds: 0, confidence: "low" };
  }

  async cancel(_jobId: string): Promise<boolean> {
    return false;
  }

  async render(_request: RenderJobRequest): Promise<RenderJobResult> {
    throw new Error(
      "FutureRenderer is not configured. Register a concrete render provider implementation.",
    );
  }
}
