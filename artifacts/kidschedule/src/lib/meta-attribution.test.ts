// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/geo", () => ({
  isIndiaRegion: vi.fn(() => false),
}));

import {
  buildFbcValue,
  buildMetaEventParams,
  initMetaAttribution,
  syncFbcCookieFromFbclid,
  trackMetaCompleteRegistration,
  trackMetaSubscribe,
  resolveMetaPlanPrice,
} from "./meta-attribution";
import { isIndiaRegion } from "@/lib/geo";

const STORAGE_KEY = "amynest:install_attribution";

describe("meta-attribution", () => {
  beforeEach(() => {
    localStorage.clear();
    document.cookie = "";
    vi.mocked(isIndiaRegion).mockReturnValue(false);
    vi.stubGlobal("fbq", vi.fn());
    delete (window as Window & { location?: Location }).location;
    window.location = new URL("https://www.amynest.in/?fbclid=click123") as unknown as Location;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("builds Meta _fbc cookie value", () => {
    expect(buildFbcValue("abc", 1_700_000_000_000)).toBe("fb.1.1700000000000.abc");
  });

  it("sets _fbc cookie from fbclid", () => {
    syncFbcCookieFromFbclid("testfbclid");
    expect(document.cookie).toContain("_fbc=");
    expect(document.cookie).toContain("testfbclid");
  });

  it("initMetaAttribution syncs fbclid from URL", () => {
    initMetaAttribution();
    expect(document.cookie).toContain("click123");
  });

  it("includes campaign_ids from stored utm_campaign", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        utmCampaign: "120214748304504567",
        capturedAt: new Date().toISOString(),
      }),
    );
    const params = buildMetaEventParams({ source: "pricing" });
    expect(params.campaign_ids).toBe("120214748304504567");
    expect(params.source).toBe("pricing");
  });

  it("fires CompleteRegistration with campaign context", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        utmCampaign: "camp-99",
        capturedAt: new Date().toISOString(),
      }),
    );
    trackMetaCompleteRegistration("google");
    const fbq = vi.mocked(window.fbq as (...args: unknown[]) => void);
    expect(fbq).toHaveBeenCalledWith(
      "track",
      "CompleteRegistration",
      expect.objectContaining({ campaign_ids: "camp-99", source: "google" }),
    );
    expect(fbq).toHaveBeenCalledWith(
      "trackCustom",
      "AmyNest login",
      expect.objectContaining({ campaign_ids: "camp-99", source: "google" }),
    );
  });

  it("fires Subscribe and Purchase with INR plan value", () => {
    vi.mocked(isIndiaRegion).mockReturnValue(true);
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        utmCampaign: "camp-1",
        capturedAt: new Date().toISOString(),
      }),
    );
    trackMetaSubscribe("yearly", { source: "pricing" });
    const fbq = vi.mocked(window.fbq as (...args: unknown[]) => void);
    expect(fbq).toHaveBeenCalledWith(
      "track",
      "Subscribe",
      expect.objectContaining({ value: 1499, currency: "INR", campaign_ids: "camp-1" }),
    );
    expect(fbq).toHaveBeenCalledWith(
      "track",
      "Purchase",
      expect.objectContaining({ value: 1499, currency: "INR" }),
    );
  });

  it("resolves USD fallback prices outside India", () => {
    expect(resolveMetaPlanPrice("monthly")).toEqual({ value: 4.99, currency: "USD" });
  });
});
