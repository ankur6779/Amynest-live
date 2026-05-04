/**
 * Child detail screen — "Clear tutor history" button tests.
 *
 * Verifies:
 *   1. The button with testID="clear-tutor-history-btn" is rendered.
 *   2. Tapping it opens Alert.alert with the correct title/body.
 *   3. Confirming the dialog calls AsyncStorage.removeItem with the
 *      CHAT_KEY for the rendered child (`amynest:amy-tutor-chat:42`).
 *
 * Follows the same mocking conventions as amy-ai.test.tsx.
 */
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act, cleanup } from "@testing-library/react";
import { Alert } from "react-native";

const { mockAuthFetch, mockRemoveItem, mockUseQuery, mockInvalidateQueries } = vi.hoisted(() => ({
  mockAuthFetch: vi.fn(),
  mockRemoveItem: vi.fn().mockResolvedValue(undefined),
  mockUseQuery: vi.fn(),
  mockInvalidateQueries: vi.fn(),
}));

vi.mock("@/hooks/useAuthFetch", () => ({
  useAuthFetch: () => mockAuthFetch,
}));

vi.mock("expo-router", () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), replace: vi.fn() }),
  useLocalSearchParams: () => ({ id: "42" }),
}));

vi.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

vi.mock("@/contexts/ThemeContext", () => ({
  useTheme: () => ({ theme: { gradient: ["#0b0b1a", "#1a1633"] } }),
  ThemeProvider: ({ children }: any) => children,
}));

// audit-block-ignore-start (mock color fixtures for useColors in tests)
vi.mock("@/hooks/useColors", () => ({
  useColors: () => ({
    foreground: "#fff",
    mutedForeground: "#aaa",
    primary: "#7B3FF2",
    secondary: "#1a1633",
    muted: "#2a2050",
    card: "#0f0c29",
    border: "rgba(255,255,255,0.12)",
    background: "#0b0b1a",
  }),
}));
// audit-block-ignore-end

vi.mock("@/constants/colors", () => ({
  palette: {
    red50: "#fff5f5",
    red500: "#ef4444",
    rose200: "#fecdd3",
  },
}));

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn().mockResolvedValue(null),
    setItem: vi.fn().mockResolvedValue(undefined),
    removeItem: mockRemoveItem,
  },
}));

vi.mock("expo-image-picker", () => ({
  requestMediaLibraryPermissionsAsync: vi.fn().mockResolvedValue({ status: "denied" }),
  launchImageLibraryAsync: vi.fn(),
  MediaTypeOptions: { Images: "Images" },
}));

vi.mock("expo-haptics", () => ({
  impactAsync: vi.fn(),
  notificationAsync: vi.fn(),
  selectionAsync: vi.fn(),
  ImpactFeedbackStyle: { Light: "Light", Medium: "Medium" },
  NotificationFeedbackType: { Warning: "Warning" },
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: (opts: any) => mockUseQuery(opts),
  useQueryClient: () => ({ invalidateQueries: mockInvalidateQueries }),
}));

import ChildDetailScreen from "@/app/children/[id]";

const MOCK_CHILD = {
  id: 42,
  name: "Aarav",
  age: 7,
  ageMonths: 0,
  dob: "2017-03-15",
  isSchoolGoing: true,
  childClass: "2nd Grade",
  schoolStartTime: "09:00",
  schoolEndTime: "15:00",
  schoolDays: [1, 2, 3, 4, 5],
  wakeUpTime: "07:00",
  sleepTime: "21:00",
  foodType: "veg",
  goals: "balanced-routine",
  travelMode: "car",
  travelModeOther: null,
  photoUrl: null,
  babysitterId: null,
  feedingType: null,
  sleepPattern: null,
};

describe("Child detail screen — Clear tutor history button", () => {
  let alertSpy: ReturnType<typeof vi.spyOn>;

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    mockAuthFetch.mockReset();
    mockRemoveItem.mockReset();
    mockRemoveItem.mockResolvedValue(undefined);

    alertSpy = vi.spyOn(Alert, "alert");

    mockUseQuery.mockImplementation((opts: any) => {
      if (opts?.queryKey?.[0] === "child") {
        return { data: MOCK_CHILD, isLoading: false };
      }
      if (opts?.queryKey?.[0] === "babysitters") {
        return { data: [], isLoading: false };
      }
      return { data: undefined, isLoading: false };
    });
  });

  it("renders the clear-tutor-history-btn testID", () => {
    render(<ChildDetailScreen />);
    expect(screen.getByTestId("clear-tutor-history-btn")).toBeInTheDocument();
  });

  it("tapping the button opens Alert.alert with the correct title and child name in the body", () => {
    render(<ChildDetailScreen />);

    fireEvent.click(screen.getByTestId("clear-tutor-history-btn"));

    expect(alertSpy).toHaveBeenCalledTimes(1);
    const [title, body] = alertSpy.mock.calls[0] as [string, string, ...unknown[]];
    expect(title).toBe("Clear Chat?");
    expect(body).toContain("Aarav");
  });

  it("confirming the dialog calls AsyncStorage.removeItem with the correct CHAT_KEY", async () => {
    render(<ChildDetailScreen />);

    fireEvent.click(screen.getByTestId("clear-tutor-history-btn"));

    expect(alertSpy).toHaveBeenCalledTimes(1);
    const buttons = alertSpy.mock.calls[0][2] as Array<{
      text: string;
      style?: string;
      onPress?: () => void;
    }>;

    const confirmBtn = buttons.find((b) => b.style === "destructive");
    expect(confirmBtn).toBeDefined();

    await act(async () => {
      confirmBtn!.onPress?.();
    });

    expect(mockRemoveItem).toHaveBeenCalledTimes(1);
    expect(mockRemoveItem).toHaveBeenCalledWith("amynest:amy-tutor-chat:42");
  });

  it("cancelling the dialog does NOT call AsyncStorage.removeItem", () => {
    render(<ChildDetailScreen />);

    fireEvent.click(screen.getByTestId("clear-tutor-history-btn"));

    const buttons = alertSpy.mock.calls[0][2] as Array<{
      text: string;
      style?: string;
      onPress?: () => void;
    }>;

    const cancelBtn = buttons.find((b) => b.style === "cancel");
    expect(cancelBtn).toBeDefined();
    cancelBtn!.onPress?.();

    expect(mockRemoveItem).not.toHaveBeenCalled();
  });
});
