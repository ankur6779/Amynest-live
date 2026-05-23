import type { CountryCode } from "../types.js";
import type { ExtractFeaturesContext } from "./featureExtractor.js";
import {
  GradientBoostedActionModel,
  createDefaultModelWeights,
  type GbtModelWeights,
} from "./model.js";

export function buildSegmentKey(
  ctx: ExtractFeaturesContext & { countryCode?: CountryCode | "GLOBAL" },
): string {
  const country = ctx.countryCode ?? "GLOBAL";
  return `${ctx.ageBand}|${country}|${ctx.developmentStage}`;
}

/** Per-segment models (preferred over single global model). */
export class SegmentModelRegistry {
  private models = new Map<string, GradientBoostedActionModel>();
  private explorationWeightBoost = new Map<string, number>();

  getModel(segmentKey: string): GradientBoostedActionModel {
    let model = this.models.get(segmentKey);
    if (!model) {
      model = new GradientBoostedActionModel(createDefaultModelWeights());
      this.models.set(segmentKey, model);
    }
    return model;
  }

  getExplorationWeightBoost(segmentKey: string): number {
    return this.explorationWeightBoost.get(segmentKey) ?? 0;
  }

  boostExplorationWeight(segmentKey: string, delta = 0.05): void {
    const cur = this.getExplorationWeightBoost(segmentKey);
    this.explorationWeightBoost.set(segmentKey, Math.min(0.25, cur + delta));
  }

  exportSegment(segmentKey: string): GbtModelWeights | null {
    return this.models.get(segmentKey)?.exportWeights() ?? null;
  }

  loadSegment(segmentKey: string, weights: GbtModelWeights): void {
    const model = new GradientBoostedActionModel(weights);
    this.models.set(segmentKey, model);
  }

  segmentCount(): number {
    return this.models.size;
  }

  reset(): void {
    this.models.clear();
    this.explorationWeightBoost.clear();
  }
}

let globalRegistry: SegmentModelRegistry | null = null;

export function getSegmentModelRegistry(): SegmentModelRegistry {
  if (!globalRegistry) globalRegistry = new SegmentModelRegistry();
  return globalRegistry;
}

export function resetSegmentModelRegistry(): void {
  globalRegistry = null;
}
