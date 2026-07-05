/**
 * Meta Pixel for the /get-app marketing landing — app download funnel.
 * Uses the dedicated Ads Manager pixel (separate from in-app login/purchase pixel).
 */

import {
  buildMetaEventParams,
  initMetaAttribution,
  META_PIXEL_ID,
} from "@/lib/meta-attribution";

/** Meta Events Manager pixel for get-app / app-install campaigns. */
export const META_GET_APP_PIXEL_ID = "1237814008328308";

type MetaWindow = Window & {
  fbq?: (...args: unknown[]) => void;
  _fbq?: (...args: unknown[]) => void;
};

let getAppPixelInited = false;

function callFbq(...args: unknown[]): void {
  if (typeof window === "undefined") return;
  try {
    (window as MetaWindow).fbq?.(...args);
  } catch {
    /* pixel optional */
  }
}

/** Load fbevents.js when the SPA route loads before index.html pixel is ready. */
function ensureFbqLoader(): void {
  if (typeof window === "undefined") return;
  const w = window as MetaWindow;
  if (w.fbq) return;

  const n = function (...args: unknown[]) {
    if (n.callMethod) {
      (n.callMethod as (...a: unknown[]) => void).apply(n, args);
    } else {
      n.queue.push(args);
    }
  } as MetaWindow["fbq"] & {
    callMethod?: (...args: unknown[]) => void;
    queue: unknown[][];
    loaded?: boolean;
    version?: string;
    push?: (...args: unknown[]) => void;
  };

  if (!w._fbq) w._fbq = n;
  n.push = n;
  n.loaded = true;
  n.version = "2.0";
  n.queue = [];
  w.fbq = n;

  const script = document.createElement("script");
  script.async = true;
  script.src = "https://connect.facebook.net/en_US/fbevents.js";
  const first = document.getElementsByTagName("script")[0];
  first?.parentNode?.insertBefore(script, first);
}

/** Init the get-app pixel once per session (main app pixel may already be loaded). */
export function initMetaGetAppPixel(): void {
  if (typeof window === "undefined" || getAppPixelInited) return;
  ensureFbqLoader();
  initMetaAttribution();
  callFbq("init", META_GET_APP_PIXEL_ID);
  getAppPixelInited = true;
}

export function trackMetaGetAppPageView(meta?: {
  store_target?: string;
  headline_variant?: string;
}): void {
  initMetaGetAppPixel();
  const params = buildMetaEventParams({
    content_name: "get-app",
    content_category: "app_download",
    ...meta,
  });
  callFbq("trackSingle", META_GET_APP_PIXEL_ID, "PageView", params);
  callFbq("trackSingle", META_GET_APP_PIXEL_ID, "ViewContent", params);
}

/** Play Store / App Store click — primary app-download conversion for Meta ads. */
export function trackMetaAppDownloadClick(meta: {
  store: "android" | "ios";
  location: string;
}): void {
  initMetaGetAppPixel();
  const params = buildMetaEventParams({
    content_name: meta.store === "ios" ? "app_store" : "play_store",
    content_category: "app_download",
    store: meta.store,
    location: meta.location,
  });
  callFbq("trackSingle", META_GET_APP_PIXEL_ID, "Lead", params);
  callFbq("trackCustom", "App Download Intent", params);
}

/** Pixel IDs active on marketing routes (for diagnostics). */
export function metaPixelIdsForPath(pathname: string): string[] {
  if (pathname === "/get-app" || pathname.startsWith("/get-app/")) {
    return [META_GET_APP_PIXEL_ID, META_PIXEL_ID];
  }
  return [META_PIXEL_ID];
}
