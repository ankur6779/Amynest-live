/**
 * Mobile ParentCommandCenter — interaction-contract tests.
 *
 * Mirrors the web `parent-command-center.test.tsx` so the two artifacts
 * stay in lock-step:
 *   - Compact tile is the only thing visible at rest; tapping it opens
 *     the fullscreen dashboard modal.
 *   - Dashboard renders the Today timeline (current/next markers) and
 *     the strategic action grid WITHOUT "add-activity" (that flow lives
 *     in the dedicated quick-activity-strip).
 *   - The 4 quick activity tiles (10-min play, 5-min phonics / lullaby /
 *     puzzle) are rendered.
 *   - Strategic actions wire through to `onUpdateItems` and
 *     `onLogBehavior` (i.e. the underlying `useUpdateRoutineItems` /
 *     `useCreateBehaviorLog` hooks):
 *        · Simplify Today → flips low-priority pending steps to skipped.
 *        · Fix Routine → flips delayed steps back to pending.
 *        · Calm Child → logs a "Used calming tools" neutral behavior.
 *   - Empty state hides timeline + quick-strip + strategic grid.
 *
 * The component pulls data through @tanstack/react-query + the mobile
 * `useAuthFetch` hook. We mock both so the test focuses on the JSX and
 * action wiring, not on the network layer.
 */
import React from "react";
import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from "vitest";
import { render, screen, within, fireEvent, cleanup, waitFor, act } from "@testing-library/react";

// ── Mocks (must be hoisted before the component import) ─────────────────

const authFetchMock = vi.fn();
vi.mock("@/hooks/useAuthFetch", () => ({
  useAuthFetch: () => authFetchMock,
}));

// audit-block-ignore-start (mock color fixtures for useColors in tests)
vi.mock("@/hooks/useColors", () => ({
  useColors: () => ({
    background: "#0f0c29",
    foreground: "#ffffff",
    primary: "#7B3FF2",
    surface: "#1a1633",
    surfaceElevated: "#221c40",
    textMuted: "#9aa0c2",
    textDim: "#6b7099",
    glassBorder: "rgba(255,255,255,0.12)",
    radius: 12,
  }),
}));
// audit-block-ignore-end

vi.mock("expo-router", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
}));

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn().mockResolvedValue(null),
    setItem: vi.fn().mockResolvedValue(undefined),
    removeItem: vi.fn().mockResolvedValue(undefined),
  },
}));

const updateItemsMutateAsync = vi.fn().mockResolvedValue({});
const createBehaviorMutateAsync = vi.fn().mockResolvedValue({});

