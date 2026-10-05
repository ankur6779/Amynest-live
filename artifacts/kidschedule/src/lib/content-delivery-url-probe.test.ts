import { describe, expect, it } from "vitest";
import {
  PUBLIC_CONTENT_URLS,
  probeReelsList,
  probeReelStreamRange,
} from "./content-delivery-url-probe";
import { CURIOSITY_CATALOG } from "./content-catalog-inventory";

const probeFlag = "CONTENT_DELIVERY_PROBE";

describe("content delivery URL map", () => {
  it("keeps browser paths on same-origin /api proxies", () => {
    expect(PUBLIC_CONTENT_URLS.reelsList).toContain("/api/reels/videos");
    expect(PUBLIC_CONTENT_URLS.reelsStreamPrefix).toContain("/api/reels/stream/");
    expect(PUBLIC_CONTENT_URLS.storiesStreamPrefix).toContain(
      "/api/stories/stream/",
    );
    expect(PUBLIC_CONTENT_URLS.kidsHowPreviewNeedsAuth).toContain(
      "/api/kids-how-library/preview-url",
    );
    expect(CURIOSITY_CATALOG.every((row) => row.browserUrlPath.startsWith("/api/"))).toBe(
      true,
    );
  });

  it("optionally probes the public reel catalog", async () => {
    if (!process.env[probeFlag]) {
      expect(PUBLIC_CONTENT_URLS.reelsList).toContain("amynest.in");
      return;
    }
    const list = await probeReelsList();
    expect(list.status).not.toBeNull();
    if (list.ok) {
      const first = await probeReelStreamRange("artcraft-1");
      expect([200, 206, 401, 403, 404, 410]).toContain(first.status);
    }
  });
});
