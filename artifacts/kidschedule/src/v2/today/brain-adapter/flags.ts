import { isV2FlagEnabled } from "@/lib/feature-flags";

/** Today Brain Adapter kill switch — default OFF. Shadow reads only when enabled by callers. */
export function isAmyTodayBrainAdapterEnabled(): boolean {
  return isV2FlagEnabled("amy_today_brain_adapter_v2");
}
