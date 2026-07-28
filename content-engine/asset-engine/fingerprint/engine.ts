import { createHash } from "node:crypto";
import type { AssetRequest } from "../../types/asset-package.js";

/** Deterministic fingerprint for prompt + type + geometry. */
export function fingerprintAssetRequest(request: Pick<
  AssetRequest,
  "assetType" | "prompt" | "resolution" | "aspectRatio" | "fallback" | "fingerprintSeed"
>): string {
  const material = [
    normalize(request.assetType),
    normalize(request.prompt),
    normalize(request.resolution),
    normalize(request.aspectRatio),
    normalize(request.fallback),
    normalize(request.fingerprintSeed),
  ].join("|");
  return createHash("sha256").update(material).digest("hex");
}

/** Similarity in [0,1] based on shared hex prefix length. */
export function fingerprintSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  const len = Math.min(a.length, b.length);
  let shared = 0;
  for (let i = 0; i < len; i++) {
    if (a[i] !== b[i]) break;
    shared += 1;
  }
  return shared / Math.max(a.length, b.length, 1);
}

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}
