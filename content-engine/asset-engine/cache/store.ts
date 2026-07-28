import type {
  AssetCachePolicy,
  ResolvedAsset,
} from "../../types/asset-package.js";
import { ASSET_PACKAGE_VERSION } from "../../types/asset-package.js";
import { fingerprintSimilarity } from "../fingerprint/index.js";

export interface AssetCacheEntry {
  fingerprint: string;
  asset: ResolvedAsset;
  version: string;
  createdAt: string;
  expiresAt: string;
}

export interface AssetCacheStore {
  getExact(fingerprint: string): ResolvedAsset | undefined;
  getSimilar(fingerprint: string, threshold: number): ResolvedAsset | undefined;
  set(fingerprint: string, asset: ResolvedAsset, policy: AssetCachePolicy): void;
  invalidate(fingerprint: string): void;
  invalidateAll(): void;
  size(): number;
  listFingerprints(): string[];
}

export class InMemoryAssetCache implements AssetCacheStore {
  private readonly map = new Map<string, AssetCacheEntry>();
  private staleIgnored = 0;

  get staleIgnoredCount(): number {
    return this.staleIgnored;
  }

  getExact(fingerprint: string): ResolvedAsset | undefined {
    const entry = this.map.get(fingerprint);
    if (!entry) return undefined;
    if (this.isStale(entry)) {
      this.staleIgnored += 1;
      this.map.delete(fingerprint);
      return undefined;
    }
    return cloneAsset(entry.asset);
  }

  getSimilar(fingerprint: string, threshold: number): ResolvedAsset | undefined {
    const exact = this.getExact(fingerprint);
    if (exact) return exact;
    let best: { score: number; asset: ResolvedAsset } | undefined;
    for (const [key, entry] of this.map) {
      if (this.isStale(entry)) {
        this.staleIgnored += 1;
        this.map.delete(key);
        continue;
      }
      const score = fingerprintSimilarity(fingerprint, entry.fingerprint);
      if (score < threshold) continue;
      if (!best || score > best.score) {
        best = { score, asset: entry.asset };
      }
    }
    return best ? cloneAsset(best.asset) : undefined;
  }

  set(fingerprint: string, asset: ResolvedAsset, policy: AssetCachePolicy): void {
    const now = Date.now();
    this.map.set(fingerprint, {
      fingerprint,
      asset: cloneAsset({ ...asset, fromCache: true, status: "cached" }),
      version: policy.version || ASSET_PACKAGE_VERSION,
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + Math.max(1, policy.ttlSeconds) * 1000).toISOString(),
    });
  }

  invalidate(fingerprint: string): void {
    this.map.delete(fingerprint);
  }

  invalidateAll(): void {
    this.map.clear();
  }

  size(): number {
    return this.map.size;
  }

  listFingerprints(): string[] {
    return [...this.map.keys()];
  }

  private isStale(entry: AssetCacheEntry): boolean {
    if (!entry.version.startsWith("4.")) return true;
    return Date.parse(entry.expiresAt) <= Date.now();
  }
}

function cloneAsset(asset: ResolvedAsset): ResolvedAsset {
  return {
    ...asset,
    metadata: { ...asset.metadata },
  };
}
