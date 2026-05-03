/**
 * Parent Hub pager UI test.
 *
 * `hub-bands.test.ts` locks the section taxonomy (which tile lives where),
 * but it doesn't exercise the actual horizontal pager that ships in
 * `app/(tabs)/hub.tsx`. The pager has 3 invariants worth a regression test:
 *
 *   1. Tapping a section tab updates `activeSection` AND scrolls the
 *      underlying FlatList to the matching offset.
 *   2. A `onMomentumScrollEnd` event at offset N updates the active tab
 *      to `SECTION_KEYS[N]` (this is what makes a swipe feel "snappy").
 *   3. Switching the active child reads `hub.lastSection.v1.<childId>` from
 *      AsyncStorage and restores the saved tab on mount.
 *
 * Without this test a regression in pager wiring (e.g. `pageWidth` going
 * to 0, mount-tracking dropping a section, the per-child storage key
 * drifting) would only surface in manual QA. The test relies on the
 * `__flatListTestState` registry exposed by the react-native FlatList
 * mock to capture `scrollToOffset` calls and to trigger the momentum
 * handler synthetically.
 */
import React from "react";
import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
} from "vitest";
import {
  render,
  screen,
  cleanup,
  waitFor,
  act,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// `__flatListTestState` is exposed by the React Native mock at
// `__mocks__/react-native.tsx` (vitest aliases `react-native` to that file).
// The real `react-native` package does NOT export it, so we import via the
// explicit relative path to keep tsc + vitest both satisfied.
import { __flatListTestState } from "../__mocks__/react-native";
import { SECTION_KEYS } from "@/app/(tabs)/hub-sections";

// ─── Module mocks (must be declared before the component is imported) ───────

const mockAuthFetch = vi.fn();

vi.mock("@/hooks/useAuthFetch", () => ({
  useAuthFetch: () => mockAuthFetch,
}));

vi.mock("@/hooks/useProfileComplete", () => ({
  useProfileComplete: () => ({ profileComplete: true, isLoading: false }),
}));

vi.mock("@/hooks/useFeatureUsage", () => ({
  useFeatureUsage: () => ({
    isPremium: true,
    hasUsedFeature: () => true,
    markFeatureUsed: vi.fn(),
    isFeatureLocked: () => false,
  }),
}));

vi.mock("@/hooks/useTodayRoutine", () => ({
  useTodayRoutine: () => ({
    routines: [],
    todaysRoutine: null,
    tasks: [],
    isLoading: false,
    isRefetching: false,
    refetch: vi.fn().mockResolvedValue(undefined),
    onToggle: vi.fn(),
    taskIdToItemIndex: () => null,
  }),
}));

vi.mock("@/contexts/ThemeContext", () => ({
  useTheme: () => ({
    mode: "dark",
    theme: { gradient: ["#000", "#111"] },
  }),
}));

// audit-block-ignore-start (mock color fixtures for useColors in tests)
vi.mock("@/hooks/useColors", () => ({
  useColors: () => ({
    background: "#0f0c29",
    foreground: "#ffffff",
    primary: "#7B3FF2",
    primaryForeground: "#ffffff",
    surface: "#1a1633",
    surfaceElevated: "#221c40",
    textMuted: "#9aa0c2",
    textDim: "#6b7099",
    glassBorder: "rgba(255,255,255,0.12)",
    calloutBg: "rgba(255,255,255,0.05)",
    statusErrorBg: "rgba(239,68,68,0.12)",
    statusErrorBorder: "rgba(239,68,68,0.3)",
    statusErrorText: "#fca5a5",
    statusSuccessBg: "rgba(34,197,94,0.12)",
    statusSuccessBorder: "rgba(34,197,94,0.3)",
    statusSuccessText: "#86efac",
    radius: 12,
  }),
}));
// audit-block-ignore-end

vi.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaProvider: ({ children }: { children?: React.ReactNode }) => children,
}));

vi.mock("expo-router", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
}));

vi.mock("@workspace/infant-hub", () => ({
  isInfantHubAge: () => false,
}));

