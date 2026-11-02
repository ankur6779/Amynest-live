/**
 * Install attribution — captures UTM/campaign params, Play Install Referrer,
 * and referral codes into a unified install_source payload for analytics.
 */

import { detectDevicePlatform } from "@/lib/device-id";
import { trackGrowthEvent } from "@/lib/growth-analytics";
import { initMetaAttribution } from "@/lib/meta-attribution";

const STORAGE_KEY = "amynest:install_attribution";
const LAST_TOUCH_KEY = "amynest:last_touch_attribution";
const CAPTURED_KEY = "amynest:install_attribution_captured";
const ANDROID_REFERRER_WAIT_MS = 2500;

export type InstallAttribution = {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  gclid?: string;
  gbraid?: string;
  wbraid?: string;
  fbclid?: string;
  ref?: string;
  landingPath?: string;
  playReferrer?: string;
  playClickTimestamp?: number;
  playInstallTimestamp?: number;
  campaignId?: string;
  capturedAt: string;
};

export type LastTouchAttribution = {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  gclid?: string;
  gbraid?: string;
  wbraid?: string;
  fbclid?: string;
  campaignId?: string;
  at: string;
};

const FIRST_TOUCH_KEYS = [
  "utmSource",
  "utmMedium",
  "utmCampaign",
  "utmContent",
  "utmTerm",
  "gclid",
  "gbraid",
  "wbraid",
  "fbclid",
  "ref",
  "campaignId",
  "playReferrer",
] as const satisfies readonly (keyof InstallAttribution)[];

function hasValue(value: unknown): boolean {
  return typeof value === "string" ? value.trim().length > 0 : value != null && value !== "";
}

function clickConflict(existing: InstallAttribution, incoming: Partial<InstallAttribution>): boolean {
  for (const key of ["gclid", "gbraid", "wbraid", "fbclid"] as const) {
    if (hasValue(existing[key]) && hasValue(incoming[key]) && existing[key] !== incoming[key]) return true;
  }
  return false;
}

/** Fill only empty first-touch fields. A stored click id is never replaced. */
function keepFirstTouch(existing: InstallAttribution, incoming: Partial<InstallAttribution>): InstallAttribution {
  if (clickConflict(existing, incoming)) {
    const kept: InstallAttribution = { ...existing, capturedAt: existing.capturedAt };
    if (!kept.playReferrer && incoming.playReferrer) kept.playReferrer = incoming.playReferrer;
    if (!kept.playClickTimestamp && incoming.playClickTimestamp) kept.playClickTimestamp = incoming.playClickTimestamp;
    if (!kept.playInstallTimestamp && incoming.playInstallTimestamp) {
      kept.playInstallTimestamp = incoming.playInstallTimestamp;
    }
    return kept;
  }
  const next: InstallAttribution = { ...existing, capturedAt: existing.capturedAt };
  for (const key of FIRST_TOUCH_KEYS) {
    if (!hasValue(next[key]) && hasValue(incoming[key])) {
      next[key] = incoming[key] as never;
    }
  }
  if (!next.landingPath && incoming.landingPath) next.landingPath = incoming.landingPath;
  if (!next.playClickTimestamp && incoming.playClickTimestamp) next.playClickTimestamp = incoming.playClickTimestamp;
  if (!next.playInstallTimestamp && incoming.playInstallTimestamp) {
    next.playInstallTimestamp = incoming.playInstallTimestamp;
  }
  return next;
}

function writeLastTouch(incoming: Partial<InstallAttribution>): void {
  const signal = FIRST_TOUCH_KEYS.some((key) => hasValue(incoming[key]));
  if (!signal) return;
  const snapshot: LastTouchAttribution = {
    utmSource: incoming.utmSource,
    utmMedium: incoming.utmMedium,
    utmCampaign: incoming.utmCampaign,
    gclid: incoming.gclid,
    gbraid: incoming.gbraid,
    wbraid: incoming.wbraid,
    fbclid: incoming.fbclid,
    campaignId: incoming.campaignId,
    at: new Date().toISOString(),
  };
  try {
    localStorage.setItem(LAST_TOUCH_KEY, JSON.stringify(snapshot));
  } catch {
    /* ignore */
  }
}

