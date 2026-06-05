import { afterEach, describe, expect, it, vi } from "vitest";
import { trackGetAppFunnelEvent, trackMarketingEvent } from "./ga4-analytics";

describe("ga4-analytics", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("maps get-app landing_page_view to get_app_page_view", () => {
    const gtag = vi.fn();
    window.dataLayer = [];
    window.gtag = gtag;

    trackGetAppFunnelEvent("landing_page_view", { store_target: "android" });

    expect(gtag).toHaveBeenCalledWith(
      "event",
      "get_app_page_view",
      expect.objectContaining({ event: "get_app_page_view", store_target: "android", page: "get-app" }),
    );
  });

  it("dispatches custom marketing events", () => {
    const handler = vi.fn();
    window.addEventListener("amynest_marketing_event", handler);
    window.dataLayer = [];
    window.gtag = vi.fn();

    trackMarketingEvent("store_button_click", { store: "ios", location: "hero" });

    expect(handler).toHaveBeenCalled();
    expect(window.gtag).toHaveBeenCalledWith(
      "event",
      "store_button_click",
      expect.objectContaining({ store: "ios", location: "hero" }),
    );
  });
});
