import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  __resetLensRegistryForTests,
  activateLens,
  buildLensReadonlyContext,
  canContribute,
  dumpLensRegistryDiagnostics,
  getDuplicateReports,
  getLens,
  getLensRuntimeStatus,
  hasLensPermission,
  inspectLensCapabilities,
  listExtensionLenses,
  listLenses,
  registerLens,
  resolveLensPermissions,
  unloadLens,
  validateLensManifest,
  __resetLensRuntimeForTests,
} from "./index";
import { __resetBirthSkyBootstrapGuardForTests } from "../foundation/bootstrap-guard";
import { registerBirthSkyFoundation } from "../foundation/register-birth-sky";
import type { BirthProfile, SkySnapshot } from "../domain/models/birth-profile";

vi.mock("../lib/feature-flags", () => ({
  isBirthSkyEnabled: () => true,
}));

vi.mock("../lib/analytics", () => ({
  trackBirthSkyEvent: vi.fn(),
}));

const profile: BirthProfile = {
  profileId: "p1",
  childId: 1,
  userId: "u1",
  birthDate: "2020-01-01",
  birthTime: "12:00",
  timePrecision: "exact",
  birthPlace: null,
  consent: {
    consentVersion: "v1",
    acceptedAt: "2020-01-01T00:00:00.000Z",
    scopes: [],
    disclaimerAccepted: true,
    childId: 1,
  },
  aiInsightsUsedCount: 0,
  createdAt: "2020-01-01T00:00:00.000Z",
  updatedAt: "2020-01-01T00:00:00.000Z",
};

const snapshot: SkySnapshot = {
  snapshotId: "s1",
  profileId: "p1",
  cacheKey: "c",
  snapshotVersion: "sv1",
  engineVersion: "amynest-astro-lite/1.0.0",
  computedAt: "2020-01-01T00:00:00.000Z",
  mode: "full",
  astronomy: {
    bodies: [],
    sunSign: "Capricorn",
    moonSign: "Cancer",
    moonPhase: "full",
    moonPhaseLabel: "Full Moon",
    risingSign: "Leo",
    houses: null,
    precision: { timePrecision: "exact", placeProvided: false },
  },
};

