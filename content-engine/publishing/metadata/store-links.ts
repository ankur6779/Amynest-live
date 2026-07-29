/**
 * Official store / web URLs for YouTube descriptions.
 * Read from env — never hardcode in call sites.
 */

export interface AmyNestStoreLinks {
  playStoreUrl: string;
  appStoreUrl: string;
  websiteUrl: string;
  getAppUrl: string;
}

const DEFAULTS: AmyNestStoreLinks = {
  playStoreUrl: "https://play.google.com/store/apps/details?id=com.amynest.app",
  appStoreUrl:
    "https://apps.apple.com/us/app/amynest-ai-smart-parenting/id6767664343",
  websiteUrl: "https://amynest.in",
  getAppUrl: "https://amynest.in/get-app",
};

function envUrl(name: string, fallback: string): string {
  const raw = process.env[name]?.trim();
  return raw || fallback;
}

/** Resolve Play / App Store / website URLs from configuration env. */
export function resolveStoreLinks(
  overrides: Partial<AmyNestStoreLinks> = {},
): AmyNestStoreLinks {
  return {
    playStoreUrl:
      overrides.playStoreUrl?.trim() ||
      envUrl("PLAY_STORE_URL", DEFAULTS.playStoreUrl),
    appStoreUrl:
      overrides.appStoreUrl?.trim() ||
      envUrl("APP_STORE_URL", DEFAULTS.appStoreUrl),
    websiteUrl:
      overrides.websiteUrl?.trim() ||
      envUrl("WEBSITE_URL", DEFAULTS.websiteUrl),
    getAppUrl:
      overrides.getAppUrl?.trim() ||
      envUrl("GET_APP_URL", DEFAULTS.getAppUrl),
  };
}
