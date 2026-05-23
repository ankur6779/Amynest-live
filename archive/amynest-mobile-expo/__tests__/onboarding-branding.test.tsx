/**
 * Onboarding chat branding lockdown.
 *
 * The onboarding chat screen uses the same dark-purple gradient as the
 * tutorial / sign-up flow, plus a brand purple → pink CTA on its
 * "Saving" / "Done" / "Save error" terminal states and Inter heading
 * typography. This file pins:
 *
 *   1. Dark-purple background gradient stops on the root LinearGradient
 *      (rendered on the chat surface as well as the saving/done/error
 *      terminal states).
 *   2. Brand purple → pink CTA gradient referenced in the source for the
 *      done / save-error CTA buttons. The terminal states are gated on
 *      internal `step` state that's hard to drive from a unit test, so we
 *      assert against the file source directly — the two `LinearGradient`
 *      blocks must keep using `[brand.purple500, brand.pink500]`.
 *   3. Inter heading typography on both the chat header (`amyName`) and
 *      the terminal-state title (`doneTitle`), captured straight from the
 *      `StyleSheet.create` map so the test catches drift even on screens
 *      we don't render in this test.
 */
import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render } from "@testing-library/react";
import * as fs from "node:fs";
import * as path from "node:path";

// `vi.hoisted` ensures the captured ref exists before the hoisted `vi.mock`
// factory runs, so the screen's `StyleSheet.create({...})` at module load
// time can write into it.
const captured = vi.hoisted(() => ({ styles: {} as Record<string, any> }));

vi.mock("react-native", async () => {
  const actual = await vi.importActual<any>("react-native");
  const ease = (n: number) => n;
  const easingFactory = Object.assign(ease, { out: () => ease, inOut: () => ease, in: () => ease, cubic: ease, ease });
  const animatedValue = () => ({
    interpolate: () => "0%",
    setValue: () => {},
    stopAnimation: () => {},
    addListener: () => 0,
    removeListener: () => {},
    removeAllListeners: () => {},
  });
  const noopAnim = () => ({ start: (cb?: any) => { cb && cb({ finished: true }); }, stop: () => {}, reset: () => {} });
  return {
    ...actual,
    Easing: { out: () => ease, inOut: () => ease, in: () => ease, cubic: ease, ease, linear: ease },
    Animated: {
      ...(actual.Animated ?? {}),
      Value: function (this: any, v: number) { return animatedValue(); } as any,
      View: actual.View,
      timing: noopAnim,
      sequence: noopAnim,
      parallel: noopAnim,
      loop: noopAnim,
      delay: noopAnim,
    },
    StyleSheet: {
      ...actual.StyleSheet,
      create: (styles: Record<string, any>) => {
        captured.styles = styles;
        return styles;
      },
    },
    FlatList: ({ data, renderItem, ListHeaderComponent }: any) =>
      React.createElement(
        "div",
        { "data-testid": "flat-list" },
        ListHeaderComponent ?? null,
        (data ?? []).map((item: any, idx: number) =>
          React.createElement(
            React.Fragment,
            { key: item?.id ?? idx },
            renderItem({ item, index: idx }),
          ),
        ),
      ),
  };
});

vi.mock("@react-native-community/datetimepicker", () => ({
  default: () => null,
}));

vi.mock("expo-router", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), back: vi.fn() }),
}));

vi.mock("@/lib/firebase-auth", () => ({
  useUser: () => ({ user: { firstName: "Aarav", uid: "u-1" } }),
}));

vi.mock("@/hooks/useAuthFetch", () => ({
  useAuthFetch: () =>
    vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) }),
}));

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({
    setQueryData: vi.fn(),
    invalidateQueries: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

vi.mock("expo-constants", () => ({
  default: { executionEnvironment: "standalone" },
  ExecutionEnvironment: { Bare: "bare", Standalone: "standalone", StoreClient: "storeClient" },
}));

vi.mock("expo-device", () => ({
  isDevice: false,
}));

vi.mock("expo-notifications", () => ({
  getPermissionsAsync: vi.fn().mockResolvedValue({ status: "undetermined", granted: false }),
  requestPermissionsAsync: vi.fn().mockResolvedValue({ status: "granted", granted: true }),
  setNotificationChannelAsync: vi.fn().mockResolvedValue(undefined),
  setNotificationHandler: vi.fn(),
  AndroidImportance: { DEFAULT: 3, HIGH: 4, MAX: 5 },
}));

vi.mock("expo-haptics", () => ({
  notificationAsync: vi.fn().mockResolvedValue(undefined),
  selectionAsync: vi.fn().mockResolvedValue(undefined),
  impactAsync: vi.fn().mockResolvedValue(undefined),
  NotificationFeedbackType: { Success: "success" },
  ImpactFeedbackStyle: { Light: "light", Medium: "medium" },
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k, i18n: { language: "en" } }),
}));

vi.mock("../assets/images/amynest-logo.png", () => ({ default: "logo.png" }));

import OnboardingScreen from "../app/onboarding";

const DARK_BG = ["#0a061a", "#120a2e", "#050010"];

describe("Onboarding chat branding lockdown", () => {
  it("renders the dark-purple background gradient on the chat surface", () => {
    const { container } = render(<OnboardingScreen />);
    const gradients = Array.from(
      container.querySelectorAll("[data-colors]"),
    ).map((el) => JSON.parse(el.getAttribute("data-colors") ?? "[]"));

    expect(gradients).toContainEqual(DARK_BG);
  });

  it("keeps the brand purple → pink CTA gradient on the done / save-error states", () => {
    // The done / save-error terminals are state-gated; their CTA gradient is
    // declared inline in the source. Asserting against the file text catches
    // a drift even though we can't drive the screen into those states from
    // this test without a full multi-step flow.
    const file = fs.readFileSync(
      path.resolve(__dirname, "../app/onboarding.tsx"),
      "utf8",
    );

    const ctaPattern = /colors=\{\[\s*brand\.purple500\s*,\s*brand\.pink500\s*\]\}/g;
    const matches = file.match(ctaPattern) ?? [];

    // One for the "done" CTA, one for the "save-error" retry CTA.
    expect(matches.length).toBeGreaterThanOrEqual(2);

    // The brand-hex-drift script (scripts/check-brand-hex-drift.sh) keeps the
    // raw purple500 / pink500 hex values pinned inside constants/colors.ts —
    // we don't duplicate them here so this file stays drift-clean too.
  });

  it("locks the chat header typography (Inter 700, -0.2 letter-spacing)", () => {
    render(<OnboardingScreen />);
    expect(captured.styles.amyName).toMatchObject({
      fontFamily: "Inter_700Bold",
      letterSpacing: -0.2,
      color: "#FFFFFF",
    });
  });

  it("locks the terminal-state title typography (Inter 700, -0.4 letter-spacing)", () => {
    render(<OnboardingScreen />);
    expect(captured.styles.doneTitle).toMatchObject({
      fontFamily: "Inter_700Bold",
      letterSpacing: -0.4,
      color: "#FFFFFF",
    });
  });

  it("locks the terminal-state CTA text typography (Inter 700, +0.1 letter-spacing)", () => {
    render(<OnboardingScreen />);
    expect(captured.styles.doneBtnText).toMatchObject({
      fontFamily: "Inter_700Bold",
      letterSpacing: 0.1,
      color: "#fff",
    });
  });
});
