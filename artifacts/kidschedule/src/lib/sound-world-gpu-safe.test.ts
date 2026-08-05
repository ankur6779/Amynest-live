import { afterEach, describe, expect, it, vi } from "vitest";
import { setPerformanceTierForTests } from "./performance-tier";
import {
  resetSoundWorldGpuProfileForTests,
  soundWorldCardSurfaceClass,
  soundWorldGpuProfile,
  SOUND_WORLD_OPAQUE_SURFACE,
} from "./sound-world-gpu-safe";

describe("sound-world-gpu-safe", () => {
  afterEach(() => {
    resetSoundWorldGpuProfileForTests();
    setPerformanceTierForTests(null);
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("forces opaque surfaces on Android UA", () => {
    vi.stubGlobal("navigator", {
      userAgent: "Mozilla/5.0 (Linux; Android 13; Pixel) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile",
      hardwareConcurrency: 8,
      deviceMemory: 8,
      maxTouchPoints: 5,
    });
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockReturnValue({ matches: true, addEventListener: () => {}, removeEventListener: () => {} }),
    );
    setPerformanceTierForTests("high");
    resetSoundWorldGpuProfileForTests();
    const profile = soundWorldGpuProfile();
    expect(profile.preferOpaqueSurfaces).toBe(true);
    expect(profile.allowIdleMotion).toBe(false);
    expect(profile.allowTilt).toBe(false);
    expect(profile.allowExitWait).toBe(false);
    expect(profile.allowAtmosphere).toBe(false);
    expect(soundWorldCardSurfaceClass()).toContain("bg-[rgb(18,28,60)]");
    expect(SOUND_WORLD_OPAQUE_SURFACE).not.toMatch(/backdrop-blur/);
  });

  it("night-safe card class never includes backdrop-blur", () => {
    expect(soundWorldCardSurfaceClass("rounded-[24px]")).not.toMatch(/backdrop-blur/);
  });
});