export function readLastTouchAttribution(): LastTouchAttribution | null {
  try {
    const raw = localStorage.getItem(LAST_TOUCH_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as LastTouchAttribution;
  } catch {
    return null;
  }
}

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

function parseReferrerQuery(referrer: string): Partial<InstallAttribution> {
  const result: Partial<InstallAttribution> = {};
  if (!referrer.trim()) return result;
  try {
    const params = new URLSearchParams(referrer);
    const utmSource = params.get("utm_source") ?? params.get("source");
    const utmMedium = params.get("utm_medium") ?? params.get("medium");
    const utmCampaign = params.get("utm_campaign") ?? params.get("campaign");
    const utmContent = params.get("utm_content");
    const utmTerm = params.get("utm_term");
    const gclid = params.get("gclid");
    const gbraid = params.get("gbraid");
    const wbraid = params.get("wbraid");
    if (utmSource && utmSource !== "(not set)") result.utmSource = utmSource;
    if (utmMedium && utmMedium !== "(not set)") result.utmMedium = utmMedium;
    if (utmCampaign && utmCampaign !== "(not set)") result.utmCampaign = utmCampaign;
    if (utmContent) result.utmContent = utmContent;
    if (utmTerm) result.utmTerm = utmTerm;
    if (gclid) result.gclid = gclid;
    if (gbraid) result.gbraid = gbraid;
    if (wbraid) result.wbraid = wbraid;
    const campaignId = params.get("campaign_id") ?? params.get("campaignid");
    if (campaignId) result.campaignId = campaignId;
    else if (utmCampaign && /^\d{6,}$/.test(utmCampaign)) result.campaignId = utmCampaign;
  } catch {
    /* ignore malformed referrer strings */
  }
  return result;
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
  const gbraid = params.get("gbraid");
  const wbraid = params.get("wbraid");
  const fbclid = params.get("fbclid");
  const ref = params.get("ref");
  if (utmSource) result.utmSource = utmSource;
  if (utmMedium) result.utmMedium = utmMedium;
  if (utmCampaign) result.utmCampaign = utmCampaign;
  if (utmContent) result.utmContent = utmContent;
  if (utmTerm) result.utmTerm = utmTerm;
  if (gclid) result.gclid = gclid;
  if (gbraid) result.gbraid = gbraid;
  if (wbraid) result.wbraid = wbraid;
  if (fbclid) result.fbclid = fbclid;
  if (ref) result.ref = ref;
  const campaignId = params.get("campaign_id") ?? params.get("campaignid");
  if (campaignId) result.campaignId = campaignId;
  else if (utmCampaign && /^\d{6,}$/.test(utmCampaign)) result.campaignId = utmCampaign;
  result.landingPath = window.location.pathname;
  return result;
}

function mergePlayReferrer(existing: InstallAttribution, play: PlayInstallReferrer): InstallAttribution {
  const fromReferrer = play.referrer ? parseReferrerQuery(play.referrer) : {};
  writeLastTouch(fromReferrer);
  return keepFirstTouch(existing, {
    ...fromReferrer,
    playReferrer: play.referrer,
    playClickTimestamp: play.clickTimestamp,
    playInstallTimestamp: play.installTimestamp,
  });
}

function resolveInstallSource(attr: InstallAttribution | null | undefined): string {
  if (!attr) return "unknown";
  if (attr.gclid) return "google_ads";
  if (attr.fbclid) return "meta_ads";
  const utm = attr.utmSource?.toLowerCase() ?? "";
  if (utm.includes("google")) return "google_ads";
  if (utm.includes("facebook") || utm.includes("meta") || utm.includes("ig") || utm.includes("instagram")) {
    return "meta_ads";
  }
  if (attr.utmSource) return attr.utmSource;
  if (attr.ref) return "referral";
  if (attr.playReferrer) return "play_referrer";
  return "organic";
}

export function getInstallSourceLabel(attr?: InstallAttribution | null): string {
  return resolveInstallSource(attr ?? readAttribution());
}

function buildInstallSourcePayload(attr: InstallAttribution) {
  const source = resolveInstallSource(attr);
  return {
    source,
    utm_source: attr.utmSource,
    utm_medium: attr.utmMedium,
    utm_campaign: attr.utmCampaign,
    gclid: attr.gclid,
    fbclid: attr.fbclid,
    gbraid: attr.gbraid,
    wbraid: attr.wbraid,
    campaign_id: attr.campaignId,
    ref: attr.ref,
    landing_path: attr.landingPath,
    play_referrer: attr.playReferrer,
  };
}

/** Capture campaign params from current URL on first visit. */
export function captureCampaignAttribution(): InstallAttribution {
  const existing = readAttribution();
  const fromUrl = parseUtmFromUrl();
  const merged = keepFirstTouch(existing ?? { capturedAt: new Date().toISOString() }, fromUrl);
  if (!existing || JSON.stringify(merged) !== JSON.stringify(existing)) {
    writeAttribution(merged);
  }
  writeLastTouch(fromUrl);
  initMetaAttribution();
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

/** Emit install_source once per device fingerprint for dashboard funnels. */
export function emitInstallSourceOnce(): void {
  const attr = readAttribution() ?? captureCampaignAttribution();
  const payload = buildInstallSourcePayload(attr);
  const fingerprint = JSON.stringify(payload);

  try {
    const prev = localStorage.getItem(CAPTURED_KEY);
    if (prev === fingerprint) return;
  } catch {
    return;
  }

  trackGrowthEvent("install_source", payload);

  try {
    localStorage.setItem(CAPTURED_KEY, fingerprint);
  } catch {
    /* ignore */
  }
}

export function getInstallAttribution(): InstallAttribution | null {
  return readAttribution();
}

function scheduleInstallSourceEmit(): void {
  if (detectDevicePlatform() === "android") {
    let fallbackScheduled = false;
    const onReferrer = () => {
      capturePlayInstallReferrer();
      emitInstallSourceOnce();
    };
    window.addEventListener("amynest-install-referrer", onReferrer);
    window.setTimeout(() => {
      if (fallbackScheduled) return;
      fallbackScheduled = true;
      capturePlayInstallReferrer();
      emitInstallSourceOnce();
    }, ANDROID_REFERRER_WAIT_MS);
    return;
  }
  emitInstallSourceOnce();
}

export function initInstallAttributionListeners(): void {
  if (typeof window === "undefined") return;
  captureCampaignAttribution();
  capturePlayInstallReferrer();
  window.addEventListener("amynest-install-referrer", () => {
    capturePlayInstallReferrer();
    emitInstallSourceOnce();
  });
  scheduleInstallSourceEmit();
}
