// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/meta-attribution", () => ({
  META_PIXEL_ID: "2514850758945614",
  initMetaAttribution: vi.fn(),
  buildMetaEventParams: vi.fn((extra = {}) => ({ campaign_ids: "camp-1", ...extra })),
}));

import {
  initMetaGetAppPixel,
  trackMetaGetAppPageView,
  trackMetaAppDownloadClick,
  META_GET_APP_PIXEL_ID,
  metaPixelIdsForPath,
} from "./meta-get-app-attribution";

describe("meta-get-app-attribution", () => {
  beforeEach(() => {
    vi.stubGlobal("fbq", vi.fn());
    window.location = new URL("https://www.amynest.in/get-app?fbclid=abc") as unknown as Location;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses the dedicated get-app pixel id", () => {
    expect(META_GET_APP_PIXEL_ID).toBe("1237814008328308");
  });

  it("inits get-app pixel once", () => {
    initMetaGetAppPixel();
    initMetaGetAppPixel();
    const fbq = vi.mocked(window.fbq as (...args: unknown[]) => void);
    expect(fbq).toHaveBeenCalledWith("init", META_GET_APP_PIXEL_ID);
    expect(fbq.mock.calls.filter((c) => c[0] === "init")).toHaveLength(1);
  });

  it("tracks page view on get-app", () => {
    trackMetaGetAppPageView({ store_target: "android" });
    const fbq = vi.mocked(window.fbq as (...args: unknown[]) => void);
    expect(fbq).toHaveBeenCalledWith(
      "trackSingle",
      META_GET_APP_PIXEL_ID,
      "PageView",
      expect.objectContaining({ content_name: "get-app", store_target: "android" }),
    );
    expect(fbq).toHaveBeenCalledWith(
      "trackSingle",
      META_GET_APP_PIXEL_ID,
      "ViewContent",
      expect.objectContaining({ campaign_ids: "camp-1" }),
    );
  });

  it("tracks lead on store click", () => {
    trackMetaAppDownloadClick({ store: "android", location: "hero" });
    const fbq = vi.mocked(window.fbq as (...args: unknown[]) => void);
    expect(fbq).toHaveBeenCalledWith(
      "trackSingle",
      META_GET_APP_PIXEL_ID,
      "Lead",
      expect.objectContaining({ store: "android", location: "hero" }),
    );
    expect(fbq).toHaveBeenCalledWith(
      "trackCustom",
      "App Download Intent",
      expect.objectContaining({ content_name: "play_store" }),
    );
  });

  it("returns both pixel ids for get-app path", () => {
    expect(metaPixelIdsForPath("/get-app")).toContain("1237814008328308");
    expect(metaPixelIdsForPath("/dashboard")).toEqual(["2514850758945614"]);
  });
});