const mockGetItem = vi.fn();
const mockSetItem = vi.fn();
const mockRemoveItem = vi.fn();

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: (...args: unknown[]) => mockGetItem(...args),
    setItem: (...args: unknown[]) => mockSetItem(...args),
    removeItem: (...args: unknown[]) => mockRemoveItem(...args),
  },
}));

// All the heavy hub components (LifeSkillsZone, InfantHub, ParentingArticles,
// etc.) are stubbed out so the test focuses on pager wiring instead of every
// tile's data fetching. Each stub renders an inert <div /> so the IIFE that
// builds tiles still runs and the pager renders all 4 pages.
function makeStub(label: string) {
  return ({ children }: { children?: React.ReactNode }) =>
    React.createElement(
      "div",
      { "data-stub": label },
      children ?? null,
    );
}

vi.mock("@/components/LifeSkillsZone", () => ({
  LifeSkillsZone: makeStub("life-skills-zone"),
}));
vi.mock("@/components/InfantHub", () => ({
  default: makeStub("infant-hub"),
}));
vi.mock("@/components/ParentingArticles", () => ({
  ParentingArticles: makeStub("parenting-articles"),
}));
vi.mock("@/components/ArtCraftReels", () => ({
  ArtCraftReels: makeStub("art-craft-reels"),
}));
vi.mock("@/components/PrintableWorksheets", () => ({
  PrintableWorksheets: makeStub("printable-worksheets"),
}));
vi.mock("@/components/AmazingFacts", () => ({
  AmazingFacts: makeStub("amazing-facts"),
}));
vi.mock("@/components/FuturePredictor", () => ({
  default: makeStub("future-predictor"),
}));
vi.mock("@/components/AiMealGenerator", () => ({
  default: makeStub("ai-meal-generator"),
}));
vi.mock("@/components/ParentCommandCenter", () => ({
  default: makeStub("parent-command-center"),
}));
vi.mock("@/components/PhonicsTestCard", () => ({
  PhonicsTestCard: makeStub("phonics-test-card"),
}));
vi.mock("@/components/SmartMathTricks", () => ({
  SmartMathTricks: makeStub("smart-math-tricks"),
}));
vi.mock("@/components/ColoringBooks", () => ({
  ColoringBooks: makeStub("coloring-books"),
}));
vi.mock("@/components/FunSheets", () => ({
  FunSheets: makeStub("fun-sheets"),
}));
vi.mock("@/components/HubDebugOverlay", () => ({
  HubDebugOverlay: makeStub("hub-debug-overlay"),
}));
vi.mock("@/components/SkillsFocus", () => ({
  SkillsFocus: makeStub("skills-focus"),
}));
vi.mock("@/components/DailyStory", () => ({
  DailyStory: makeStub("daily-story"),
}));
vi.mock("@/components/ParentTasks", () => ({
  ParentTasks: makeStub("parent-tasks"),
}));
vi.mock("@/components/DailyPuzzle", () => ({
  DailyPuzzle: makeStub("daily-puzzle"),
}));
vi.mock("@/components/AbacusZone", () => ({
  AbacusZone: makeStub("abacus-zone"),
}));
vi.mock("@/components/HubTile", () => ({
  HubTile: ({ children }: { children?: React.ReactNode }) =>
    React.createElement("div", { "data-stub": "hub-tile" }, children),
}));
vi.mock("@/components/RoutineCarousel", () => ({
  default: makeStub("routine-carousel"),
}));
vi.mock("@/components/LockedBlock", () => ({
  default: ({ children }: { children?: React.ReactNode }) =>
    React.createElement("div", { "data-stub": "locked-block" }, children),
}));
vi.mock("@/components/TryFreeBadge", () => ({
  default: makeStub("try-free-badge"),
}));
vi.mock("@/components/ProfileLockScreen", () => ({
  ProfileLockScreen: makeStub("profile-lock-screen"),
}));

