import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { HealthLabStaticFreePreview } from "@/components/health-lab/health-lab-static-free-preview";
import { LockedBlock } from "@/components/locked-block";
import { decidePremiumRouteAccess } from "@/lib/premium-access-decision";
import { FREE_ENTITLEMENTS } from "@/lib/subscription-defaults";
import { resolveQuietPathsForRoom } from "@/lib/parent-hub/eligibility";

vi.mock("@/lib/subscription-gate", () => ({
  openSubscriptionGate: vi.fn(),
}));

const here = dirname(fileURLToPath(import.meta.url));

/** Mirrors parenting-hub Care Health Lab launch lock (do not fail-open). */
function careHealthLabLaunchLocked(input: {
  isPremium: boolean;
  canAccessHealthLab?: boolean | null;
  hubHealthLabLocked?: boolean;
}): boolean {
  const healthLabRouteOpen = input.isPremium || !!input.canAccessHealthLab;
  return Boolean(input.hubHealthLabLocked) || !healthLabRouteOpen;
}

/** Mirrors AppCore ProtectedRoute /health-lab surface selection. */
function healthLabSignedInSurface(
  decision: ReturnType<typeof decidePremiumRouteAccess>,
): "loading" | "static-preview" | "health-lab-zone" {
  if (decision === "UNKNOWN") return "loading";
  if (decision !== "ALLOW") return "static-preview";
  return "health-lab-zone";
}

describe("Care → Health Lab signed-in entitlement path", () => {
  it("fails closed: missing, false, and unresolved-cached-true never open the zone", () => {
    expect(FREE_ENTITLEMENTS.canAccessHealthLab).toBe(false);

    expect(
      healthLabSignedInSurface(
        decidePremiumRouteAccess({ flag: true, entitlementsResolved: true }),
      ),
    ).toBe("health-lab-zone");

    expect(
      healthLabSignedInSurface(
        decidePremiumRouteAccess({ flag: false, entitlementsResolved: true }),
      ),
    ).toBe("static-preview");
    expect(
      healthLabSignedInSurface(
        decidePremiumRouteAccess({ flag: false, entitlementsResolved: false }),
      ),
    ).toBe("static-preview");
    expect(
      healthLabSignedInSurface(
        decidePremiumRouteAccess({ flag: null, entitlementsResolved: true }),
      ),
    ).toBe("static-preview");
    expect(
      healthLabSignedInSurface(
        decidePremiumRouteAccess({
          flag: undefined,
          entitlementsResolved: false,
          timedOut: true,
        }),
      ),
    ).toBe("static-preview");
    expect(
      healthLabSignedInSurface(
        decidePremiumRouteAccess({ flag: true, entitlementsResolved: false }),
      ),
    ).toBe("loading");
  });

  it("Care still lists Health by age; launch lock follows entitlement", () => {
    const care = resolveQuietPathsForRoom("care", {
      isInfant: false,
      ageMonths: 36,
      visibleTileIds: ["nutrition", "health-lab"],
    });
    expect(care.map((p) => p.id)).toContain("health-lab");

    expect(
      careHealthLabLaunchLocked({ isPremium: true, canAccessHealthLab: true }),
    ).toBe(false);
    expect(
      careHealthLabLaunchLocked({ isPremium: false, canAccessHealthLab: true }),
    ).toBe(false);
    expect(
      careHealthLabLaunchLocked({ isPremium: false, canAccessHealthLab: false }),
    ).toBe(true);
    expect(
      careHealthLabLaunchLocked({
        isPremium: true,
        canAccessHealthLab: true,
        hubHealthLabLocked: true,
      }),
    ).toBe(true);
  });

  it("denied /health-lab mounts the static preview, not HealthLabZone or practices", () => {
    render(<HealthLabStaticFreePreview />);
    expect(screen.getByTestId("health-lab-static-free-preview")).toBeTruthy();
    expect(screen.queryByTestId("health-lab-zone")).toBeNull();
    expect(screen.queryByTestId("health-lab-living")).toBeNull();
    expect(screen.queryByTestId("health-lab-quiet-breath-control")).toBeNull();
    expect(screen.queryByTestId("health-lab-practice-start")).toBeNull();
    expect(screen.getByRole("button", { name: /continue/i })).toBeTruthy();
  });

  it("LockedBlock keeps a denied Health launch card from navigating", () => {
    render(
      <LockedBlock locked>
        <a href="/health-lab" data-testid="health-lab-launch-card">
          Health
        </a>
      </LockedBlock>,
    );
    expect(screen.getByTestId("locked-block")).toBeTruthy();
    expect(screen.getByTestId("locked-block-overlay")).toBeTruthy();
    expect(screen.getByTestId("health-lab-launch-card")).toBeTruthy();
  });

  it("unlocked Health launch card stays interactive", () => {
    render(
      <LockedBlock locked={false}>
        <a href="/health-lab" data-testid="health-lab-launch-card">
          Health
        </a>
      </LockedBlock>,
    );
    expect(screen.queryByTestId("locked-block")).toBeNull();
    expect(screen.getByTestId("health-lab-launch-card")).toBeTruthy();
  });

  it("AppCore and Care hub keep Health Lab fail-closed on canAccessHealthLab", () => {
    const appCore = readFileSync(join(here, "../AppCore.tsx"), "utf8");
    expect(appCore).toContain('accessKey: "canAccessHealthLab"');
    expect(appCore).toContain("decidePremiumRouteAccess");
    expect(appCore).toContain('premiumDecision !== "ALLOW"');
    expect(appCore).toContain("HealthLabStaticFreePreview");
    expect(appCore).not.toMatch(/canAccessHealthLab\s*=\s*true/);

    const hub = readFileSync(join(here, "../pages/parenting-hub.tsx"), "utf8");
    expect(hub).toContain("entitlements?.canAccessHealthLab");
    expect(hub).toContain("isHubLocked(\"hub_health_lab\") || !healthLabRouteOpen");

    const page = readFileSync(join(here, "../pages/health-lab.tsx"), "utf8");
    expect(page).toContain("HealthLabZone");
    expect(page).not.toContain("HealthLabStaticFreePreview");

    const api = readFileSync(
      join(here, "../../../api-server/src/routes/health-lab.ts"),
      "utf8",
    );
    expect(api).toContain("requireHealthLabPremium");
    expect(api).toContain("assertHealthLabPremium");
  });
});
