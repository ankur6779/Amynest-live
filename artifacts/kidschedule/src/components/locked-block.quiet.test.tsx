import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { LockedBlock } from "@/components/locked-block";
import { ParentHubQuietModuleProvider } from "@/lib/parent-hub/quiet-module-context";
import { PREMIUM_VOICE } from "@/lib/amynest-philosophy";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (_key: string, opts?: { defaultValue?: string }) => opts?.defaultValue ?? _key,
  }),
}));

vi.mock("@/lib/subscription-gate", () => ({
  openSubscriptionGate: vi.fn(),
}));

describe("Pack 5 LockedBlock quiet continuity", () => {
  it("uses PREMIUM_VOICE continuity outside quiet rooms (portfolio P0 — no Unlock theatre)", () => {
    render(
      <LockedBlock locked>
        <div>child</div>
      </LockedBlock>,
    );
    expect(screen.getByTestId("premium-feature-lock")).toHaveTextContent(
      PREMIUM_VOICE.continueCta,
    );
    expect(screen.getByTestId("premium-feature-lock")).not.toHaveTextContent(
      /unlock/i,
    );
  });

  it("uses PREMIUM_VOICE continue CTA inside quiet rooms", () => {
    render(
      <ParentHubQuietModuleProvider>
        <LockedBlock locked>
          <div>child</div>
        </LockedBlock>
      </ParentHubQuietModuleProvider>,
    );
    expect(screen.getByTestId("premium-feature-lock")).toHaveTextContent(
      PREMIUM_VOICE.continueCta,
    );
    expect(screen.getByTestId("locked-block")).toHaveAttribute(
      "data-ph-continuity",
      "true",
    );
  });
});
