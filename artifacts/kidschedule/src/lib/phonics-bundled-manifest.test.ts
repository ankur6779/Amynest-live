import { describe, expect, it } from "vitest";
import { resetPhonicsManifestValidationForTests } from "@/lib/phonics-manifest-validation";
import {
  getPhonicsBundledManifestSync,
  getPhonicsBundledMeta,
  isPhonicsBundledManifestShipped,
  preloadPhonicsBundledManifest,
} from "@/lib/phonics-bundled-manifest";

describe("phonics bundled manifest loader", () => {
  it("ships build-time meta above release floor", () => {
    expect(isPhonicsBundledManifestShipped()).toBe(true);
    expect(getPhonicsBundledMeta().assetCount).toBeGreaterThanOrEqual(100);
  });

  it("loads JSON chunk once and caches on globalThis", async () => {
    resetPhonicsManifestValidationForTests();

    const first = await preloadPhonicsBundledManifest();
    const second = await preloadPhonicsBundledManifest();
    expect(first).toBe(second);
    expect(Object.keys(getPhonicsBundledManifestSync()?.assets ?? {}).length).toBeGreaterThanOrEqual(100);
  });
});
