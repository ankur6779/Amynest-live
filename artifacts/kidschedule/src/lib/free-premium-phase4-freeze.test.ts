import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { HealthLabStaticFreePreview } from "@/components/health-lab/health-lab-static-free-preview";
import { PREMIUM_VOICE } from "@/lib/amynest-philosophy";

vi.mock("@/lib/subscription-gate", () => ({
  openSubscriptionGate: vi.fn(),
}));

const here = dirname(fileURLToPath(import.meta.url));

describe("Phase 4 Health Lab static preview freeze", () => {
  it("AppCore still gates Health Lab on canAccessHealthLab and never mounts the zone for free users", () => {
    const appCore = readFileSync(join(here, "../AppCore.tsx"), "utf8");
    expect(appCore).toContain('accessKey: "canAccessHealthLab"');
    expect(appCore).toContain("!entitlements[premiumRoute.accessKey]");
    expect(appCore).toContain("HealthLabStaticFreePreview");
    expect(appCore).toContain('premiumRoute.accessKey === "canAccessHealthLab"');
    expect(appCore).not.toMatch(/canAccessHealthLab\s*=\s*true/);
  });

  it("static preview does not mount HealthLabZone or call Health Lab APIs", () => {
    const preview = readFileSync(
      join(here, "../components/health-lab/health-lab-static-free-preview.tsx"),
      "utf8",
    );
    expect(preview).not.toContain("HealthLabZone");
    expect(preview).not.toContain("/api/health-lab");
    expect(preview).not.toContain("fetch(");
    expect(preview).toContain("health-lab-static-free-preview");
    expect(preview.toLowerCase()).not.toMatch(/shop|quest|coins|xp |unlock now|fomo/);
  });

  it("HealthLabPage still mounts HealthLabZone only after AppCore entitlement", () => {
    const page = readFileSync(join(here, "../pages/health-lab.tsx"), "utf8");
    expect(page).toContain("HealthLabZone");
    expect(page).not.toContain("HealthLabStaticFreePreview");
    expect(page).not.toMatch(/canAccessHealthLab\s*=\s*true/);
  });

  it("renders a calm room preview with Premium CTA and leave path", () => {
    render(<HealthLabStaticFreePreview />);
    expect(screen.getByTestId("health-lab-static-free-preview")).toBeTruthy();
    expect(screen.getByRole("button", { name: PREMIUM_VOICE.continueCta })).toBeTruthy();
    expect(screen.getByText(/Parent Hub|Leave for now/)).toBeTruthy();
    expect(screen.queryByTestId("health-lab-zone")).toBeNull();
  });
});

describe("Phase 4 Speech V2 first-use freeze", () => {
  it("does not describe first-use as a daily quota or Premium trial", () => {
    const usage = readFileSync(
      join(here, "../features/speech-coach-v2/lib/usage-display.ts"),
      "utf8",
    );
    expect(usage).toContain("Try Amy's speaking practice free.");
    expect(usage).toContain("You have a one-time free speaking practice.");
    expect(usage).not.toMatch(/90-second daily|3-day trial|Premium trial/);
  });

  it("limit-reached treats first-use exhaustion as continuation, not tomorrow", () => {
    const limit = readFileSync(
      join(here, "../features/speech-coach-v2/components/limit-reached.tsx"),
      "utf8",
    );
    expect(limit).toContain("isFirstUseFree");
    expect(limit).toContain("10 minutes every day");
    expect(limit).not.toMatch(/come back tomorrow/i);
  });

  it("session hook treats first_use_limit_reached as a server limit", () => {
    const hook = readFileSync(
      join(here, "../features/speech-coach-v2/hooks/use-speech-coach-v2-session.ts"),
      "utf8",
    );
    expect(hook).toContain("first_use_limit_reached");
    expect(hook).toContain("isFirstUseFree");
  });
});
