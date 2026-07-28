import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SetupDraft } from "../../domain/models/setup-draft";
import type { BirthProfile, SkySnapshot } from "../../domain/models/birth-profile";
import { runFirstSkyPipeline } from "./first-sky-pipeline";

vi.mock("@/lib/client-logs", () => ({
  queueClientLog: vi.fn(),
}));

const trackBirthSkyEvent = vi.fn();
vi.mock("../../lib/analytics", () => ({
  trackBirthSkyEvent: (...args: unknown[]) => trackBirthSkyEvent(...args),
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
    generationStatus: "READY",
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
      metadata: { fallbackUsed: true, calculationSource: "AmyLite" },
    },
    ...partial,
  };
}

const authFetch = vi.fn();

describe("runFirstSkyPipeline", () => {
  beforeEach(() => {
    createBirthSkyMock.mockReset();
    recomputeMock.mockReset();
    trackBirthSkyEvent.mockReset();
  });

  it("new user: create succeeds and emits started + succeeded + duration", async () => {
    createBirthSkyMock.mockResolvedValue({
      profile: profile(),
      snapshot: snapshot({
        engineVersion: "skyfield-jpl/1.0.0",
        astronomy: {
          ...snapshot().astronomy,
          metadata: { calculationSource: "Skyfield", fallbackUsed: false },
        },
      }),
      computeStatus: "ready",
      generationStatus: "READY",
      fallbackUsed: false,
    });

    const statuses: string[] = [];
    const result = await runFirstSkyPipeline({
      authFetch,
      draft: baseDraft(),
      userId: "user-1",
      isGuest: false,
      onStatus: (s) => statuses.push(s),
    });

    expect(result.ok).toBe(true);
    expect(result.generationStatus).toBe("READY");
    expect(result.snapshot?.snapshotId).toBe("snap-1");
    expect(statuses).toContain("COMPUTING");
    expect(statuses).toContain("READY");
    expect(trackBirthSkyEvent).toHaveBeenCalledWith(
      "birth_sky.generation_started",
      expect.objectContaining({ is_guest: false }),
    );
    expect(trackBirthSkyEvent).toHaveBeenCalledWith(
      "birth_sky.generation_succeeded",
      expect.objectContaining({ duration_ms: expect.any(Number) }),
    );
  });

  it("guest user (day sky): succeeds without place", async () => {
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
      generationStatus: "READY",
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

  it("logged-in user with daemon unavailable: fallback engine succeeds", async () => {
    createBirthSkyMock.mockResolvedValue({
      profile: profile(),
      snapshot: snapshot(),
      computeStatus: "ready",
      generationStatus: "READY",
      fallbackUsed: true,
    });

    const result = await runFirstSkyPipeline({
      authFetch,
      draft: baseDraft(),
      userId: "user-1",
    });

    expect(result.ok).toBe(true);
    expect(result.fallbackUsed).toBe(true);
    expect(trackBirthSkyEvent).toHaveBeenCalledWith(
      "birth_sky.generation_fallback_used",
      expect.objectContaining({ engine_version: expect.any(String) }),
    );
  });

  it("never treats null snapshot as READY (partial create → auto recompute)", async () => {
    createBirthSkyMock.mockResolvedValue({
      profile: profile({ generationStatus: "FAILED" }),
      snapshot: null,
      computeStatus: "failed",
      generationStatus: "FAILED",
      errorCode: "compute_failed",
    });
    recomputeMock.mockResolvedValue({
      profile: profile(),
      snapshot: snapshot(),
      computeStatus: "ready",
      generationStatus: "READY",
      fallbackUsed: true,
    });

    const result = await runFirstSkyPipeline({
      authFetch,
      draft: baseDraft(),
      userId: "user-1",
    });

    expect(result.ok).toBe(true);
    expect(result.generationStatus).toBe("READY");
    expect(result.snapshot).not.toBeNull();
    expect(recomputeMock).toHaveBeenCalledWith(authFetch, "prof-1", {
      forceFresh: true,
    });
  });

  it("timeout then retry succeeds", async () => {
    createBirthSkyMock
      .mockRejectedValueOnce(new Error("timeout:create"))
      .mockResolvedValueOnce({
        profile: profile(),
        snapshot: snapshot(),
        computeStatus: "ready",
        generationStatus: "READY",
      });

    const result = await runFirstSkyPipeline({
      authFetch,
      draft: baseDraft(),
      userId: "user-1",
    });

    expect(result.ok).toBe(true);
    expect(result.retried).toBe(true);
    expect(trackBirthSkyEvent).toHaveBeenCalledWith(
      "birth_sky.generation_retry",
      expect.objectContaining({ error_code: "timeout" }),
    );
  });

  it("FetchTimeoutError (authFetch abort) maps to timeout, not network_failure", async () => {
    const timeoutErr = new Error("Request timed out after 8000ms");
    timeoutErr.name = "FetchTimeoutError";
    createBirthSkyMock.mockRejectedValue(timeoutErr);

    const result = await runFirstSkyPipeline({
      authFetch,
      draft: baseDraft(),
      userId: "user-1",
    });

    expect(result.ok).toBe(false);
    expect(result.errorCode).toBe("timeout");
    expect(result.errorCode).not.toBe("network_failure");
    expect(result.retried).toBe(true);
  });

  it("network interruption then retry succeeds", async () => {
    createBirthSkyMock
      .mockRejectedValueOnce(new Error("network fetch failed"))
      .mockResolvedValueOnce({
        profile: profile(),
        snapshot: snapshot(),
        computeStatus: "ready",
        generationStatus: "READY",
      });

    const result = await runFirstSkyPipeline({
      authFetch,
      draft: baseDraft(),
      userId: "user-1",
    });

    expect(result.ok).toBe(true);
    expect(result.retried).toBe(true);
    expect(result.steps).toContain("retry");
  });

  it("Generate again (forceFresh) always starts a fresh recompute", async () => {
    recomputeMock.mockResolvedValue({
      profile: profile(),
      snapshot: snapshot({ snapshotId: "snap-fresh" }),
      computeStatus: "ready",
      generationStatus: "READY",
    });

    const result = await runFirstSkyPipeline({
      authFetch,
      draft: baseDraft(),
      userId: "user-1",
      existingProfile: profile(),
      forceFresh: true,
    });

    expect(result.ok).toBe(true);
    expect(createBirthSkyMock).not.toHaveBeenCalled();
    expect(recomputeMock).toHaveBeenCalledWith(authFetch, "prof-1", {
      forceFresh: true,
    });
    expect(result.snapshot?.snapshotId).toBe("snap-fresh");
  });

  it("formation resume (forceFresh) regenerates missing snapshot via recompute", async () => {
    recomputeMock.mockResolvedValue({
      profile: profile(),
      snapshot: snapshot(),
      computeStatus: "ready",
      generationStatus: "READY",
    });

    const result = await runFirstSkyPipeline({
      authFetch,
      draft: baseDraft(),
      userId: "user-1",
      existingProfile: profile({ generationStatus: "FAILED" }),
      forceFresh: true,
    });

    expect(result.ok).toBe(true);
    expect(createBirthSkyMock).not.toHaveBeenCalled();
    expect(recomputeMock).toHaveBeenCalledWith(authFetch, "prof-1", {
      forceFresh: true,
    });
    expect(result.steps).toContain("auto_recompute");
  });

  it("setup retry after Back to review upserts edited draft via create", async () => {
    createBirthSkyMock.mockResolvedValue({
      profile: profile({ birthDate: "2020-01-01" }),
      snapshot: snapshot(),
      computeStatus: "ready",
      generationStatus: "READY",
    });

    const result = await runFirstSkyPipeline({
      authFetch,
      draft: baseDraft({ birthDate: "2020-01-01" }),
      userId: "user-1",
      // Prior failed create left profile in client state.
      existingProfile: profile({
        birthDate: "2019-08-12",
        generationStatus: "FAILED",
      }),
    });

    expect(result.ok).toBe(true);
    expect(createBirthSkyMock).toHaveBeenCalledWith(
      authFetch,
      expect.objectContaining({ birthDate: "2020-01-01" }),
    );
    expect(recomputeMock).not.toHaveBeenCalled();
    expect(result.steps).toContain("snapshot_create");
  });

  it("exhausted retries emit failure telemetry and FAILED status", async () => {
    createBirthSkyMock.mockRejectedValue(new Error("network down"));

    const result = await runFirstSkyPipeline({
      authFetch,
      draft: baseDraft(),
      userId: "user-1",
    });

    expect(result.ok).toBe(false);
    expect(result.generationStatus).toBe("FAILED");
    expect(result.snapshot).toBeNull();
    expect(trackBirthSkyEvent).toHaveBeenCalledWith(
      "birth_sky.generation_failed",
      expect.objectContaining({
        duration_ms: expect.any(Number),
        retried: true,
      }),
    );
  });

  it("missing birth data fails closed without API calls", async () => {
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
