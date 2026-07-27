import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SetupDraft } from "../../domain/models/setup-draft";
import type { BirthProfile, SkySnapshot } from "../../domain/models/birth-profile";
import { runFirstSkyPipeline } from "./first-sky-pipeline";

vi.mock("@/lib/client-logs", () => ({
  queueClientLog: vi.fn(),
}));

vi.mock("../../lib/analytics", () => ({
  trackBirthSkyEvent: vi.fn(),
}));

vi.mock("../../infrastructure/api/birth-sky-api", () => ({
  createBirthSky: vi.fn(),
  recomputeBirthSkySnapshot: vi.fn(),
}));

import {
  createBirthSky,
  recomputeBirthSkySnapshot,
} from "../../infrastructure/api/birth-sky-api";

const createBirthSkyMock = vi.mocked(createBirthSky);
const recomputeMock = vi.mocked(recomputeBirthSkySnapshot);

function baseDraft(overrides: Partial<SetupDraft> = {}): SetupDraft {
  return {
    childId: 42,
    childName: "Asha",
    currentStep: "review",
    birthDate: "2019-08-12",
    birthTime: "09:15",
    timePrecision: "exact",
    birthPlace: {
      label: "Bengaluru",
      lat: 12.97,
      lon: 77.59,
      timezoneIana: "Asia/Kolkata",
    },
    placeSkipped: false,
    consent: {
      disclaimerAccepted: true,
      consentVersion: "v1",
      acceptedAt: "2026-07-27T00:00:00.000Z",
      scopes: ["birth_sky"],
    },
    ageSanityConfirmed: true,
    dirty: false,
    updatedAt: "2026-07-27T00:00:00.000Z",
    ...overrides,
  };
}

function profile(partial?: Partial<BirthProfile>): BirthProfile {
  return {
    profileId: "prof-1",
    childId: 42,
    userId: "user-1",
    birthDate: "2019-08-12",
    birthTime: "09:15",
    timePrecision: "exact",
    birthPlace: {
      label: "Bengaluru",
      lat: 12.97,
      lon: 77.59,
    },
    consent: {
      consentVersion: "v1",
      acceptedAt: "2026-07-27T00:00:00.000Z",
      scopes: ["birth_sky"],
      disclaimerAccepted: true,
      childId: 42,
    },
    aiInsightsUsedCount: 0,
    createdAt: "2026-07-27T00:00:00.000Z",
    updatedAt: "2026-07-27T00:00:00.000Z",
    ...partial,
  };
}

function snapshot(partial?: Partial<SkySnapshot>): SkySnapshot {
  return {
    snapshotId: "snap-1",
    profileId: "prof-1",
    cacheKey: "ck",
    snapshotVersion: "ss_snap-1",
    engineVersion: "amynest-astro-lite/1.0.0",
    computedAt: "2026-07-27T00:00:00.000Z",
    mode: "full",
    astronomy: {
      bodies: [
        { id: "sun", eclipticLongitudeDeg: 140, sign: "Leo" },
        { id: "moon", eclipticLongitudeDeg: 200, sign: "Libra" },
      ],
      sunSign: "Leo",
      moonSign: "Libra",
      moonPhase: "full",
      moonPhaseLabel: "Full Moon",
      risingSign: "Virgo",
      houses: null,
      precision: { timePrecision: "exact", placeProvided: true },
    },
    ...partial,
  };
}

const authFetch = vi.fn();

