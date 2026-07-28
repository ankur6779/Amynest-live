import { createHash } from "node:crypto";
import type { AssetPackage } from "../../types/asset-package.js";
import type { StoryboardPackage } from "../../types/storyboard.js";
import type {
  RenderEngineSettings,
  RenderPackage,
} from "../../types/render-package.js";
import { RENDER_PACKAGE_VERSION } from "../../types/render-package.js";

export interface RenderCacheEntry {
  fingerprint: string;
  package: RenderPackage;
  version: string;
  createdAt: string;
}

export interface RenderCacheStore {
  get(fingerprint: string): RenderPackage | undefined;
  set(fingerprint: string, pkg: RenderPackage): void;
  invalidate(fingerprint: string): void;
  clear(): void;
  size(): number;
}

export class InMemoryRenderCache implements RenderCacheStore {
  private readonly map = new Map<string, RenderCacheEntry>();

  get(fingerprint: string): RenderPackage | undefined {
    const entry = this.map.get(fingerprint);
    if (!entry) return undefined;
    if (entry.version !== RENDER_PACKAGE_VERSION) {
      this.map.delete(fingerprint);
      return undefined;
    }
    return structuredClone(entry.package);
  }

  set(fingerprint: string, pkg: RenderPackage): void {
    this.map.set(fingerprint, {
      fingerprint,
      package: structuredClone(pkg),
      version: RENDER_PACKAGE_VERSION,
      createdAt: new Date().toISOString(),
    });
  }

  invalidate(fingerprint: string): void {
    this.map.delete(fingerprint);
  }

  clear(): void {
    this.map.clear();
  }

  size(): number {
    return this.map.size;
  }
}

/** Fingerprint storyboard + assets + render config for cache reuse. */
export function buildRenderFingerprint(input: {
  storyboard: StoryboardPackage;
  assets: AssetPackage;
  settings: Pick<
    RenderEngineSettings,
    | "renderer"
    | "fps"
    | "bitrate"
    | "codec"
    | "audioCodec"
    | "subtitleMode"
    | "watermark"
    | "outputContainer"
    | "hardwareAcceleration"
  >;
}): string {
  const assetFingerprints = input.assets.resolvedAssets
    .map((a) => a.fingerprint)
    .sort()
    .join(",");
  const material = [
    input.storyboard.id,
    input.storyboard.version,
    JSON.stringify(input.storyboard.timeline),
    JSON.stringify(input.storyboard.transitionPlan),
    JSON.stringify(input.storyboard.captionPlan),
    input.assets.id,
    assetFingerprints,
    input.settings.renderer,
    String(input.settings.fps),
    input.settings.bitrate,
    input.settings.codec,
    input.settings.audioCodec,
    input.settings.subtitleMode,
    String(input.settings.watermark),
    input.settings.outputContainer,
    input.settings.hardwareAcceleration,
    RENDER_PACKAGE_VERSION,
  ].join("|");
  return createHash("sha256").update(material).digest("hex");
}