// expo-linear-gradient and @expo/vector-icons are already aliased in
// vitest.config.ts to local DOM stubs, but expo-haptics / expo-blur etc.
// can leak in through transitive imports. Stub them defensively.
vi.mock("expo-linear-gradient", () => ({
  LinearGradient: ({ children }: { children?: React.ReactNode }) =>
    React.createElement("div", {}, children),
}));

// ─── Imports under test (after the mocks) ───────────────────────────────────

import HubScreen from "@/app/(tabs)/hub";

// ─── Helpers ────────────────────────────────────────────────────────────────

const CHILD_A = { id: 101, name: "Aarav", age: 5, ageMonths: 0 };
const CHILD_B = { id: 202, name: "Bina", age: 7, ageMonths: 0 };

function makeChildrenResponse(children: typeof CHILD_A[]) {
  return {
    ok: true,
    status: 200,
    json: vi.fn().mockResolvedValue(children),
  } as unknown as Response;
}

function renderHub() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <HubScreen />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  mockAuthFetch.mockReset();
  mockGetItem.mockReset();
  mockSetItem.mockReset();
  mockRemoveItem.mockReset();
  mockGetItem.mockResolvedValue(null);
  mockSetItem.mockResolvedValue(undefined);
  mockRemoveItem.mockResolvedValue(undefined);
  __flatListTestState.reset();
});

afterEach(() => {
  cleanup();
});

// The window-width default (375) drives `pageWidth` in the hub. We assert
// scrollToOffset offsets against this so a future change to the mock
// surface stays caught.
const PAGE_WIDTH = 375;

