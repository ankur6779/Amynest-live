/**
 * Feature flags for safe rollout of intelligence layers.
 * Env: BIRTH_SKY_FF_<LAYER>=0|1|true|false (default: enabled).
 */

import type { PipelineFeatureFlags, PipelineStageId } from "./types.js";

function envBool(key: string, defaultValue: boolean): boolean {
  const raw = process.env[key];
  if (raw === undefined || raw === "") return defaultValue;
  const v = raw.trim().toLowerCase();
  if (v === "0" || v === "false" || v === "off" || v === "no") return false;
  if (v === "1" || v === "true" || v === "on" || v === "yes") return true;
  return defaultValue;
}

/** Master kill for intelligence enrichments (astronomy still works). */
export function resolvePipelineFeatureFlags(
  env: Record<string, string | undefined> = process.env as Record<
    string,
    string | undefined
  >,
): PipelineFeatureFlags {
  const master = envBoolFrom(env, "BIRTH_SKY_FF_INTELLIGENCE", true);
  if (!master) {
    return {
      meaning: false,
      development: false,
      adaptive: false,
      conversation: false,
      evidence: false,
      evaluation: false,
    };
  }
  return {
    meaning: envBoolFrom(env, "BIRTH_SKY_FF_MEANING", true),
    development: envBoolFrom(env, "BIRTH_SKY_FF_DEVELOPMENT", true),
    adaptive: envBoolFrom(env, "BIRTH_SKY_FF_ADAPTIVE", true),
    conversation: envBoolFrom(env, "BIRTH_SKY_FF_CONVERSATION", true),
    evidence: envBoolFrom(env, "BIRTH_SKY_FF_EVIDENCE", true),
    evaluation: envBoolFrom(env, "BIRTH_SKY_FF_EVALUATION", true),
  };
}

function envBoolFrom(
  env: Record<string, string | undefined>,
  key: string,
  defaultValue: boolean,
): boolean {
  const raw = env[key];
  if (raw === undefined || raw === "") return defaultValue;
  const v = raw.trim().toLowerCase();
  if (v === "0" || v === "false" || v === "off" || v === "no") return false;
  if (v === "1" || v === "true" || v === "on" || v === "yes") return true;
  return defaultValue;
}

export function isStageEnabled(
  flags: PipelineFeatureFlags,
  stage: PipelineStageId,
): boolean {
  return Boolean(flags[stage]);
}

/** Test helper — avoid leaking process.env mutations. */
export function flagsAllEnabled(): PipelineFeatureFlags {
  return {
    meaning: true,
    development: true,
    adaptive: true,
    conversation: true,
    evidence: true,
    evaluation: true,
  };
}

void envBool;