vi.mock("@tanstack/react-query", async () => {
  // Minimal in-test shim. The component reads data through useQuery and
  // writes through useMutation; we route reads through React state so
  // each test sees its own freshly-mocked authFetch response (no stale
  // cache between tests) and writes to the matching spy.
  const React = await import("react");
  return {
    useQueryClient: () => ({ invalidateQueries: vi.fn() }),
    useQuery: ({ queryFn, enabled = true }: any) => {
      const [data, setData] = React.useState<unknown>(undefined);
      React.useEffect(() => {
        if (!enabled || !queryFn) return;
        let cancelled = false;
        Promise.resolve()
          .then(() => queryFn())
          .then((v) => { if (!cancelled) setData(v); })
          .catch(() => {});
        return () => { cancelled = true; };
        // We intentionally fire once per mount — the component's keys
        // don't change inside a test so this matches react-query's
        // observed behaviour for our purposes.
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
      return { data, isLoading: data === undefined, error: null };
    },
    useMutation: ({ mutationFn }: any) => {
      // Pick the right spy based on the keys present on the variables.
      const mutateAsync = async (vars: any) => {
        if (vars && "behavior" in vars) {
          await createBehaviorMutateAsync(vars);
        } else {
          await updateItemsMutateAsync(vars);
        }
        return mutationFn ? await mutationFn(vars) : undefined;
      };
      return { mutateAsync, isPending: false };
    },
    QueryClient: class {},
    QueryClientProvider: ({ children }: any) => children,
  };
});

// ── Component under test (after the mocks) ───────────────────────────────

import ParentCommandCenter from "@/components/ParentCommandCenter";
import type { AdaptiveItem } from "@workspace/family-routine";

// 7-step routine, mirrors the web test exactly so coverage stays in
// parity. 3 completed → 43 % progress; 2 delayed for "fix-routine"; 2
// low-priority pending (screen + play) for "simplify-today" to flip.
function makeItems(): AdaptiveItem[] {
  return [
    { time: "07:00 AM", activity: "Wake", duration: 15, category: "wake", status: "completed" },
    { time: "07:30 AM", activity: "Breakfast", duration: 30, category: "meal", status: "completed" },
    { time: "09:00 AM", activity: "Morning Play", duration: 30, category: "play", status: "completed" },
    { time: "11:00 AM", activity: "Reading", duration: 20, category: "learning", status: "delayed" },
    { time: "11:30 AM", activity: "Snack", duration: 15, category: "meal", status: "delayed" },
    { time: "02:00 PM", activity: "Screen Time", duration: 30, category: "screen", status: "pending" },
    { time: "04:00 PM", activity: "Free Play", duration: 30, category: "play", status: "pending" },
  ];
}

const today = new Date("2026-05-02T08:00:00").toISOString().slice(0, 10);

function fakeOk(json: unknown) {
  return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(json) } as Response);
}

function setupRoutine(items: AdaptiveItem[]): void {
  authFetchMock.mockReset();
  authFetchMock.mockImplementation((url: string) => {
    if (url.startsWith("/api/routines")) {
      return fakeOk([{ id: 42, date: today, items }]);
    }
    if (url.startsWith("/api/dashboard/summary")) {
      return fakeOk({ positiveBehaviorsToday: 2, negativeBehaviorsToday: 1, routinesGeneratedThisWeek: 3 });
    }
    return fakeOk({});
  });
}

beforeAll(() => {
  // Freeze "now" so the timeline current/next markers are deterministic
  // regardless of when CI runs. Leave timers alone so async resolution
  // and the component's toast still behave normally.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-05-02T08:00:00"));
});
afterAll(() => {
  vi.useRealTimers();
});

beforeEach(() => {
  cleanup();
  updateItemsMutateAsync.mockClear();
  createBehaviorMutateAsync.mockClear();
  setupRoutine(makeItems());
});

// ── Tile (collapsed) ────────────────────────────────────────────────────

