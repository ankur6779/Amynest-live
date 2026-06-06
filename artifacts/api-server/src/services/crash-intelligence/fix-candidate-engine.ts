/**
 * Root Cause → Fix Candidate Engine orchestrator.
 * Read-only analysis — never modifies source or deploys.
 */
import { SOURCE_MAPPINGS } from "./source-mappings.js";
import { buildReviewPackageCore } from "./review-package.js";
import type { EngineeringReviewPackage } from "./types.js";

export function listMappedFingerprints(): string[] {
  return SOURCE_MAPPINGS.map((m) => m.readableFingerprint);
}

export async function analyzeFingerprint(
  readableFingerprint: string,
): Promise<EngineeringReviewPackage> {
  return buildReviewPackageCore(readableFingerprint, null);
}

export async function analyzeAllMappedFingerprints(): Promise<
  EngineeringReviewPackage[]
> {
  const packages: EngineeringReviewPackage[] = [];
  for (const fp of listMappedFingerprints()) {
    packages.push(await buildReviewPackageCore(fp, null));
  }
  return packages;
}
