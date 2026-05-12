/**
 * Single-scroll hub smoke test.
 *
 * `hub-pager.test.tsx` was deleted during the Phase 5 pager removal because
 * it tested FlatList / tab-switching invariants that no longer apply.
 * This file replaces it with a focused smoke test that verifies the new
 * single-scroll hub surface renders its three structural layers correctly for
 * a known child profile (6-year-old, band 3 / "6-8"):
 *
 *   1. The "Today's Plan" section is NOT rendered (removed from mobile hub).
 *   2. The two mandatory featured tiles are present:
 *        hub-tile-command-center, hub-tile-tomorrow-forecast
 *   3. At least one band tile is present for the child's current age band.
 *   4. Accordion sections start collapsed (aria-expanded="false").
 *   5. No `hub-tab-*` testIDs exist anywhere (confirms pager removal).
 *
 * Mock setup mirrors parent-hub-paywall.test.tsx so the two files stay in
 * sync when new tiles or dependencies are added to hub.tsx.
 */
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// ─── Module mocks (must precede hub.tsx import) ───────────────────────────────

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
    isLoaded: true,
    hasUsedFeature: () => true,
    isFeatureLocked: () => false,
    markFeatureUsed: vi.fn(),
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

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn().mockResolvedValue(null),
    setItem: vi.fn().mockResolvedValue(undefined),
    removeItem: vi.fn().mockResolvedValue(undefined),
  },
}));

// Stub heavy feature components — the smoke test focuses on structural
// render invariants, not per-tile data fetching.
function makeStub(label: string) {
  return ({ children }: { children?: React.ReactNode }) =>
    React.createElement("div", { "data-stub": label }, children ?? null);
}
vi.mock("@/components/LifeSkillsZone", () => ({ LifeSkillsZone: makeStub("life-skills-zone") }));
vi.mock("@/components/InfantHub", () => ({ default: makeStub("infant-hub") }));
vi.mock("@/components/ParentingArticles", () => ({ ParentingArticles: makeStub("parenting-articles") }));
vi.mock("@/components/ArtCraftReels", () => ({ ArtCraftReels: makeStub("art-craft-reels") }));
vi.mock("@/components/PrintableWorksheets", () => ({ PrintableWorksheets: makeStub("printable-worksheets") }));
vi.mock("@/components/AmazingFacts", () => ({ AmazingFacts: makeStub("amazing-facts") }));
vi.mock("@/components/FuturePredictor", () => ({ default: makeStub("future-predictor") }));
vi.mock("@/components/AiMealGenerator", () => ({ default: makeStub("ai-meal-generator") }));
vi.mock("@/components/ParentCommandCenter", () => ({ default: makeStub("parent-command-center") }));
vi.mock("@/components/PhonicsTestCard", () => ({ PhonicsTestCard: makeStub("phonics-test-card") }));
vi.mock("@/components/PhonicsLearningCard", () => ({ PhonicsLearningCard: makeStub("phonics-learning-card") }));
vi.mock("@/components/SmartMathTricks", () => ({ SmartMathTricks: makeStub("smart-math-tricks") }));
vi.mock("@/components/ColoringBooks", () => ({ ColoringBooks: makeStub("coloring-books") }));
vi.mock("@/components/FunSheets", () => ({ FunSheets: makeStub("fun-sheets") }));
vi.mock("@/components/HubDebugOverlay", () => ({ HubDebugOverlay: makeStub("hub-debug-overlay") }));
vi.mock("@/components/SkillsFocus", () => ({ SkillsFocus: makeStub("skills-focus") }));
vi.mock("@/components/DailyStory", () => ({ DailyStory: makeStub("daily-story") }));
vi.mock("@/components/ParentTasks", () => ({ ParentTasks: makeStub("parent-tasks") }));
vi.mock("@/components/DailyPuzzle", () => ({ DailyPuzzle: makeStub("daily-puzzle") }));
vi.mock("@/components/AbacusZone", () => ({ AbacusZone: makeStub("abacus-zone") }));
vi.mock("@/components/DailyTips", () => ({ DailyTips: makeStub("daily-tips") }));
vi.mock("@/components/RoutineCarousel", () => ({ default: makeStub("routine-carousel") }));
vi.mock("@/components/ProfileLockScreen", () => ({ ProfileLockScreen: makeStub("profile-lock-screen") }));
vi.mock("@/components/LockedBlock", () => ({
  default: ({ children }: { children?: React.ReactNode }) =>
    React.createElement("div", { "data-stub": "locked-block" }, children ?? null),
}));
vi.mock("@/components/TryFreeBadge", () => ({
  default: () => React.createElement("div", { "data-stub": "try-free-badge" }, null),
}));

// HubTile: forward testID so structural assertions can query by testID.
// The paywall test omits testID forwarding because it cares about children
// only; here testID is exactly what we are verifying.
vi.mock("@/components/HubTile", () => ({
  HubTile: ({
    children,
    testID,
  }: {
    children?: React.ReactNode;
    testID?: string;
    featured?: boolean;
    highlighted?: boolean;
  }) =>
    React.createElement(
      "div",
      { "data-testid": testID, "data-stub": "hub-tile" },
      children ?? null,
    ),
}));

