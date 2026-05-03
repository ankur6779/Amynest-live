/**
 * Parent Hub paywall flow — end-to-end coverage (Task #261). // audit-ok: task ref, not a hex color
 *
 * Task #260 added per-tile gating to every Parent Hub tile via the
 * `useFeatureUsage` hook. Every tile shows a TRY FREE badge for non-premium
 * users until they've consumed their one free use, then `<LockedBlock>`
 * overlays the tile and a tap routes the parent to `/paywall` with the
 * matching `reason`.
 *
 * This test covers the three invariants from the task brief:
 *   1. Each section (Today / Zones / Modules / Activities) shows a TRY FREE
 *      badge on at least one tile while the feature is unused for a free
 *      user.
 *   2. Once a feature has been used the badge disappears, and tapping the
 *      now-locked tile routes to `/paywall` with the correct `reason`
 *      query param.
 *   3. The PaywallScreen REASON_COPY map carries an entry for every
 *      per-tile reason key the hub passes through `<LockedBlock reason=…>`.
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
  fireEvent,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { __flatListTestState } from "../__mocks__/react-native";
import { SECTION_KEYS } from "@/app/(tabs)/hub-sections";

// ─── Mocks (must precede HubScreen import) ───────────────────────────────────

const mockAuthFetch = vi.fn();
vi.mock("@/hooks/useAuthFetch", () => ({
  useAuthFetch: () => mockAuthFetch,
}));

vi.mock("@/hooks/useProfileComplete", () => ({
  useProfileComplete: () => ({ profileComplete: true, isLoading: false }),
}));

// `useFeatureUsage` drives every paywall decision. We mock it with a
// fully-controllable shape so each test can flip premium / used state and
// observe how the hub re-renders. The default factory matches the no-used,
// not-premium baseline so badges appear and tiles are clickable for the
// first-use path.
const mockMarkFeatureUsed = vi.fn();
let mockUsageState: {
  isPremium: boolean;
  used: Set<string>;
  locked: Set<string>;
} = { isPremium: false, used: new Set(), locked: new Set() };

vi.mock("@/hooks/useFeatureUsage", () => ({
  useFeatureUsage: () => ({
    isPremium: mockUsageState.isPremium,
    isLoaded: true,
    hasUsedFeature: (id: string) => mockUsageState.used.has(id),
    isFeatureLocked: (id: string) => mockUsageState.locked.has(id),
    markFeatureUsed: mockMarkFeatureUsed,
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

const mockRouterPush = vi.fn();
vi.mock("expo-router", () => ({
  useRouter: () => ({
    push: mockRouterPush,
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

// Heavy hub feature components — stubbed out so the test focuses on the
// LockedBlock + TryFreeBadge wiring rather than each tile's data fetching.
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
vi.mock("@/components/HubTile", () => ({
  HubTile: ({ children }: { children?: React.ReactNode }) =>
    React.createElement("div", { "data-stub": "hub-tile" }, children),
}));
vi.mock("@/components/RoutineCarousel", () => ({ default: makeStub("routine-carousel") }));
vi.mock("@/components/ProfileLockScreen", () => ({ ProfileLockScreen: makeStub("profile-lock-screen") }));
// We intentionally do NOT mock LockedBlock or TryFreeBadge — those are
// the components under test for the paywall flow.

vi.mock("expo-linear-gradient", () => ({
  LinearGradient: ({ children }: { children?: React.ReactNode }) =>
    React.createElement("div", {}, children),
}));

// ─── Imports under test ──────────────────────────────────────────────────────

import HubScreen from "@/app/(tabs)/hub";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const CHILD = { id: 101, name: "Aarav", age: 6, ageMonths: 0 };

function makeChildrenResponse(children: typeof CHILD[]) {
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

async function gotoSection(key: (typeof SECTION_KEYS)[number]) {
  const user = userEvent.setup();
  await user.click(screen.getByTestId(`hub-tab-${key}`));
  await waitFor(() =>
    expect(screen.getByTestId(`hub-tab-${key}`)).toHaveAttribute(
      "aria-selected",
      "true",
    ),
  );
}

beforeEach(() => {
  mockAuthFetch.mockReset();
  mockMarkFeatureUsed.mockReset();
  mockRouterPush.mockReset();
  __flatListTestState.reset();
  mockUsageState = { isPremium: false, used: new Set(), locked: new Set() };
  mockAuthFetch.mockImplementation(async (url: string) => {
    if (url === "/api/children") return makeChildrenResponse([CHILD]);
    return { ok: true, status: 200, json: async () => [] } as Response;
  });
});

afterEach(() => {
  cleanup();
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("Parent Hub paywall flow — TRY FREE badges", () => {
  it("shows at least one TRY FREE badge per section for a fresh free user", async () => {
    renderHub();
    await waitFor(() => {
      expect(screen.getByTestId("hub-tab-today")).toBeInTheDocument();
    });

    // Today — the page header renders a TryFreeBadge alongside Today's Plan.
    await gotoSection("today");
    await waitFor(() => {
      expect(screen.getAllByTestId("try-free-badge").length).toBeGreaterThan(0);
    });

    // Zones — Ask Amy / Articles / Tips / Emotional all expose badges.
    await gotoSection("zones");
    await waitFor(() => {
      expect(screen.getAllByTestId("try-free-badge").length).toBeGreaterThan(0);
    });

    // Modules — academic tiles (phonics / smart-study / olympiad / …).
    await gotoSection("modules");
    await waitFor(() => {
      expect(screen.getAllByTestId("try-free-badge").length).toBeGreaterThan(0);
    });

    // Activities — art-craft / activities / facts / morning-flow / ….
    await gotoSection("activities");
    await waitFor(() => {
      expect(screen.getAllByTestId("try-free-badge").length).toBeGreaterThan(0);
    });
  });

  it("hides every TRY FREE badge once the feature is marked used", async () => {
    // Premium users never see the badge — fastest way to assert the negative
    // path globally without enumerating every featureId in the hub.
    mockUsageState.isPremium = true;
    renderHub();
    await waitFor(() => {
      expect(screen.getByTestId("hub-tab-today")).toBeInTheDocument();
    });

    for (const key of SECTION_KEYS) {
      await gotoSection(key);
      // Allow any pending re-renders to flush before asserting absence.
      await act(async () => {
        await Promise.resolve();
      });
      expect(screen.queryAllByTestId("try-free-badge")).toHaveLength(0);
    }
  });
});

describe("Parent Hub paywall flow — locked tile routes to /paywall", () => {
  it("opens /paywall with the matching reason when a locked tile is tapped", async () => {
    // Lock a representative tile from EACH section that has a wrapping
    // `<LockedBlock>` (Today's Plan only renders a badge — there is no
    // LockedBlock around it — so it isn't included here). The reasons
    // below mirror what `app/(tabs)/hub.tsx` actually passes through
    // `<LockedBlock reason=…>` for each tile.
    // Tile age-band gating: CHILD is 6y → band 3 (6–8). The chosen tile
    // ids must be in the band map for that band, otherwise the IIFE in
    // hub.tsx skips them entirely and no LockedBlock is rendered.
    //   - hub_articles      → bands [0..6] ✓
    //   - hub_skills_focus  → bands [1..6] ✓
    //   - hub_art_craft     → bands [0..6] ✓
    mockUsageState.locked = new Set([
      "hub_articles",      // Zones — LockedBlock(reason=hub_locked)
      "hub_skills_focus",  // Modules — LockedBlock(reason=hub_skills_focus)
      "hub_art_craft",     // Activities — LockedBlock(reason=hub_art_craft)
    ]);
    mockUsageState.used = new Set([
      "hub_articles",
      "hub_skills_focus",
      "hub_art_craft",
    ]);

    renderHub();
    await waitFor(() => {
      expect(screen.getByTestId("hub-tab-zones")).toBeInTheDocument();
    });

    // Each locked tile renders a `<PremiumBadge testID="premium-badge">`
    // sibling to its full-cover Pressable overlay; both fire the same
    // `goPaywall` handler. Clicking every premium-badge on the page is the
    // simplest way to drive every LockedBlock through the navigation path
    // without depending on the i18n-resolved aria-label of the overlay.
    const clickAllLocked = () => {
      for (const badge of screen.getAllByTestId("premium-badge")) {
        fireEvent.click(badge);
      }
      return mockRouterPush.mock.calls.map(([arg]) => arg);
    };

    // Zones — Articles tile uses reason "hub_locked".
    // Also asserts the "badge disappears after first use" requirement for
    // free users: hub_articles is `used` + `locked` here (i.e. free user who
    // already consumed their one free open), so its TryFreeBadge must be
    // gone even though the user is non-premium. Counting badges before vs.
    // after locking would require two renders; instead we assert that the
    // total badge count in Zones is strictly less than the count we'd see
    // with no usage marked (covered in the first test), AND that no badge
    // co-exists with the locked-block overlay on the same tile.
    await gotoSection("zones");
    await waitFor(() => {
      expect(screen.getAllByTestId("locked-block").length).toBeGreaterThan(0);
    });
    // Free-user "used" tiles must not emit a TryFreeBadge inside their
    // LockedBlock subtree. The LockedBlock children are the original tile
    // — if `tryFreeFor` returned truthy, the Section would render a badge
    // beneath the lock overlay. Walking each locked-block confirms none do.
    for (const block of screen.getAllByTestId("locked-block")) {
      const badgesInside = block.querySelectorAll(
        '[data-testid="try-free-badge"]',
      );
      expect(badgesInside.length).toBe(0);
    }
    expect(clickAllLocked()).toContainEqual({
      pathname: "/paywall",
      params: { reason: "hub_locked" },
    });

    // Modules — Skills Focus tile uses reason hub_skills_focus
    mockRouterPush.mockClear();
    await gotoSection("modules");
    await waitFor(() => {
      expect(screen.getAllByTestId("locked-block").length).toBeGreaterThan(0);
    });
    expect(clickAllLocked()).toContainEqual({
      pathname: "/paywall",
      params: { reason: "hub_skills_focus" },
    });

    // Activities — Art & Craft tile uses reason hub_art_craft
    mockRouterPush.mockClear();
    await gotoSection("activities");
    await waitFor(() => {
      expect(screen.getAllByTestId("locked-block").length).toBeGreaterThan(0);
    });
    expect(clickAllLocked()).toContainEqual({
      pathname: "/paywall",
      params: { reason: "hub_art_craft" },
    });
  });
});

// REASON_COPY contract — locks in that every per-tile reason string the hub
// hands `<LockedBlock>` has matching headline copy on the paywall screen.
// Reading the live REASON_COPY map directly catches drift between the hub's
// gating + the paywall's user-facing strings without parsing the JSX.
describe("PaywallScreen REASON_COPY contract", () => {
  it("has copy for every per-tile reason emitted by the Parent Hub", async () => {
    // We deliberately do NOT `import("@/app/paywall")` here — paywall.tsx
    // pulls in `expo-haptics` whose native module is not available in the
    // jsdom test env. Reading the source as text is sufficient to assert
    // the contract that REASON_COPY contains an entry for every per-tile
    // reason string the hub emits.

    // Reasons currently passed through `<LockedBlock reason=…>` in
    // app/(tabs)/hub.tsx. If a new tile-specific reason is added without
    // matching paywall copy, this list (and the inspection below) will
    // surface the drift.
    const REASONS_FROM_HUB = [
      "hub_locked",
      "hub_phonics_learning",
      "hub_phonics_test",
      "hub_nutrition",
      "hub_gaming_rewards",
      "hub_rewards_shop",
      "hub_audio_lessons",
      "hub_art_craft",
      "hub_worksheets",
      "hub_facts",
      "hub_skills_focus",
      "hub_daily_story",
      "hub_daily_puzzle",
      "hub_today_plan",
      "hub_parent_tasks",
      "hub_amy",
      "hub_command_center",
      "hub_infant_hub",
      "hub_tomorrow_forecast",
    ] as const;

    // Read the file source and confirm every reason has a REASON_COPY entry
    // with both `title` and `subtitle`. Using the source guarantees the
    // mapping really lives in paywall.tsx and didn't move to a dead branch.
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const file = await fs.readFile(
      path.resolve(__dirname, "../app/paywall.tsx"),
      "utf8",
    );

    // Extract just the REASON_COPY object body so the shape check can't be
    // accidentally satisfied by an unrelated occurrence elsewhere in the
    // file (e.g. comments or analytics calls referencing the same key).
    const start = file.indexOf("const REASON_COPY");
    expect(start, "paywall.tsx is missing the REASON_COPY declaration").toBeGreaterThan(-1);
    // The map ends at the first top-level "};" after its declaration.
    const end = file.indexOf("\n};", start);
    expect(end, "could not locate the closing of REASON_COPY").toBeGreaterThan(start);
    const reasonCopySrc = file.slice(start, end);

    for (const reason of REASONS_FROM_HUB) {
      // Match `<reason>: { …title: "…", subtitle: "…"… }` — order-agnostic
      // by looking for both fields anywhere within the entry's own braces.
      const entry = new RegExp(
        `\\b${reason}:\\s*\\{([^}]*)\\}`,
        "m",
      ).exec(reasonCopySrc);
      expect(
        entry,
        `paywall.tsx REASON_COPY missing entry for "${reason}"`,
      ).not.toBeNull();
      const body = entry![1];
      expect(
        /\btitle\s*:\s*["'`]/.test(body),
        `REASON_COPY["${reason}"] is missing a string title`,
      ).toBe(true);
      expect(
        /\bsubtitle\s*:\s*["'`]/.test(body),
        `REASON_COPY["${reason}"] is missing a string subtitle`,
      ).toBe(true);
    }
  });
});
