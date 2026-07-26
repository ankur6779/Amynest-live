/**
 * Golden baseline regression — fingerprint comparison.
 */

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { ScenarioPipelineOutput } from "./types.js";

export type BaselineStore = {
  version: string;
  updatedAt: string;
  overallScore: number | null;
  fingerprints: Record<string, string>;
};

const HERE = dirname(fileURLToPath(import.meta.url));
export const DEFAULT_BASELINES_PATH = join(HERE, "..", "golden", "baselines.json");

export function fingerprintOutput(output: ScenarioPipelineOutput): string {
  const payload = {
    meaningEngineVersion: output.meaningEngineVersion,
    developmentEngineVersion: output.developmentEngineVersion,
    adaptiveEngineVersion: output.adaptiveEngineVersion,
    conversationEngineVersion: output.conversationEngineVersion,
    evidenceEngineVersion: output.evidenceEngineVersion,
    meaningProfile: output.meaningProfile,
    developmentStage: output.developmentStage,
    developmentPriorities: output.developmentPriorities,
    engagementLevel: output.engagementLevel,
    conversationIntent: output.conversationIntent,
    conversationDepth: output.conversationDepth,
    conversationTone: output.conversationTone,
    conversationOrder: output.conversationOrder,
    safetyFlags: [...output.safetyFlags].sort(),
    avoidTopics: [...output.avoidTopics].sort(),
    evidenceTraceCount: output.evidenceTraceCount,
    evidenceEdgeCount: output.evidenceEdgeCount,
  };
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex").slice(0, 32);
}

export function loadBaselines(path = DEFAULT_BASELINES_PATH): BaselineStore | null {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8")) as BaselineStore;
  } catch {
    return null;
  }
}

export function saveBaselines(
  store: BaselineStore,
  path = DEFAULT_BASELINES_PATH,
): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(store, null, 2)}\n`, "utf8");
}

export function compareToBaseline(
  scenarioId: string,
  fingerprint: string,
  baselines: BaselineStore | null,
): { match: boolean | null; note: string } {
  if (!baselines) return { match: null, note: "no_baseline_store" };
  const expected = baselines.fingerprints[scenarioId];
  if (!expected) return { match: null, note: "no_baseline_for_scenario" };
  if (expected === fingerprint) return { match: true, note: "baseline_match" };
  return { match: false, note: "baseline_mismatch" };
}
