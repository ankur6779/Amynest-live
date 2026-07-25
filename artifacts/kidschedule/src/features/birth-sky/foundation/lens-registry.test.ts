import { describe, expect, it, beforeEach } from "vitest";
import {
  __resetLensRegistryForTests,
  getLens,
  listLenses,
  registerLens,
  setLensState,
} from "./lens-registry";
import { __resetBirthSkyBootstrapGuardForTests } from "./bootstrap-guard";
import { __resetLensRuntimeForTests } from "../platform/lens-runtime";
import {
  isBirthSkyFoundationBootstrapped,
  registerBirthSkyFoundation,
  syncBirthSkyLensAvailability,
} from "./register-birth-sky";

describe("lens registry + birth_sky registration", () => {
  beforeEach(() => {
    __resetLensRegistryForTests();
    __resetLensRuntimeForTests();
    __resetBirthSkyBootstrapGuardForTests();
  });

  it("registers birth_sky exactly once in the registry (idempotent)", () => {
    registerBirthSkyFoundation();
    registerBirthSkyFoundation();
    registerBirthSkyFoundation();
    const lens = getLens("birth_sky");
    expect(lens?.metadata.lensId).toBe("birth_sky");
    expect(lens?.metadata.displayName).toBe("Amy Astro Intelligence");
    expect(listLenses()).toHaveLength(1);
    expect(isBirthSkyFoundationBootstrapped()).toBe(true);
  });

  it("survives StrictMode-style double bootstrap without duplicate lenses", () => {
    registerBirthSkyFoundation();
    expect(listLenses().filter((l) => l.metadata.lensId === "birth_sky")).toHaveLength(1);
    registerBirthSkyFoundation();
    expect(listLenses().filter((l) => l.metadata.lensId === "birth_sky")).toHaveLength(1);
  });

  it("defaults birth_sky to disabled when master kill switch is off", () => {
    registerBirthSkyFoundation();
    expect(getLens("birth_sky")?.state).toBe("disabled");
  });

  it("re-syncs lifecycle state without re-registering", () => {
    registerBirthSkyFoundation();
    setLensState("birth_sky", "active");
    syncBirthSkyLensAvailability();
    // Flag off in unit tests → sync forces disabled; still one lens.
    expect(getLens("birth_sky")?.state).toBe("disabled");
    expect(listLenses()).toHaveLength(1);
  });

  it("sets lifecycle state", () => {
    const result = registerLens({
      lensId: "numerology",
      displayName: "Numerology",
      description: "test",
      lensVersion: "0.0.1",
      capabilities: ["parentOnly"],
      featureFlag: "X",
      orderHint: 10,
      privacyScopes: [],
      owner: "test",
    });
    expect(result.ok).toBe(true);
    setLensState("numerology", "available");
    expect(getLens("numerology")?.state).toBe("available");
  });
});
