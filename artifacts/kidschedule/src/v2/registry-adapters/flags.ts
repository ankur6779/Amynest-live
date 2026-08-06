import { isV2FlagEnabled } from "@/lib/feature-flags";

/** Registry Adapter Layer kill switch — default OFF. */
export function isAmyRegistryAdaptersEnabled(): boolean {
  return isV2FlagEnabled("amy_registry_adapters_v2");
}
