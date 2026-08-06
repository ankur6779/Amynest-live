import { afterEach, describe, expect, it, vi } from "vitest";
import { isV2FlagEnabled } from "@/lib/feature-flags";
import {
  V2_FEATURE_REGISTRY,
  validateFeatureRegistry,
} from "@/registries/features";
import {
  V2_ROUTE_REGISTRY,
  validateRouteRegistry,
} from "@/registries/routes";
import {
  AMY_REGISTRY_ADAPTER_VERSION,
  FEATURE_REGISTRY_VERSION,
  ROUTE_REGISTRY_VERSION,
  TOOL_REGISTRY_VERSION,
  adaptFeatureRegistry,
  adaptRouteRegistry,
  adaptToolRegistry,
  clearExperienceMapCacheForTests,
  compareRegistrySnapshots,
  getFeatureRegistrySnapshot,
  getRegistryAdapterHealth,
  getRouteRegistrySnapshot,
  getToolRegistrySnapshot,
  isAmyRegistryAdaptersEnabled,
  validateRegistryAdapters,
} from "./index";

const FIXED_NOW = new Date(2026, 7, 2, 12, 0, 0);

describe("Registry Adapter Layer (Sprint A8.1)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    clearExperienceMapCacheForTests();
  });

  it("feature flag defaults OFF", () => {
    expect(isV2FlagEnabled("amy_registry_adapters_v2")).toBe(false);
    expect(isAmyRegistryAdaptersEnabled()).toBe(false);
  });

  it("registries remain valid / unchanged by adapters", () => {
    const beforeFeatures = JSON.stringify(V2_FEATURE_REGISTRY);
    const beforeRoutes = JSON.stringify(V2_ROUTE_REGISTRY);
    expect(validateFeatureRegistry()).toEqual([]);
    expect(validateRouteRegistry()).toEqual([]);

    adaptFeatureRegistry({ now: FIXED_NOW });
    adaptRouteRegistry({ now: FIXED_NOW });
    adaptToolRegistry({ now: FIXED_NOW });

    expect(JSON.stringify(V2_FEATURE_REGISTRY)).toBe(beforeFeatures);
    expect(JSON.stringify(V2_ROUTE_REGISTRY)).toBe(beforeRoutes);
    expect(validateFeatureRegistry()).toEqual([]);
    expect(validateRouteRegistry()).toEqual([]);
  });

  it("adapters are deterministic", () => {
    const a = adaptFeatureRegistry({ now: FIXED_NOW });
    const b = adaptFeatureRegistry({ now: FIXED_NOW });
    expect(compareRegistrySnapshots(a, b)).toEqual([]);

    const r1 = adaptRouteRegistry({ now: FIXED_NOW });
    const r2 = adaptRouteRegistry({ now: FIXED_NOW });
    expect(compareRegistrySnapshots(r1, r2)).toEqual([]);
  });

  it("feature adapter maps Brain experienceId for known features", () => {
    const snap = adaptFeatureRegistry({ now: FIXED_NOW });
    const speech = snap.features.find((f) => f.featureId === "speech_coach");
    expect(speech).toBeDefined();
    expect(speech?.experienceId).toBe("speech_mission");
    expect(speech?.premiumRequirement).toBeTruthy();
    expect(speech?.lifecycle).toBe("active");
    expect(speech?.availability).toBe("available");
    expect(speech?.metadata.wedgeEligible).toBe(true);
    expect(speech?.adapterVersion).toBe(AMY_REGISTRY_ADAPTER_VERSION);
    expect(speech?.registryVersion).toBe(FEATURE_REGISTRY_VERSION);
    expect(speech?.sourceRegistry).toBe("feature");
    expect(speech?.adaptedAt).toBe(FIXED_NOW.toISOString());

    const askAmy = snap.features.find((f) => f.featureId === "ask_amy");
    expect(askAmy?.experienceId).toBe("ask_amy");
  });

  it("unknown registry fields ignored safely + provenance", () => {
    const snap = adaptFeatureRegistry({
      now: FIXED_NOW,
      entries: [
        {
          id: "future_feature",
          purpose: "x",
          category: "learn",
          discoveryStage: "discoverable",
          navOwner: "none",
          askAmyHandoff: "none",
          premiumRole: "free",
          analyticsOwner: "x",
          routeOwner: ["/x"],
          wedgeEligible: false,
          totallyUnknownField: { nested: true },
          another: 123,
        },
        { notAnEntry: true },
        null,
      ],
    });
    expect(snap.features).toHaveLength(1);
    expect(snap.features[0]?.featureId).toBe("future_feature");
    expect(snap.features[0]?.experienceId).toBeNull();
    expect(snap.unknownFeatures).toBe(1);
    expect(snap.ignoredFields).toBe(2);
    expect("totallyUnknownField" in snap.features[0]!).toBe(false);
    expect(snap.features[0]?.sourceRegistry).toBe("feature");
  });

  it("tool adapter — empty default + injectable catalog + version mismatch", () => {
    const empty = adaptToolRegistry({ now: FIXED_NOW });
    expect(empty.usingEmptyCatalog).toBe(true);
    expect(empty.tools).toHaveLength(0);
    expect(empty.registryVersion).toBe(TOOL_REGISTRY_VERSION);

    const withTools = adaptToolRegistry({
      now: FIXED_NOW,
      entries: [
        {
          id: "speech_practice_tool",
          capabilities: ["speech"],
          canRun: true,
          requirements: ["mic"],
          toolVersion: "tool.v1",
          extraIgnored: true,
        },
        {
          id: "legacy_tool",
          canRun: false,
          toolVersion: "not-a-supported-prefix",
        },
        { broken: true },
      ],
    });
    expect(withTools.usingEmptyCatalog).toBe(false);
    expect(withTools.tools).toHaveLength(2);
    expect(withTools.tools[0]?.toolId).toBe("speech_practice_tool");
    expect(withTools.tools[0]?.canRun).toBe(true);
    expect(withTools.tools[0]?.sourceRegistry).toBe("tool");
    expect(withTools.tools[0]?.adaptedAt).toBe(FIXED_NOW.toISOString());
    expect(withTools.ignoredFields).toBe(1);
    expect(withTools.tools[1]?.capabilities).toContain("version_mismatch");
  });

  it("route adapter maps lifecycle / availability + provenance", () => {
    const snap = adaptRouteRegistry({ now: FIXED_NOW });
    expect(snap.routes.length).toBeGreaterThan(0);
    expect(snap.registryVersion).toBe(ROUTE_REGISTRY_VERSION);
    const today = snap.routes.find((r) => r.path === "/today");
    expect(today?.routeId).toBe("route:/today");
    expect(today?.owner).toBeTruthy();
    expect(today?.lifecycle).toBeTruthy();
    expect(today?.sourceRegistry).toBe("route");
    expect(today?.registryVersion).toBe(ROUTE_REGISTRY_VERSION);
    expect(today?.adapterVersion).toBe(AMY_REGISTRY_ADAPTER_VERSION);
    expect(["available", "limited", "unavailable", "unknown"]).toContain(
      today?.availability,
    );
  });

  it("RegistryAdapterHealth is developer-only aggregate", () => {
    const features = adaptFeatureRegistry({ now: FIXED_NOW });
    const tools = adaptToolRegistry({
      now: FIXED_NOW,
      entries: [
        {
          id: "t1",
          canRun: true,
          toolVersion: "tool.v1",
          ignored: true,
        },
      ],
    });
    const routes = adaptRouteRegistry({ now: FIXED_NOW });
    const health = getRegistryAdapterHealth({
      now: FIXED_NOW,
      features,
      tools,
      routes,
    });
    expect(health.adapterVersion).toBe(AMY_REGISTRY_ADAPTER_VERSION);
    expect(health.featureCount).toBe(features.features.length);
    expect(health.toolCount).toBe(1);
    expect(health.routeCount).toBe(routes.routes.length);
    expect(health.unknownFeatures).toBe(features.unknownFeatures);
    expect(health.ignoredFields).toBe(
      features.ignoredFields + tools.ignoredFields + routes.ignoredFields,
    );
    expect(health.ignoredFields).toBeGreaterThanOrEqual(1);
  });

  it("readonly snapshots — mutation throws", () => {
    const features = getFeatureRegistrySnapshot(FIXED_NOW);
    const tools = getToolRegistrySnapshot(FIXED_NOW);
    const routes = getRouteRegistrySnapshot(FIXED_NOW);
    expect(Object.isFrozen(features)).toBe(true);
    expect(Object.isFrozen(features.features)).toBe(true);
    expect(Object.isFrozen(tools)).toBe(true);
    expect(Object.isFrozen(routes)).toBe(true);
    expect(() => {
      (features as { generatedAt: string }).generatedAt = "x";
    }).toThrow();
  });

  it("validateRegistryAdapters + compare", () => {
    const features = adaptFeatureRegistry({ now: FIXED_NOW });
    const tools = adaptToolRegistry({ now: FIXED_NOW });
    const routes = adaptRouteRegistry({ now: FIXED_NOW });
    expect(
      validateRegistryAdapters({ features, tools, routes }).ok,
    ).toBe(true);

    const later = adaptFeatureRegistry({
      now: new Date(FIXED_NOW.getTime() + 1000),
    });
    expect(compareRegistrySnapshots(features, later)).toEqual([]);
  });

  it("no mutations when adapting injected mutable arrays", () => {
    const mutable = [
      {
        id: "tmp",
        purpose: "p",
        category: "shell",
        discoveryStage: "hidden",
        navOwner: "none",
        askAmyHandoff: "none",
        premiumRole: "n_a",
        analyticsOwner: "a",
        routeOwner: ["/tmp"],
        wedgeEligible: false,
      },
    ];
    const before = JSON.stringify(mutable);
    const snap = adaptFeatureRegistry({ now: FIXED_NOW, entries: mutable });
    expect(JSON.stringify(mutable)).toBe(before);
    expect(snap.features[0]?.lifecycle).toBe("hidden");
    expect(snap.features[0]?.availability).toBe("limited");
  });
});
