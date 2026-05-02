/**
 * Parent Hub tile snapshot tests
 *
 * `hub-bands.test.ts` already locks the 23-tile inventory and per-band
 * parity, but it doesn't catch JSX-level regressions inside the new tiles
 * added in #176 (smart-math-tricks, coloring-books, fun-sheets). A change
 * to a label, a button, an icon name or a layout block on those tiles
 * would slip past the inventory test.
 *
 * This file renders each tile in isolation against deterministic, mocked
 * inputs (auth fetch, audio, async-storage, theme) and locks the resulting
 * DOM tree behind a vitest snapshot. If you intentionally change one of
 * these tiles, run `pnpm --filter amynest-mobile test -u` to refresh the
 * stored snapshot — otherwise these tests catch accidental copy/styling
 * drift on the production hub.
 *
 * React Native components are replaced with DOM equivalents via the
 * vitest aliases in `vitest.config.ts`, so snapshots assert against
 * stable DOM markup instead of a native bridge tree.
 */
import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from "vitest";
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";

// Freeze "today" so the date-seeded SmartMathTricks daily shuffle
// (and any other Date.now()-driven branches in the tiles) produces
// the exact same DOM tree on every CI run. Without this, the
// SmartMathTricks "Today" tab would reshuffle on each calendar day
// and the stored snapshot would drift.
const FROZEN_NOW = new Date("2025-06-15T12:00:00.000Z");

// ─── Module mocks (must be declared before the components are imported) ──────

const mockAuthFetch = vi.fn();

vi.mock("@/hooks/useAuthFetch", () => ({
  useAuthFetch: () => mockAuthFetch,
}));

vi.mock("@/hooks/useAmyVoice", () => ({
  useAmyVoice: () => ({
    speak: vi.fn(),
    stop: vi.fn(),
    speaking: false,
    loading: false,
    error: null,
    currentTime: 0,
    duration: 0,
    seekTo: vi.fn(),
  }),
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

vi.mock("@/contexts/ThemeContext", () => ({
  useTheme: () => ({ mode: "dark" }),
}));

vi.mock("expo-web-browser", () => ({
  openBrowserAsync: vi.fn().mockResolvedValue(undefined),
  WebBrowserPresentationStyle: { OVER_FULL_SCREEN: "overFullScreen" },
}));

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn().mockResolvedValue(null),
    setItem: vi.fn().mockResolvedValue(undefined),
    removeItem: vi.fn().mockResolvedValue(undefined),
  },
}));

// ─── Imports under test (after the mocks) ────────────────────────────────────

import { SmartMathTricks } from "@/components/SmartMathTricks";
import { ColoringBooks } from "@/components/ColoringBooks";
import { FunSheets } from "@/components/FunSheets";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeListResponse<T>(files: T[]) {
  return {
    ok: true,
    status: 200,
    json: vi.fn().mockResolvedValue({
      ok: true,
      files,
      pagination: {
        page: 0,
        pageSize: files.length,
        total: files.length,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      },
      dailyQuota: { limit: 5, used: 1, remaining: 4 },
    }),
  } as unknown as Response;
}

const COLORING_FILES = [
  {
    id: "cb-1",
    name: "Jungle Animals",
    thumbnailUrl: "https://example.com/cb1.jpg",
    previewUrl: "https://example.com/cb1.pdf",
  },
  {
    id: "cb-2",
    name: "Ocean Adventure",
    thumbnailUrl: "https://example.com/cb2.jpg",
    previewUrl: "https://example.com/cb2.pdf",
  },
];

const FUNSHEET_FILES = [
  {
    id: "fs-1",
    name: "Counting Practice",
    thumbnailUrl: "https://example.com/fs1.jpg",
    previewUrl: "https://example.com/fs1.pdf",
    downloaded: false,
  },
  {
    id: "fs-2",
    name: "Letter Tracing",
    thumbnailUrl: "https://example.com/fs2.jpg",
    previewUrl: "https://example.com/fs2.pdf",
    downloaded: true,
  },
];

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("Parent Hub tile snapshots", () => {
  beforeAll(() => {
    vi.useFakeTimers({
      // Don't fake `setTimeout`/`setInterval` — testing-library's
      // `waitFor` relies on real timers to schedule retries.
      toFake: ["Date"],
      now: FROZEN_NOW,
    });
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  beforeEach(() => {
    mockAuthFetch.mockReset();
  });

  it("SmartMathTricks renders a stable tree for a 5-year-old (4-6 trick set)", async () => {
    const { container } = render(
      <SmartMathTricks childName="Aarav" childAgeYears={5} />,
    );
    // Wait for AsyncStorage hydration to flip ActivityIndicator → tab strip.
    await waitFor(() =>
      expect(screen.getByText(/Today/i)).toBeInTheDocument(),
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it("SmartMathTricks renders a stable tree for an 8-year-old (6-8 trick set)", async () => {
    const { container } = render(
      <SmartMathTricks childName="Aarav" childAgeYears={8} />,
    );
    await waitFor(() =>
      expect(screen.getByText(/Today/i)).toBeInTheDocument(),
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it("ColoringBooks renders a stable tree once the file list resolves", async () => {
    mockAuthFetch.mockResolvedValue(makeListResponse(COLORING_FILES));

    const { container } = render(
      <ColoringBooks childId={42} childName="Aarav" />,
    );
    await waitFor(() =>
      expect(screen.getByText("Jungle Animals")).toBeInTheDocument(),
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it("ColoringBooks renders a stable empty-state tree when total === 0", async () => {
    mockAuthFetch.mockResolvedValue(makeListResponse([]));

    const { container } = render(
      <ColoringBooks childId={42} childName="Aarav" />,
    );
    await waitFor(() =>
      expect(screen.getByText("All caught up!")).toBeInTheDocument(),
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it("FunSheets renders a stable tree once the file list resolves", async () => {
    mockAuthFetch.mockResolvedValue(makeListResponse(FUNSHEET_FILES));

    const { container } = render(
      <FunSheets childId={42} childName="Aarav" />,
    );
    await waitFor(() =>
      expect(screen.getByText("Counting Practice")).toBeInTheDocument(),
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it("FunSheets renders a stable empty-state tree when total === 0", async () => {
    mockAuthFetch.mockResolvedValue(makeListResponse([]));

    const { container } = render(
      <FunSheets childId={42} childName="Aarav" />,
    );
    await waitFor(() =>
      expect(screen.getByText("All caught up!")).toBeInTheDocument(),
    );
    expect(container.firstChild).toMatchSnapshot();
  });
});
