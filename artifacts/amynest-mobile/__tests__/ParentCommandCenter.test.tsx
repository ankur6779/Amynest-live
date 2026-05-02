/**
 * ParentCommandCenter — JSX snapshot tests for the mobile dashboard.
 *
 * The interaction-contract suite (`parent-command-center.test.tsx`) covers
 * behaviour: tile → modal handoff, action wiring, empty state, etc. It
 * does NOT lock the actual JSX tree, so a stray label change or a layout
 * reorder inside the progress ring / hero / timeline / quick-activity
 * strip / strategic action grid would slip past CI.
 *
 * This file mirrors `parent-hub-tile-snapshots.test.tsx` for the Command
 * Center: the tree is rendered with deterministic mocks (auth-fetch,
 * useColors, AsyncStorage, expo-router, react-query) and stored as a
 * vitest snapshot. Two flavours are captured:
 *   1. The compact tile, as it lives inside the Hub (modal closed).
 *   2. The fullscreen dashboard with a populated routine (modal open).
 *
 * If you intentionally restyle the dashboard chrome, run
 * `pnpm --filter @workspace/amynest-mobile test -u` to refresh the
 * snapshot; otherwise these tests catch accidental drift on the
 * progress ring, today timeline, quick-connection ideas and 5-action
 * strategic grid that would otherwise only be caught by manual QA on
 * the device.
 */
import React from "react";
import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from "vitest";
import { render, screen, fireEvent, cleanup, act } from "@testing-library/react";

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

vi.mock("@tanstack/react-query", async () => {
  // Same shim as the interaction-contract test: route reads through React
  // state so each render fetches its mocked authFetch response, and route
  // writes through a no-op mutation so snapshots don't depend on a
  // QueryClient.
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
      return { data, isLoading: data === undefined, error: null };
    },
    useMutation: () => ({
      mutateAsync: vi.fn().mockResolvedValue({}),
      isPending: false,
    }),
    QueryClient: class {},
    QueryClientProvider: ({ children }: any) => children,
  };
});

// ── Component under test (after the mocks) ──────────────────────────────

import ParentCommandCenter from "@/components/ParentCommandCenter";
import type { AdaptiveItem } from "@workspace/family-routine";

// 7-step routine — same shape as `parent-command-center.test.tsx` so
// the snapshot reflects the production state space (completed, delayed,
// pending across multiple categories).
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

const FROZEN_NOW = new Date("2026-05-02T08:00:00");
const today = FROZEN_NOW.toISOString().slice(0, 10);

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
  // Freeze "now" so the timeline current/next markers, the 1-min "while
  // open" tick and the engine's stress/effort summaries produce the same
  // tree on every CI run.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(FROZEN_NOW);
});

afterAll(() => {
  vi.useRealTimers();
});

beforeEach(() => {
  cleanup();
  setupRoutine(makeItems());
});

describe("ParentCommandCenter — JSX snapshots", () => {
  it("compact tile (closed) renders a stable tree", async () => {
    const { container } = render(<ParentCommandCenter child={{ id: 1, name: "Aarav" }} />);
    // Wait for the routine + summary fetches to land before snapping so
    // the tile shows the populated "X/Y done" meta line instead of 0/0.
    await screen.findByTestId("command-center-tile");
    await act(async () => { await Promise.resolve(); });
    expect(container.firstChild).toMatchSnapshot();
  });

  it("fullscreen dashboard (open) renders a stable tree", async () => {
    const { container } = render(<ParentCommandCenter child={{ id: 1, name: "Aarav" }} />);
    await screen.findByTestId("command-center-tile");
    await act(async () => { await Promise.resolve(); });
    fireEvent.click(screen.getByTestId("command-center-tile"));
    await screen.findByTestId("command-center-dashboard");
    expect(container).toMatchSnapshot();
  });
});
