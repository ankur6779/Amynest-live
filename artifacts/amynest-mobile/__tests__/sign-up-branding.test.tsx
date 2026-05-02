/**
 * Sign-up branding lockdown.
 *
 * Sign-up uses the same dark-purple gradient as the tutorial plus a brand
 * BRAND_GRADIENT (purple → pink) "Create account" button and Inter heading
 * typography. Without snapshot coverage, an edit could quietly recolour the
 * background, swap the CTA gradient, or change the heading weight without
 * anyone noticing.
 *
 * This file pins:
 *   1. Dark-purple background gradient stops on the root LinearGradient.
 *   2. BRAND_GRADIENT (purple → pink) on the primary CTA.
 *   3. Inter heading typography (font weight, family, letter-spacing).
 */
import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, fireEvent } from "@testing-library/react";
import { BRAND_GRADIENT, BRAND_GRADIENT_DISABLED } from "@/constants/colors";

// `vi.hoisted` ensures the captured ref exists before the hoisted `vi.mock`
// factory runs, so the screen's `StyleSheet.create({...})` at module load
// time can write into it.
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

// Firebase auth would try to talk to the network on import; stub it out.
vi.mock("firebase/auth", () => ({
  createUserWithEmailAndPassword: vi.fn(),
  updateProfile: vi.fn(),
  signInWithPhoneNumber: vi.fn(),
}));

vi.mock("@/lib/firebase", () => ({
  firebaseAuth: {},
}));

vi.mock("expo-router", () => ({
  Link: ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", null, children),
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), back: vi.fn() }),
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

vi.mock("@/utils/humanizeError", () => ({
  humanizeError: (_err: unknown, fallback: string) => fallback,
}));

// PhoneAuthFlow pulls in firebase + a recaptcha verifier — out of scope here.
vi.mock("@/components/PhoneAuthFlow", () => ({
  default: () => React.createElement("div", { "data-testid": "phone-auth-flow" }),
}));

// NeonRingHero uses react-native-svg + Animated APIs that aren't worth wiring
// up for a pure branding-token assertion.
vi.mock("@/components/NeonRingHero", () => ({
  default: () => React.createElement("div", { "data-testid": "neon-ring-hero" }),
}));

import SignUpScreen from "../app/sign-up";

const DARK_BG = ["#0a061a", "#120a2e", "#050010"];

describe("Sign-up branding lockdown", () => {
  it("renders the dark-purple background gradient", () => {
    const { container } = render(<SignUpScreen />);
    const gradients = Array.from(
      container.querySelectorAll("[data-colors]"),
    ).map((el) => JSON.parse(el.getAttribute("data-colors") ?? "[]"));

    expect(gradients).toContainEqual(DARK_BG);
  });

  it("uses BRAND_GRADIENT_DISABLED on the CTA while the form is empty", () => {
    const { container } = render(<SignUpScreen />);
    const gradients = Array.from(
      container.querySelectorAll("[data-colors]"),
    ).map((el) => JSON.parse(el.getAttribute("data-colors") ?? "[]"));

    expect(gradients).toContainEqual([...BRAND_GRADIENT_DISABLED]);
  });

  it("flips to BRAND_GRADIENT (purple → pink) once the form is fillable", () => {
    const { container } = render(<SignUpScreen />);

    // Walk through name → email → password and fill each with valid input.
    // Inputs are rendered in the order: first name, email, password.
    const inputs = container.querySelectorAll("input");
    expect(inputs.length).toBeGreaterThanOrEqual(3);
    fireEvent.change(inputs[0]!, { target: { value: "Aarav" } });
    fireEvent.change(inputs[1]!, { target: { value: "aarav@example.com" } });
    fireEvent.change(inputs[2]!, { target: { value: "supersecret" } });

    const gradients = Array.from(
      container.querySelectorAll("[data-colors]"),
    ).map((el) => JSON.parse(el.getAttribute("data-colors") ?? "[]"));

    // BRAND_GRADIENT is a readonly tuple — compare against a plain array copy.
    expect(gradients).toContainEqual([...BRAND_GRADIENT]);
  });

  it("locks the card title typography (Inter 700, -0.3 letter-spacing)", () => {
    render(<SignUpScreen />);
    expect(captured.styles.title).toMatchObject({
      fontWeight: "700",
      fontFamily: "Inter_700Bold",
      letterSpacing: -0.3,
      color: "#FFFFFF",
    });
  });

  it("locks the primary CTA text typography (Inter 700, white)", () => {
    render(<SignUpScreen />);
    expect(captured.styles.primaryBtnText).toMatchObject({
      fontWeight: "700",
      fontFamily: "Inter_700Bold",
      color: "#fff",
    });
  });
});
