/** @vitest-environment node */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));

describe("expired-trial frontend fail-closed", () => {
  it("AppCore denies premium routes unless the flag is resolved ALLOW", () => {
    const appCore = readFileSync(join(here, "../AppCore.tsx"), "utf8");
    expect(appCore).toContain("decidePremiumRouteAccess");
    expect(appCore).toContain('premiumDecision !== "ALLOW"');
    expect(appCore).not.toMatch(/if \(entitlements && !entitlements\[premiumRoute\.accessKey\]\)/);
  });

  it("LearningJourneyGate no longer fail-opens on timeout", () => {
    const gate = readFileSync(join(here, "../components/learning-journey-gate.tsx"), "utf8");
    expect(gate).toContain("decideLearningJourneyAccess");
    expect(gate).not.toMatch(/fail-open so Practice\/Quiz stay reachable/);
    expect(gate).toContain('journeyDecision !== "ALLOW"');
  });

  it("hub module gate fails closed when the journey lookup errors", () => {
    const hook = readFileSync(join(here, "../hooks/use-hub-module-gate.ts"), "utf8");
    expect(hook).toContain("journeyLookupFailed");
    expect(hook).toContain("hubJourney.isError");
  });
});