// ─── Component under test ─────────────────────────────────────────────────────

import HubScreen from "@/app/(tabs)/hub";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

// 6-year-old → 72 total months → band index 3 ("6-8").
// Band 3 includes: amy, articles, tips, emotional, activities, art-craft,
// nutrition, meal-suggestions, story-hub, smart-math-tricks, abacus,
// ptm-prep, smart-study, event-prep, olympiad, life-skills, coloring-books,
// fun-sheets, morning-flow, kids-control-center, meals, worksheets, facts,
// skills-focus, daily-story, daily-puzzle.
const CHILD = { id: 42, name: "Aarav", age: 6, ageMonths: 0 };

function makeChildrenResponse() {
  return {
    ok: true,
    status: 200,
    json: vi.fn().mockResolvedValue([CHILD]),
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

// ─── Setup / teardown ─────────────────────────────────────────────────────────

beforeEach(() => {
  mockAuthFetch.mockReset();
  mockAuthFetch.mockImplementation(async (url: string) => {
    if (url === "/api/children") return makeChildrenResponse();
    return { ok: true, status: 200, json: async () => [] } as Response;
  });
});

afterEach(() => {
  cleanup();
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Section group headers are always rendered (even when collapsed).
 *  Returns all buttons that carry an aria-expanded attribute. */
function getSectionHeaders() {
  return screen
    .getAllByRole("button")
    .filter((btn) => btn.getAttribute("aria-expanded") !== null);
}

/** Wait until the children API has settled and section headers are visible. */
async function waitForHubReady() {
  await waitFor(
    () => {
      expect(getSectionHeaders().length).toBeGreaterThan(0);
    },
    { timeout: 5000 },
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Single-scroll hub smoke test (6-year-old, band 6-8)", () => {
  it("does NOT render a Today's Plan section (removed from mobile hub)", async () => {
    renderHub();
    // Section group header buttons are always visible — use them as the
    // ready-sentinel instead of tile content (tiles are inside collapsed sections).
    await waitForHubReady();
    expect(screen.queryByText("Today's Plan")).not.toBeInTheDocument();
  });

  it("renders accordion sections collapsed by default (aria-expanded=false)", async () => {
    renderHub();
    // Section headers render immediately; use them as the ready-sentinel.
    await waitForHubReady();
    // All 5 group-section headers start collapsed — no section is open by default.
    const allAriaExpandedBtns = getSectionHeaders();
    expect(allAriaExpandedBtns.length).toBeGreaterThan(0);
    const expandedBtns = allAriaExpandedBtns.filter(
      (btn) => btn.getAttribute("aria-expanded") === "true",
    );
    // All sections start collapsed — none should be expanded.
    expect(expandedBtns).toHaveLength(0);
    allAriaExpandedBtns.forEach((btn) => {
      expect(btn).toHaveAttribute("aria-expanded", "false");
    });
  });

  it("renders the command-center featured tile", async () => {
    renderHub();
    await waitForHubReady();
    // Tiles live inside collapsed sections — expand "today" (index 0) first.
    fireEvent.click(getSectionHeaders()[0]);
    await waitFor(() => {
      expect(
        screen.getByTestId("hub-tile-command-center"),
      ).toBeInTheDocument();
    });
  });

  it("renders the tomorrow-forecast featured tile", async () => {
    renderHub();
    await waitForHubReady();
    // Expand "today" section to make its tiles visible.
    fireEvent.click(getSectionHeaders()[0]);
    await waitFor(() => {
      expect(
        screen.getByTestId("hub-tile-tomorrow-forecast"),
      ).toBeInTheDocument();
    });
  });

  it("renders at least one band tile for the child's current age band (6-8)", async () => {
    renderHub();
    await waitForHubReady();
    const headers = getSectionHeaders();
    // Expand "today" (index 0) to see `amy`; expand "learning" (index 1) for
    // `smart-math-tricks` which is restricted to bands [2, 3].
    fireEvent.click(headers[0]);
    fireEvent.click(headers[1]);
    await waitFor(() => {
      expect(screen.getByTestId("hub-tile-amy")).toBeInTheDocument();
    });
    // `smart-math-tricks` is restricted to bands [2, 3] so its presence
    // additionally confirms the 6-8 band content renders specifically.
    expect(screen.getByTestId("hub-tile-smart-math-tricks")).toBeInTheDocument();
  });

  it("contains no hub-tab-* testIDs (confirms pager has been removed)", async () => {
    renderHub();
    await waitForHubReady();
    // Expand "today" so tiles are mounted, then check no hub-tab-* ids exist.
    fireEvent.click(getSectionHeaders()[0]);
    await waitFor(() => {
      expect(screen.getByTestId("hub-tile-command-center")).toBeInTheDocument();
    });
    // The old pager emitted testIDs like hub-tab-today, hub-tab-zones, etc.
    // None of those should exist in the single-scroll surface.
    const allElements = document.querySelectorAll("[data-testid]");
    const tabTestIds = Array.from(allElements)
      .map((el) => el.getAttribute("data-testid") ?? "")
      .filter((id) => id.startsWith("hub-tab-"));
    expect(tabTestIds).toHaveLength(0);
  });
});
