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
  getInstallAttribution,
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
});