describe("Parent Hub pager", () => {
  it("scrolls the FlatList and updates activeSection when a tab pill is tapped", async () => {
    mockAuthFetch.mockImplementation(async (url: string) => {
      if (url === "/api/children") return makeChildrenResponse([CHILD_A]);
      return { ok: true, status: 200, json: async () => [] } as Response;
    });

    const user = userEvent.setup();
    renderHub();

    // Wait for children → tabs to render.
    await waitFor(() => {
      expect(screen.getByTestId("hub-tab-today")).toBeInTheDocument();
      expect(screen.getByTestId("hub-tab-zones")).toBeInTheDocument();
      expect(screen.getByTestId("hub-tab-modules")).toBeInTheDocument();
      expect(screen.getByTestId("hub-tab-activities")).toBeInTheDocument();
    });

    // The hub mounts on `today`; the AsyncStorage hydration effect fires
    // a one-time `scrollToOffset(0)` even when the stored key is null
    // (it short-circuits before scrolling). Reset so the assertion below
    // only sees the offsets caused by our tab presses.
    __flatListTestState.scrollToOffsetCalls = [];

    // today → zones (index 1).
    await user.click(screen.getByTestId("hub-tab-zones"));
    expect(__flatListTestState.scrollToOffsetCalls.at(-1)).toEqual({
      offset: 1 * PAGE_WIDTH,
      animated: true,
    });
    await waitFor(() =>
      expect(screen.getByTestId("hub-tab-zones")).toHaveAttribute(
        "aria-selected",
        "true",
      ),
    );

    // zones → modules (index 2).
    await user.click(screen.getByTestId("hub-tab-modules"));
    expect(__flatListTestState.scrollToOffsetCalls.at(-1)).toEqual({
      offset: 2 * PAGE_WIDTH,
      animated: true,
    });
    await waitFor(() =>
      expect(screen.getByTestId("hub-tab-modules")).toHaveAttribute(
        "aria-selected",
        "true",
      ),
    );

    // modules → activities (index 3).
    await user.click(screen.getByTestId("hub-tab-activities"));
    expect(__flatListTestState.scrollToOffsetCalls.at(-1)).toEqual({
      offset: 3 * PAGE_WIDTH,
      animated: true,
    });
    await waitFor(() =>
      expect(screen.getByTestId("hub-tab-activities")).toHaveAttribute(
        "aria-selected",
        "true",
      ),
    );

    // activities → today (index 0) — also locks in the wrap-around path.
    await user.click(screen.getByTestId("hub-tab-today"));
    expect(__flatListTestState.scrollToOffsetCalls.at(-1)).toEqual({
      offset: 0,
      animated: true,
    });
    await waitFor(() =>
      expect(screen.getByTestId("hub-tab-today")).toHaveAttribute(
        "aria-selected",
        "true",
      ),
    );
  });

  it("updates the active tab when an onMomentumScrollEnd event fires at each offset", async () => {
    mockAuthFetch.mockImplementation(async (url: string) => {
      if (url === "/api/children") return makeChildrenResponse([CHILD_A]);
      return { ok: true, status: 200, json: async () => [] } as Response;
    });

    renderHub();

    await waitFor(() => {
      expect(screen.getByTestId("hub-tab-today")).toBeInTheDocument();
    });

    // Simulate a swipe by invoking the momentum-end handler the hub wired
    // up. SECTION_KEYS = [today, zones, modules, activities] — assert each
    // offset rotates the active tab to the matching key.
    for (let i = 0; i < SECTION_KEYS.length; i++) {
      const handler = __flatListTestState.lastMomentumHandler;
      expect(handler).toBeTypeOf("function");
      act(() => {
        handler!({
          nativeEvent: {
            contentOffset: { x: i * PAGE_WIDTH, y: 0 },
            // The other NativeScrollEvent fields are unused by the hub's
            // pager handler, so a minimal stub is sufficient here.
          },
        });
      });
      await waitFor(() =>
        expect(screen.getByTestId(`hub-tab-${SECTION_KEYS[i]}`)).toHaveAttribute(
          "aria-selected",
          "true",
        ),
      );
    }
  });

  it("reads + restores hub.lastSection.v1.<childId> from AsyncStorage when the active child changes", async () => {
    mockAuthFetch.mockImplementation(async (url: string) => {
      if (url === "/api/children") {
        return makeChildrenResponse([CHILD_A, CHILD_B]);
      }
      return { ok: true, status: 200, json: async () => [] } as Response;
    });

    // Child A starts on `modules`, child B starts on `activities`. The
    // per-child key namespace is what the test is locking in — switching
    // children must read the *child-specific* key, not a global one.
    mockGetItem.mockImplementation(async (key: string) => {
      if (key === `hub.lastSection.v1.${CHILD_A.id}`) return "modules";
      if (key === `hub.lastSection.v1.${CHILD_B.id}`) return "activities";
      return null;
    });

    const user = userEvent.setup();
    renderHub();

    // Initial mount → child A is the default selection. The hub should
    // read child A's key and end up on the `modules` tab.
    await waitFor(() => {
      expect(mockGetItem).toHaveBeenCalledWith(
        `hub.lastSection.v1.${CHILD_A.id}`,
      );
    });
    await waitFor(() =>
      expect(screen.getByTestId("hub-tab-modules")).toHaveAttribute(
        "aria-selected",
        "true",
      ),
    );

    // The restore path also drives the FlatList to the matching offset
    // (index 2 for "modules"). The scrollToOffset is fired from inside a
    // requestAnimationFrame callback so we wait for it explicitly.
    await waitFor(() =>
      expect(
        __flatListTestState.scrollToOffsetCalls.some(
          (call: { offset: number; animated?: boolean }) =>
            call.offset === 2 * PAGE_WIDTH && call.animated === false,
        ),
      ).toBe(true),
    );

    // Switch to child B by tapping their selector chip. The chip uses
    // `accessibilityLabel`-less Pressable, so click via the rendered name.
    // The child selector chips are the only buttons in the header that
    // contain the child's name as text.
    await user.click(screen.getByText(CHILD_B.name));

    // Switching the active child must read the child-B-specific key.
    await waitFor(() => {
      expect(mockGetItem).toHaveBeenCalledWith(
        `hub.lastSection.v1.${CHILD_B.id}`,
      );
    });

    // …and restore the active tab to `activities` per child B's stored key.
    await waitFor(() =>
      expect(screen.getByTestId("hub-tab-activities")).toHaveAttribute(
        "aria-selected",
        "true",
      ),
    );
  });
});