describe("IM-6 Lens Platform", () => {
  beforeEach(() => {
    __resetLensRegistryForTests();
    __resetLensRuntimeForTests();
    __resetBirthSkyBootstrapGuardForTests();
  });

  it("registry is idempotent for identical manifests", () => {
    const a = registerLens({
      lensId: "probe",
      displayName: "Probe",
      description: "test",
      lensVersion: "1.0.0",
      capabilities: ["parentOnly"],
      featureFlag: "FF_PROBE",
      orderHint: 5,
      privacyScopes: [],
      owner: "test",
    });
    const b = registerLens({
      lensId: "probe",
      displayName: "Probe",
      description: "test",
      lensVersion: "1.0.0",
      capabilities: ["parentOnly"],
      featureFlag: "FF_PROBE",
      orderHint: 5,
      privacyScopes: [],
      owner: "test",
    });
    expect(a.ok && a.idempotent === false).toBe(true);
    expect(b.ok && b.idempotent === true).toBe(true);
    expect(listLenses()).toHaveLength(1);
  });

  it("detects duplicate conflict when changing version while active", async () => {
    registerLens({
      lensId: "probe",
      displayName: "Probe",
      description: "test",
      lensVersion: "1.0.0",
      capabilities: ["parentOnly", "requiresSkySnapshot", "requiresBirthProfile"],
      featureFlag: "FF_PROBE",
      orderHint: 5,
      privacyScopes: [],
      owner: "test",
    });
    await activateLens({
      lensId: "probe",
      authUserId: "u1",
      childId: 1,
      profile,
      snapshot,
      aiEntitlement: { freeInsightsUsed: 0, isPremium: false },
    });
    const conflict = registerLens({
      lensId: "probe",
      displayName: "Probe",
      description: "test",
      lensVersion: "2.0.0",
      capabilities: ["parentOnly", "requiresSkySnapshot", "requiresBirthProfile"],
      featureFlag: "FF_PROBE",
      orderHint: 5,
      privacyScopes: [],
      owner: "test",
    });
    expect(conflict.ok).toBe(false);
    if (!conflict.ok) expect(conflict.code).toBe("duplicate_conflict");
    expect(getDuplicateReports().length).toBeGreaterThan(0);
  });

  it("orders by orderHint then lensId", () => {
    registerLens({
      lensId: "zeta",
      displayName: "Z",
      description: "",
      lensVersion: "1",
      capabilities: ["parentOnly"],
      featureFlag: "F",
      orderHint: 10,
      privacyScopes: [],
      owner: "t",
    });
    registerLens({
      lensId: "alpha",
      displayName: "A",
      description: "",
      lensVersion: "1",
      capabilities: ["parentOnly"],
      featureFlag: "F",
      orderHint: 10,
      privacyScopes: [],
      owner: "t",
    });
    registerLens({
      lensId: "mid",
      displayName: "M",
      description: "",
      lensVersion: "1",
      capabilities: ["parentOnly"],
      featureFlag: "F",
      orderHint: 1,
      privacyScopes: [],
      owner: "t",
    });
    expect(listLenses().map((l) => l.metadata.lensId)).toEqual(["mid", "alpha", "zeta"]);
  });

  it("permissions are least-privilege from capabilities", () => {
    const perms = resolveLensPermissions({
      capabilities: ["requiresSkySnapshot", "participatesExport"],
    });
    expect(hasLensPermission(perms, "read_snapshot")).toBe(true);
    expect(hasLensPermission(perms, "export")).toBe(true);
    expect(hasLensPermission(perms, "ai_access")).toBe(false);
    expect(canContribute(["providesDashboardPanel"], "dashboard")).toBe(true);
    expect(canContribute(["parentOnly"], "dashboard")).toBe(false);
  });

  it("context is read-only and permission-filtered", () => {
    const perms = resolveLensPermissions({
      capabilities: ["requiresSkySnapshot"],
    });
    const ctx = buildLensReadonlyContext({
      lensId: "probe",
      lensVersion: "1.0.0",
      permissions: perms,
      authUserId: "u1",
      childId: 1,
      profile,
      snapshot,
      aiEntitlement: { freeInsightsUsed: 1, isPremium: false },
    });
    expect(ctx.profile).toBeNull();
    expect(ctx.snapshot?.snapshotVersion).toBe("sv1");
    expect(Object.isFrozen(ctx)).toBe(true);
    expect(Object.isFrozen(ctx.snapshot)).toBe(true);
    expect(Object.isFrozen(ctx.versions)).toBe(true);
    expect(Object.isFrozen(ctx.aiEntitlement)).toBe(true);
  });

  it("validation fails closed on undeclared contribution", () => {
    const report = validateLensManifest(
      {
        lensId: "bad",
        displayName: "Bad",
        description: "",
        lensVersion: "1",
        capabilities: ["parentOnly"],
        featureFlag: "F",
        orderHint: 1,
        privacyScopes: [],
        owner: "t",
      },
      { dashboard: { panelId: "x" } },
    );
    expect(report.ok).toBe(false);
    expect(report.issues.some((i) => i.code === "undeclared_contribution")).toBe(true);
  });

  it("lazy-loads chunk once and isolates load failures", async () => {
    let loads = 0;
    registerLens(
      {
        lensId: "lazy",
        displayName: "Lazy",
        description: "",
        lensVersion: "1.0.0",
        capabilities: ["parentOnly", "requiresBirthProfile", "requiresSkySnapshot"],
        featureFlag: "F",
        orderHint: 1,
        privacyScopes: [],
        owner: "t",
      },
      {},
      {
        load: async () => {
          loads += 1;
          return { plugins: { routes: { basePath: "/birth-sky/lens/lazy" } } };
        },
      },
    );
    const r1 = await activateLens({
      lensId: "lazy",
      authUserId: "u1",
      childId: 1,
      profile,
      snapshot,
      aiEntitlement: { freeInsightsUsed: 0, isPremium: false },
    });
    expect(r1.ok).toBe(true);
    expect(loads).toBe(1);
    expect(getLens("lazy")?.plugins.routes?.basePath).toContain("/lens/lazy");
    await unloadLens("lazy");
    expect(getLensRuntimeStatus("lazy")).toBe("unloaded");

    registerLens(
      {
        lensId: "boom",
        displayName: "Boom",
        description: "",
        lensVersion: "1.0.0",
        capabilities: ["parentOnly", "requiresSkySnapshot", "requiresBirthProfile"],
        featureFlag: "F",
        orderHint: 2,
        privacyScopes: [],
        owner: "t",
      },
      {},
      {
        lifecycle: {
          onActivate: () => {
            throw new Error("lens exploded");
          },
        },
      },
    );
    const failed = await activateLens({
      lensId: "boom",
      authUserId: "u1",
      childId: 1,
      profile,
      snapshot,
      aiEntitlement: { freeInsightsUsed: 0, isPremium: false },
    });
    expect(failed.ok).toBe(false);
    expect(getLensRuntimeStatus("boom")).toBe("failed");
    // Registry still intact; birth_sky can register afterward.
    registerBirthSkyFoundation();
    expect(getLens("birth_sky")).toBeTruthy();
  });

  it("listExtensionLenses excludes birth_sky primary", () => {
    registerBirthSkyFoundation();
    registerLens({
      lensId: "numerology",
      displayName: "Numerology",
      description: "fixture",
      lensVersion: "0.0.1",
      capabilities: ["parentOnly"],
      featureFlag: "X",
      orderHint: 10,
      privacyScopes: [],
      owner: "test",
    });
    expect(listExtensionLenses().every((l) => l.metadata.lensId !== "birth_sky")).toBe(true);
  });

  it("diagnostics dump and capability inspection work", () => {
    registerBirthSkyFoundation();
    const dump = dumpLensRegistryDiagnostics();
    expect(dump.lensCount).toBeGreaterThanOrEqual(1);
    expect(dump.platformSdkVersion).toMatch(/birth_sky_lens_sdk\//);
    const insp = inspectLensCapabilities("birth_sky");
    expect(insp?.contributionsAllowed.settings).toBe(true);
    expect(insp?.permissions).toContain("read_snapshot");
  });
});
