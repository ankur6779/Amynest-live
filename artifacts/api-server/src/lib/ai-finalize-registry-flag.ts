import { readEnv } from "./env.js";

/** When true, migrated routes use the contract registry for inline + poll responses. */
export function isAiFinalizeRegistryEnabled(): boolean {
  const v = readEnv("AI_FINALIZE_REGISTRY")?.toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}
