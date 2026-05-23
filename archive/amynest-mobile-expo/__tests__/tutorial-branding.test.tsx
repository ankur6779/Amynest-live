/**
 * Tutorial branding lockdown.
 *
 * The tutorial screen has been polished into AmyNest's signature dark-purple
 * gradient + brand purple→pink CTA + Inter heading typography. There are no
 * snapshot guards on it today, which means a passing edit could quietly
 * revert the background, recolour the CTA, or change the heading weight /
 * letter-spacing without anyone noticing.
 *
 * This file pins the three things we don't want to drift:
 *   1. Dark-purple background gradient stops on the root LinearGradient.
 *   2. Brand purple → pink CTA gradient on the bottom button.
 *   3. Inter heading typography (font weight, family, letter-spacing).
 *
 * Heading typography is asserted against the captured `StyleSheet.create`
 * map (the source of truth) instead of crawling the rendered DOM, so the
 * test fails immediately if the constants in the StyleSheet itself change.
 */
import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render } from "@testing-library/react";
import { brand } from "@/constants/colors";

// Capture the styles map declared inside tutorial.tsx so we can assert on
// `styles.title` / `styles.ctaText` directly. `vi.hoisted` ensures the
// captured ref exists before the hoisted `vi.mock` factory runs.
const captured = vi.hoisted(() => ({ styles: {} as Record<string, any> }));

vi.mock("react-native", async () => {
  const actual = await vi.importActual<any>("react-native");
  return {
    ...actual,
    StyleSheet: {
      ...actual.StyleSheet,
      create: (styles: Record<string, any>) => {
        captured.styles = styles;
        return styles;
      },
    },
  };
});

vi.mock("expo-router", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), back: vi.fn() }),
  Stack: { Screen: () => null },
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k, i18n: { language: "en" } }),
}));

vi.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

vi.mock("expo-haptics", () => ({
  notificationAsync: vi.fn().mockResolvedValue(undefined),
  selectionAsync: vi.fn().mockResolvedValue(undefined),
  impactAsync: vi.fn().mockResolvedValue(undefined),
  NotificationFeedbackType: { Success: "success" },
  ImpactFeedbackStyle: { Light: "light", Medium: "medium" },
}));

vi.mock("@/utils/tutorialState", () => ({
  markTutorialSeen: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../assets/images/amynest-logo.png", () => ({ default: "logo.png" }));

import TutorialScreen from "../app/tutorial";

const DARK_BG = ["#0a061a", "#120a2e", "#050010"];

describe("Tutorial branding lockdown", () => {
  it("renders the dark-purple background gradient", () => {
    const { container } = render(<TutorialScreen />);
    const gradients = Array.from(
      container.querySelectorAll("[data-colors]"),
    ).map((el) => JSON.parse(el.getAttribute("data-colors") ?? "[]"));

    expect(gradients).toContainEqual(DARK_BG);
  });

  it("renders the brand purple → pink CTA gradient on the bottom button", () => {
    const { container } = render(<TutorialScreen />);
    const gradients = Array.from(
      container.querySelectorAll("[data-colors]"),
    ).map((el) => JSON.parse(el.getAttribute("data-colors") ?? "[]"));

    expect(gradients).toContainEqual([brand.purple500, brand.pink500]);
  });

  it("locks the slide title typography (Inter 800, -0.5 letter-spacing)", () => {
    render(<TutorialScreen />);
    expect(captured.styles.title).toMatchObject({
      fontWeight: "800",
      fontFamily: "Inter_700Bold",
      letterSpacing: -0.5,
      color: "#fff",
    });
  });

  it("locks the CTA button text typography (Inter 700, +0.1 letter-spacing)", () => {
    render(<TutorialScreen />);
    expect(captured.styles.ctaText).toMatchObject({
      fontWeight: "700",
      fontFamily: "Inter_700Bold",
      letterSpacing: 0.1,
      color: "#fff",
    });
  });
});
