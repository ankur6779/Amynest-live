import { useEffect } from "react";
import { captureCampaignAttribution } from "@/lib/install-attribution";

/**
 * Captures UTM / campaign params on every page load and persists to localStorage.
 * Mounted high in the tree alongside ReferralAttributionBridge.
 */
export function CampaignAttributionBridge() {
  useEffect(() => {
    captureCampaignAttribution();
  }, []);

  return null;
}
