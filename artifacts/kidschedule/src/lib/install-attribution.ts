/**
 * Install attribution — captures UTM/campaign params, Play Install Referrer,
 * and referral codes into a unified install_source payload for analytics.
 */

import { trackGrowthEvent } from "@/lib/growth-analytics";

const STORAGE_KEY = "amynest:install_attribution";
const CAPTURED_KEY = "amynest:install_attribution_captured";

export type InstallAttribution = {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  gclid?: string;
  fbclid?: string;
  ref?: string;
  landingPath?: string;
  playReferrer?: string;
  playClickTimestamp?: number;
  playInstallTimestamp?: number;
  capturedAt: string;
};

type PlayInstallReferrer = {
  referrer?: string;
  clickTimestamp?: number;
  installTimestamp?: number;
};

type AmyNestWindow = Window & {
  __AMYNEST_INSTALL_REFERRER?: PlayInstallReferrer;
};

function readAttribution(): InstallAttribution | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as InstallAttribution;
  } catch {
    return null;
  }
}

function writeAttribution(data: InstallAttribution): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

function parseUtmFromUrl(): Partial<InstallAttribution> {
  if (typeof window === "undefined") return {};
  const params = new URLSearchParams(window.location.search);
  const result: Partial<InstallAttribution> = {};
  const utmSource = params.get("utm_source");
  const utmMedium = params.get("utm_medium");
  const utmCampaign = params.get("utm_campaign");
  const utmContent = params.get("utm_content");
  const utmTerm = params.get("utm_term");
  const gclid = params.get("gclid");
  const fbclid = params.get("fbclid");
  const ref = params.get("ref");
  if (utmSource) result.utmSource = utmSource;
  if (utmMedium) result.utmMedium = utmMedium;
  if (utmCampaign) result.utmCampaign = utmCampaign;
  if (utmContent) result.utmContent = utmContent;
  if (utmTerm) result.utmTerm = utmTerm;
  if (gclid) result.gclid = gclid;
  if (fbclid) result.fbclid = fbclid;
  if (ref) result.ref = ref;
  result.landingPath = window.location.pathname;
  return result;
}

function mergePlayReferrer(existing: InstallAttribution, play: PlayInstallReferrer): InstallAttribution {
  return {
    ...existing,
    playReferrer: play.referrer ?? existing.playReferrer,
    playClickTimestamp: play.clickTimestamp ?? existing.playClickTimestamp,
    playInstallTimestamp: play.installTimestamp ?? existing.playInstallTimestamp,
  };
}

/** Capture campaign params from current URL on first visit. */
export function captureCampaignAttribution(): InstallAttribution {
  const existing = readAttribution();
  const fromUrl = parseUtmFromUrl();
  const hasNewData = Object.keys(fromUrl).some(
    (k) => k !== "landingPath" && fromUrl[k as keyof typeof fromUrl],
  );

  const merged: InstallAttribution = {
    ...(existing ?? { capturedAt: new Date().toISOString() }),
    ...fromUrl,
    capturedAt: existing?.capturedAt ?? new Date().toISOString(),
  };

  if (hasNewData || !existing) {
    writeAttribution(merged);
  }
  return merged;
}

/** Merge Play Install Referrer from Android native bridge. */
export function capturePlayInstallReferrer(): void {
  if (typeof window === "undefined") return;
  const play = (window as AmyNestWindow).__AMYNEST_INSTALL_REFERRER;
  if (!play?.referrer) return;
  const existing = readAttribution() ?? { capturedAt: new Date().toISOString() };
  writeAttribution(mergePlayReferrer(existing, play));
}

/** Emit install_source once per device for dashboard funnels. */
export function emitInstallSourceOnce(): void {
  try {
    if (localStorage.getItem(CAPTURED_KEY)) return;
  } catch {
    return;
  }

  const attr = readAttribution() ?? captureCampaignAttribution();
  const source =
    attr.utmSource ??
    (attr.ref ? "referral" : undefined) ??
    (attr.playReferrer ? "play_referrer" : undefined) ??
    "organic";

  trackGrowthEvent("install_source", {
    source,
    utm_source: attr.utmSource,
    utm_medium: attr.utmMedium,
    utm_campaign: attr.utmCampaign,
    ref: attr.ref,
    landing_path: attr.landingPath,
    play_referrer: attr.playReferrer,
  });

  try {
    localStorage.setItem(CAPTURED_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function getInstallAttribution(): InstallAttribution | null {
  return readAttribution();
}

export function initInstallAttributionListeners(): void {
  if (typeof window === "undefined") return;
  captureCampaignAttribution();
  capturePlayInstallReferrer();
  window.addEventListener("amynest-install-referrer", () => {
    capturePlayInstallReferrer();
    emitInstallSourceOnce();
  });
  emitInstallSourceOnce();
}
