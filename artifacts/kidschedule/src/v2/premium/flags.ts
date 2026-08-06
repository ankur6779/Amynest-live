/**
 * Sprint 3B — Premium V2 flag. Default OFF.
 */

import { isV2FlagEnabled } from "@/lib/feature-flags";

export function isPremiumV2Enabled(): boolean {
  return isV2FlagEnabled("premium_v2");
}
