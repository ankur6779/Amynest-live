/**
 * End-to-end test for the redesigned onboarding chat flow.
 *
 * Drives OnboardingScreen through both branches the redesign added —
 * a school-age child (full school sub-flow) and an infant (feeding +
 * sleep sub-flow) — plus the parent tail, then verifies the
 * notifications-permission gate (shown when undetermined, skipped when
 * granted/denied) and the progress-bar denominators (STANDARD = 18,
 * INFANT = 11).
 *
 * The first import below patches Node's module resolver so the
 * screen's runtime `require("expo-notifications")` /
 * `require("expo-device")` calls hit local CJS shims with mutable
 * state on globalThis (vi.mock and resolve.alias only intercept ESM
 * imports). The patch is scoped to this test file so it cannot leak
 * into other suites.
 */
import "./_onboarding-require-shim";

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, fireEvent, cleanup, act } from "@testing-library/react";

type NotifState = {
  status: "granted" | "denied" | "undetermined";
  canAskAgain: boolean;
  requestResult: "granted" | "denied" | "undetermined";
  scheduledIds: string[];
};
const g = globalThis as unknown as { __notifMockState: NotifState };

const captured = vi.hoisted(() => ({ mockDob: new Date(2019, 0, 1) }));

vi.mock("react-native", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("react-native");
  const ease = (n: number) => n;
  return {
    ...actual,
    Easing: {
      out: () => ease,
      inOut: () => ease,
      in: () => ease,
      cubic: ease,
      ease,
      linear: ease,
    },
    // Force android: the iOS DateTimePicker wraps itself in a Modal
    // without a `visible` prop, which the shared Modal mock would hide.
    Platform: {
      ...(actual.Platform as Record<string, unknown>),
      OS: "android",
      select: (obj: Record<string, unknown>) => obj.android ?? obj.default,
    },
  };
});

vi.mock("@react-native-community/datetimepicker", () => ({
  default: ({ onChange }: { onChange?: (e: unknown, d: Date) => void }) => {
    React.useEffect(() => {
      onChange?.({ type: "set" }, captured.mockDob);
    }, []);
    return null;
  },
}));

const replaceMock = vi.fn();
const authFetchMock = vi.fn();

vi.mock("expo-router", () => ({
  useRouter: () => ({ replace: replaceMock, push: vi.fn(), back: vi.fn() }),
}));
vi.mock("@/lib/firebase-auth", () => ({
  useUser: () => ({ user: { firstName: "Aarav", uid: "u-1" } }),
}));
vi.mock("@/hooks/useAuthFetch", () => ({ useAuthFetch: () => authFetchMock }));
vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({
    setQueryData: vi.fn(),
    invalidateQueries: vi.fn().mockResolvedValue(undefined),
  }),
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
vi.mock("../assets/images/amynest-logo.png", () => ({ default: "logo.png" }));

import OnboardingScreen from "../app/onboarding";

// ─── helpers ───────────────────────────────────────────────────────────────

async function tick(ms = 2000): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

function findButtonByText(text: string): HTMLButtonElement {
  const buttons = Array.from(
    document.querySelectorAll("button"),
  ) as HTMLButtonElement[];
  const match = buttons.find((b) => (b.textContent ?? "").trim() === text);
  if (!match) {
    const visible = buttons
      .map((b) => `[${(b.textContent ?? "").trim()}]`)
      .join(" ");
    throw new Error(`Button "${text}" not found. Visible: ${visible}`);
  }
  return match;
}

async function clickButton(text: string): Promise<void> {
  fireEvent.click(findButtonByText(text));
  await tick();
}

function getActiveInput(): HTMLInputElement {
  const inputs = Array.from(
    document.querySelectorAll("input"),
  ) as HTMLInputElement[];
  if (inputs.length === 0) throw new Error("No <input> rendered");
  return inputs[inputs.length - 1]!;
}