describe("runFirstSkyPipeline", () => {
  beforeEach(() => {
    createBirthSkyMock.mockReset();
    recomputeMock.mockReset();
  });

  it("brand-new logged-in user: create succeeds on first attempt", async () => {
    createBirthSkyMock.mockResolvedValue({
      profile: profile(),
      snapshot: snapshot(),
      computeStatus: "ready",
    });

    const result = await runFirstSkyPipeline({
      authFetch,
      draft: baseDraft(),
      userId: "user-1",
      isGuest: false,
    });

    expect(result.ok).toBe(true);
    expect(result.snapshot?.snapshotId).toBe("snap-1");
    expect(result.retried).toBe(false);
    expect(createBirthSkyMock).toHaveBeenCalledTimes(1);
    expect(recomputeMock).not.toHaveBeenCalled();
    expect(result.steps).toContain("done");
  });

  it("guest user (day sky / unknown time): succeeds without place", async () => {
    createBirthSkyMock.mockResolvedValue({
      profile: profile({ birthTime: null, timePrecision: "unknown", birthPlace: null }),
      snapshot: snapshot({
        mode: "day_sky",
        astronomy: {
          bodies: [
            { id: "sun", eclipticLongitudeDeg: 0, sign: "Aries" },
            { id: "moon", eclipticLongitudeDeg: 30, sign: "Taurus" },
          ],
          sunSign: "Aries",
          moonSign: "Taurus",
          moonPhase: "new",
          moonPhaseLabel: "New Moon",
          risingSign: null,
          houses: null,
          precision: { timePrecision: "unknown", placeProvided: false },
        },
      }),
      computeStatus: "ready",
    });

    const result = await runFirstSkyPipeline({
      authFetch,
      draft: baseDraft({
        birthTime: null,
        timePrecision: "unknown",
        birthPlace: null,
        placeSkipped: true,
      }),
      userId: null,
      isGuest: true,
    });

    expect(result.ok).toBe(true);
    expect(result.snapshot?.mode).toBe("day_sky");
  });

  it("partially created snapshot: auto-recomputes before showing failure", async () => {
    createBirthSkyMock.mockResolvedValue({
      profile: profile(),
      snapshot: null,
      computeStatus: "failed",
      errorCode: "compute_failed",
    });
    recomputeMock.mockResolvedValue({
      profile: profile(),
      snapshot: snapshot(),
      computeStatus: "ready",
    });

    const result = await runFirstSkyPipeline({
      authFetch,
      draft: baseDraft(),
      userId: "user-1",
    });

    expect(result.ok).toBe(true);
    expect(recomputeMock).toHaveBeenCalledWith(authFetch, "prof-1");
    expect(result.steps).toContain("auto_recompute");
  });

  it("interrupted generation (existing profile, no snapshot): regenerates", async () => {
    recomputeMock.mockResolvedValue({
      profile: profile(),
      snapshot: snapshot(),
      computeStatus: "ready",
    });

    const result = await runFirstSkyPipeline({
      authFetch,
      draft: baseDraft(),
      userId: "user-1",
      existingProfile: profile(),
    });

    expect(result.ok).toBe(true);
    expect(createBirthSkyMock).not.toHaveBeenCalled();
    expect(recomputeMock).toHaveBeenCalledTimes(1);
    expect(result.steps).toContain("auto_recompute");
  });

  it("retry flow: network failure then success", async () => {
    createBirthSkyMock
      .mockRejectedValueOnce(new Error("network timeout"))
      .mockResolvedValueOnce({
        profile: profile(),
        snapshot: snapshot(),
        computeStatus: "ready",
      });

    const result = await runFirstSkyPipeline({
      authFetch,
      draft: baseDraft(),
      userId: "user-1",
    });

    expect(result.ok).toBe(true);
    expect(result.retried).toBe(true);
    expect(createBirthSkyMock).toHaveBeenCalledTimes(2);
    expect(result.steps).toContain("retry");
  });

  it("missing birth data fails closed without calling API", async () => {
    const result = await runFirstSkyPipeline({
      authFetch,
      draft: baseDraft({ birthDate: null }),
      userId: "user-1",
    });

    expect(result.ok).toBe(false);
    expect(result.errorCode).toBe("missing_birth_data");
    expect(createBirthSkyMock).not.toHaveBeenCalled();
  });
});