describe("Mobile ParentCommandCenter — compact tile", () => {
  it("renders the compact tile with the child's name and an Open affordance", async () => {
    render(<ParentCommandCenter child={{ id: 1, name: "Aarav" }} />);
    const tile = await screen.findByTestId("command-center-tile");
    expect(within(tile).getByText(/Aarav's Command Center/i)).toBeInTheDocument();
    expect(within(tile).getByText("Open")).toBeInTheDocument();
    expect(screen.queryByTestId("command-center-dashboard")).toBeNull();
  });
});

// ── Dashboard (fullscreen) ──────────────────────────────────────────────

describe("Mobile ParentCommandCenter — fullscreen dashboard", () => {
  async function openDashboard(): Promise<HTMLElement> {
    render(<ParentCommandCenter child={{ id: 1, name: "Aarav" }} />);
    // Wait for the routine fetch to land before pressing Open.
    await screen.findByTestId("command-center-tile");
    // The component reads the query result on the next render — flush
    // microtasks so the routine list has populated before we tap.
    await act(async () => { await Promise.resolve(); });
    fireEvent.click(screen.getByTestId("command-center-tile"));
    return await screen.findByTestId("command-center-dashboard");
  }

  it("opens the fullscreen dashboard when the tile is tapped", async () => {
    const dash = await openDashboard();
    expect(dash).toBeInTheDocument();
    expect(within(dash).getAllByText(/Aarav's Command Center/i).length).toBeGreaterThan(0);
  });

  it("renders the today timeline with current + next markers", async () => {
    await openDashboard();
    expect(screen.getByTestId("timeline-section")).toBeInTheDocument();
    expect(screen.getByTestId("timeline-current")).toBeInTheDocument();
    expect(screen.getByTestId("timeline-next")).toBeInTheDocument();
  });

  it("renders the 4-button strategic action grid (no add-activity)", async () => {
    await openDashboard();
    expect(screen.getByTestId("action-simplify-today")).toBeInTheDocument();
    expect(screen.getByTestId("action-fix-routine")).toBeInTheDocument();
    expect(screen.getByTestId("action-calm-child")).toBeInTheDocument();
    expect(screen.getByTestId("action-improve-sleep")).toBeInTheDocument();
    // add-activity is intentionally surfaced via the quick-activity strip.
    expect(screen.queryByTestId("action-add-activity")).toBeNull();
  });

  it("renders the quick-activity strip with all four timed activities", async () => {
    await openDashboard();
    expect(screen.getByTestId("quick-activity-strip")).toBeInTheDocument();
    expect(screen.getByTestId("quick-play")).toBeInTheDocument();
    expect(screen.getByTestId("quick-phonics")).toBeInTheDocument();
    expect(screen.getByTestId("quick-lullaby")).toBeInTheDocument();
    expect(screen.getByTestId("quick-puzzle")).toBeInTheDocument();
  });

  it("Simplify Today flips low-priority pending steps to skipped", async () => {
    await openDashboard();
    fireEvent.click(screen.getByTestId("action-simplify-today"));
    await waitFor(() => expect(updateItemsMutateAsync).toHaveBeenCalledTimes(1));
    const items = updateItemsMutateAsync.mock.calls[0][0].items as AdaptiveItem[];
    const skipped = items.filter((it) => it.status === "skipped").map((it) => it.activity).sort();
    expect(skipped).toEqual(["Free Play", "Screen Time"]);
  });

  it("Fix Routine flips delayed steps back to pending", async () => {
    await openDashboard();
    fireEvent.click(screen.getByTestId("action-fix-routine"));
    await waitFor(() => expect(updateItemsMutateAsync).toHaveBeenCalledTimes(1));
    const items = updateItemsMutateAsync.mock.calls[0][0].items as AdaptiveItem[];
    const reading = items.find((it) => it.activity === "Reading");
    expect(reading?.status).toBe("pending");
  });

  it("Calm Child opens the calming panel and logs a behavior", async () => {
    await openDashboard();
    fireEvent.click(screen.getByTestId("action-calm-child"));
    await waitFor(() => expect(createBehaviorMutateAsync).toHaveBeenCalledTimes(1));
    expect(createBehaviorMutateAsync.mock.calls[0][0].behavior).toBe("Used calming tools");
  });

  it("Tapping a quick activity opens an inline timed panel with the mm:ss clock", async () => {
    await openDashboard();
    fireEvent.click(screen.getByTestId("quick-phonics"));
    expect(screen.getByTestId("timed-activity-phonics")).toBeInTheDocument();
    expect(screen.getByTestId("timed-clock-phonics")).toHaveTextContent("05:00");
  });

  it("Empty state hides timeline + quick-strip + strategic grid", async () => {
    setupRoutine([]);
    render(<ParentCommandCenter child={{ id: 1, name: "Aarav" }} />);
    await screen.findByTestId("command-center-tile");
    await act(async () => { await Promise.resolve(); });
    fireEvent.click(screen.getByTestId("command-center-tile"));
    await screen.findByTestId("command-center-empty");
    expect(screen.queryByTestId("timeline-section")).toBeNull();
    expect(screen.queryByTestId("quick-activity-strip")).toBeNull();
    expect(screen.queryByTestId("action-simplify-today")).toBeNull();
  });
});
