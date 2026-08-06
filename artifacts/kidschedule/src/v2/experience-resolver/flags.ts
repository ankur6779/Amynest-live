import { isV2FlagEnabled } from "@/lib/feature-flags";

/** Shared Experience Resolver kill switch — default OFF. */
export function isAmyExperienceResolverEnabled(): boolean {
  return isV2FlagEnabled("amy_experience_resolver_v2");
}