async function typeAndSend(value: string): Promise<void> {
  const input = getActiveInput();
  fireEvent.change(input, { target: { value } });
  // The TextInput mock doesn't proxy onSubmitEditing; click the
  // companion arrow-forward send button.
  const sendBtn = (
    Array.from(document.querySelectorAll("button")) as HTMLButtonElement[]
  ).find((b) => b.querySelector('[data-icon="arrow-forward"]'));
  if (!sendBtn) throw new Error("Send button (arrow-forward) not found");
  fireEvent.click(sendBtn);
  await tick();
}

function parseProgress(): { current: number; total: number } | null {
  const span = Array.from(document.querySelectorAll("span")).find((s) =>
    /^Step \d+ of \d+$/.test((s.textContent ?? "").trim()),
  );
  if (!span) return null;
  const m = /^Step (\d+) of (\d+)$/.exec((span.textContent ?? "").trim());
  if (!m) return null;
  return { current: Number(m[1]), total: Number(m[2]) };
}

// STANDARD = 9 child steps + 7 parent-tail steps = 16.
// INFANT   = 4 child steps + 7 parent-tail steps = 11.
const STANDARD_TOTAL = 16;
const INFANT_TOTAL = 11;

async function fillParentTail(): Promise<void> {
  await typeAndSend("Priya");
  await clickButton("Mother");
  await clickButton("Work from Home");
  await clickButton("Indian Cuisine 🇮🇳");
  await clickButton("North Indian");
  await typeAndSend("9876543210");
  await typeAndSend("peanuts");
  // Let saveEverything's three awaited fetches resolve.
  await tick(2000);
}

// ─── tests ─────────────────────────────────────────────────────────────────

