// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

const trackGrowthEvent = vi.fn();

vi.mock("@/lib/growth-analytics", () => ({
  trackGrowthEvent: (...args: unknown[]) => trackGrowthEvent(...args),
}));

vi.mock("@/lib/meta-attribution", () => ({
  initMetaAttribution: vi.fn(),
}));

vi.mock("@/lib/device-id", () => ({
  detectDevicePlatform: () => "android",
}));

import {
  captureCampaignAttribution,
  capturePlayInstallReferrer,
  emitInstallSourceOnce,
  getInstallAttribution,
  getInstallSourceLabel,
} from "./install-attribution";

describe("install-attribution gbraid/wbraid", () => {
  beforeEach(() => {
    localStorage.clear();
    trackGrowthEvent.mockClear();
    window.history.replaceState({}, "", "/?gclid=g1&gbraid=gb-test&wbraid=wb-test&utm_source=google");
  });

  it("persists gbraid and wbraid from landing URL", () => {
    captureCampaignAttribution();
    const attr = getInstallAttribution();
    expect(attr?.gclid).toBe("g1");
    expect(attr?.gbraid).toBe("gb-test");
    expect(attr?.wbraid).toBe("wb-test");
    expect(attr?.utmSource).toBe("google");
  });

  it("merges Play Install Referrer campaign params when present", () => {
    captureCampaignAttribution();
    (window as Window & { __AMYNEST_INSTALL_REFERRER?: unknown }).__AMYNEST_INSTALL_REFERRER = {
      referrer: "utm_source=play&utm_medium=cpc&gclid=g2&gbraid=gb-play&wbraid=wb-play",
      clickTimestamp: 1,
      installTimestamp: 2,
    };
    capturePlayInstallReferrer();
    const attr = getInstallAttribution();
    expect(attr?.gclid).toBe("g2");
    expect(attr?.gbraid).toBe("gb-play");
    expect(attr?.wbraid).toBe("wb-play");
    expect(attr?.playReferrer).toContain("gb-play");
  });

  it("does not overwrite URL attribution with empty referrer params", () => {
    captureCampaignAttribution();
    (window as Window & { __AMYNEST_INSTALL_REFERRER?: unknown }).__AMYNEST_INSTALL_REFERRER = {
      referrer: "utm_source=play&utm_medium=cpc",
      clickTimestamp: 1,
      installTimestamp: 2,
    };
    capturePlayInstallReferrer();
    const attr = getInstallAttribution();
    expect(attr?.gclid).toBe("g1");
    expect(attr?.gbraid).toBe("gb-test");
    expect(attr?.wbraid).toBe("wb-test");
  });

  it("captures numeric campaign_id from Play referrer without inventing a join", () => {
    window.history.replaceState({}, "", "/");
    (window as Window & { __AMYNEST_INSTALL_REFERRER?: unknown }).__AMYNEST_INSTALL_REFERRER = {
      referrer: "utm_source=google&utm_medium=cpc&utm_campaign=23986249354&gclid=g-campaign",
      clickTimestamp: 1,
      installTimestamp: 2,
    };
    capturePlayInstallReferrer();
    const attr = getInstallAttribution();
    expect(attr?.campaignId).toBe("23986249354");
    expect(attr?.gclid).toBe("g-campaign");
    expect(getInstallSourceLabel(attr)).toBe("google_ads");
  });

  it("re-emits install_source when Play referrer arrives after the 2.5s JS wait", () => {
    window.history.replaceState({}, "", "/");
    emitInstallSourceOnce();
    expect(trackGrowthEvent).toHaveBeenCalledTimes(1);
    expect(trackGrowthEvent.mock.calls[0][1]).toMatchObject({ source: "organic" });

    (window as Window & { __AMYNEST_INSTALL_REFERRER?: unknown }).__AMYNEST_INSTALL_REFERRER = {
      referrer: "utm_source=google&utm_medium=cpc&gclid=late-gclid",
      clickTimestamp: 10,
      installTimestamp: 20,
    };
    capturePlayInstallReferrer();
    emitInstallSourceOnce();
    expect(trackGrowthEvent).toHaveBeenCalledTimes(2);
    const last = trackGrowthEvent.mock.calls[1][1] as { source?: string; gclid?: string };
    expect(last.source).toBe("google_ads");
    expect(last.gclid).toBe("late-gclid");
    expect(getInstallAttribution()?.gclid).toBe("late-gclid");
  });

  it("keeps Play referrer in localStorage across a simulated WebView restart", () => {
    (window as Window & { __AMYNEST_INSTALL_REFERRER?: unknown }).__AMYNEST_INSTALL_REFERRER = {
      referrer: "utm_source=google&gclid=persist-gclid",
    };
    capturePlayInstallReferrer();
    delete (window as Window & { __AMYNEST_INSTALL_REFERRER?: unknown }).__AMYNEST_INSTALL_REFERRER;
    const afterReload = getInstallAttribution();
    expect(afterReload?.gclid).toBe("persist-gclid");
    expect(getInstallSourceLabel(afterReload)).toBe("google_ads");
  });

  it("keeps fbclid through localStorage and labels Meta ads", () => {
    window.history.replaceState({}, "", "/?fbclid=meta-click-1&utm_source=facebook&utm_campaign=plan-today");
    captureCampaignAttribution();
    const attr = getInstallAttribution();
    expect(attr?.fbclid).toBe("meta-click-1");
    expect(attr?.utmCampaign).toBe("plan-today");
    expect(getInstallSourceLabel(attr)).toBe("meta_ads");
    const again = getInstallAttribution();
    expect(again?.fbclid).toBe("meta-click-1");
  });
});