describe("Onboarding chat — end-to-end flow", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    replaceMock.mockReset();
    authFetchMock.mockReset();
    authFetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
    });
    g.__notifMockState ??= {
      status: "undetermined",
      canAskAgain: true,
      requestResult: "granted",
      scheduledIds: [],
    };
    g.__notifMockState.status = "undetermined";
    g.__notifMockState.canAskAgain = true;
    g.__notifMockState.requestResult = "granted";
    g.__notifMockState.scheduledIds = [];
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it(
    "school-age + infant journey: posts payloads, switches denominator, shows notifications step when undetermined",
    async () => {
      g.__notifMockState.status = "undetermined";

      render(<OnboardingScreen />);
      await tick(3500); // intro animation chain

      // ── Child 1: school-age ───────────────────────────────────────────
      captured.mockDob = new Date(2019, 0, 1);
      await typeAndSend("Riya");
      await clickButton("2019-01-01");
      await tick();
      const dobProgress = parseProgress();
      expect(dobProgress?.total).toBe(STANDARD_TOTAL);
      expect(dobProgress?.current).toBeGreaterThan(0);

      await clickButton("Confirm");
      await clickButton("Yes, school going");
      await clickButton("LKG / KG");
      await clickButton("Confirm"); // school-start — accepts default time from TimePickerField
      await clickButton("Confirm"); // school-end
      await clickButton("Continue"); // school-days defaults Mon–Fri

      const midProgress = parseProgress();
      expect(midProgress?.total).toBe(STANDARD_TOTAL);
      expect(midProgress?.current).toBeGreaterThan(dobProgress!.current);

      await clickButton("Confirm"); // wake time
      await clickButton("Confirm"); // sleep time

      await clickButton("Yes, add another");

      // ── Child 2: infant ───────────────────────────────────────────────
      captured.mockDob = new Date(2025, 0, 1);
      await typeAndSend("Baby Aarav");
      // The DOB input still labels the previous child's date; clicking
      // it remounts the picker and the mock fires with the new DOB.
      await clickButton("2019-01-01");
      await tick();
      await clickButton("Confirm");

      await clickButton("🤱 Breastfeeding");
      await clickButton("😴 Flexible (naps as needed)");

      await clickButton("No, continue");
      await fillParentTail();

      const goBtn = findButtonByText("Continue");
      expect(goBtn).toBeTruthy();

      const urls = authFetchMock.mock.calls.map((c) => c[0]);
      expect(urls.filter((u) => u === "/api/children")).toHaveLength(2);
      expect(urls).toContain("/api/parent-profile");
      expect(urls).toContain("/api/onboarding");

      const childBodies = authFetchMock.mock.calls
        .filter((c) => c[0] === "/api/children")
        .map((c) => JSON.parse(c[1].body));
      const school = childBodies.find((b) => b.name === "Riya");
      const infant = childBodies.find((b) => b.name === "Baby Aarav");
      expect(school?.isSchoolGoing).toBe(true);
      expect(school?.childClass).toBe("LKG / KG");
      expect(school?.schoolDays).toEqual([1, 2, 3, 4, 5]);
      expect(infant?.isSchoolGoing).toBe(false);
      expect(infant?.schoolDays).toBeNull();

      // ── Notifications gate (UNDETERMINED → step shown) ────────────────
      fireEvent.click(goBtn);
      await tick(500);
      expect(replaceMock).not.toHaveBeenCalled();

      const allowBtn = findButtonByText("Allow Notifications 🔔");
      expect(allowBtn).toBeTruthy();
      expect(findButtonByText("Maybe later — Go to Dashboard")).toBeTruthy();

      fireEvent.click(allowBtn);
      await tick(500);
      expect(g.__notifMockState.status).toBe("granted");
      expect(replaceMock).toHaveBeenCalledWith("/(tabs)");
    },
    30000,
  );

  it(
    "infant-only on shorter denominator: notifications step SKIPPED when permission already granted",
    async () => {
      g.__notifMockState.status = "granted";

      render(<OnboardingScreen />);
      await tick(3500);

      captured.mockDob = new Date(2025, 0, 1);
      await typeAndSend("Baby Riya");
      await clickButton("2019-01-01");
      await tick();
      await clickButton("Confirm");

      const infantProgress = parseProgress();
      expect(infantProgress?.total).toBe(INFANT_TOTAL);
      expect(infantProgress?.current).toBeGreaterThan(0);

      await clickButton("🤱 Breastfeeding");
      expect(parseProgress()?.total).toBe(INFANT_TOTAL);

      await clickButton("😴 Flexible (naps as needed)");
      await clickButton("No, continue");
      await fillParentTail();

      const goBtn = findButtonByText("Continue");
      const childCalls = authFetchMock.mock.calls.filter(
        (c) => c[0] === "/api/children",
      );
      expect(childCalls).toHaveLength(1);
      const body = JSON.parse(childCalls[0][1].body);
      expect(body.name).toBe("Baby Riya");
      expect(body.isSchoolGoing).toBe(false);
      expect(body.schoolDays).toBeNull();

      fireEvent.click(goBtn);
      await tick(500);
      expect(replaceMock).toHaveBeenCalledWith("/(tabs)");
      expect(
        Array.from(document.querySelectorAll("button")).some(
          (b) => (b.textContent ?? "").trim() === "Allow Notifications 🔔",
        ),
      ).toBe(false);
    },
    30000,
  );

  it(
    "notifications step SKIPPED when permission already 'denied'",
    async () => {
      g.__notifMockState.status = "denied";
      g.__notifMockState.canAskAgain = false;

      render(<OnboardingScreen />);
      await tick(3500);

      captured.mockDob = new Date(2019, 0, 1);
      await typeAndSend("Riya");
      await clickButton("2019-01-01");
      await tick();
      await clickButton("Confirm");
      await clickButton("Yes, school going");
      await clickButton("LKG / KG");
      await clickButton("Confirm"); // school-start
      await clickButton("Confirm"); // school-end
      await clickButton("Continue");
      await clickButton("Confirm"); // wake time
      await clickButton("Confirm"); // sleep time
      await clickButton("No, continue");
      await fillParentTail();

      fireEvent.click(findButtonByText("Continue"));
      await tick(500);

      expect(replaceMock).toHaveBeenCalledWith("/(tabs)");
      expect(
        Array.from(document.querySelectorAll("button")).some(
          (b) => (b.textContent ?? "").trim() === "Allow Notifications 🔔",
        ),
      ).toBe(false);
    },
    30000,
  );
});
