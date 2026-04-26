/**
 * DashboardScreen – today's activities + age badge
 *
 * Locks in the contract that DashboardScreen maps `/api/routines` items
 * (including `ageBand` and `status`) onto RoutineCarousel's RoutineTask
 * shape. A future rename of the API field or a regression in the icon /
 * status mapping would silently drop the age badge or the "Undo" state on
 * the home screen — this test fails loudly if that happens.
 *
 * External screen dependencies (auth, profile completion, colors, i18n,
 * safe area, haptics) are mocked at the module level. The real
 * RoutineCarousel renders through so we assert on the actual UI it shows.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// ─── Module mocks ─────────────────────────────────────────────────────────────

const mockAuthFetch = vi.fn();

vi.mock("@/hooks/useAuthFetch", () => ({
  useAuthFetch: () => mockAuthFetch,
}));

vi.mock("@/hooks/useProfileComplete", () => ({
  useProfileComplete: () => ({ profileComplete: true, isLoading: false }),
}));

vi.mock("@/hooks/useColors", () => ({
  useColors: () => ({
    background: "#ffffff",
    foreground: "#000000",
    mutedForeground: "#666666",
    primary: "#7C3AED",
    surface: "#ffffff",
    textStrong: "#111111",
    textSubtle: "#666666",
    border: "#eeeeee",
    radius: 12,
  }),
}));

vi.mock("@/lib/firebase-auth", () => ({
  useUser: () => ({ user: { firstName: "Aarav" } }),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) =>
      opts && typeof opts.name === "string" ? `${key}:${opts.name}` : key,
  }),
}));

vi.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

vi.mock("expo-haptics", () => ({
  impactAsync: vi.fn(),
  ImpactFeedbackStyle: { Light: "light", Medium: "medium", Heavy: "heavy" },
}));

vi.mock("expo-router", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useLocalSearchParams: () => ({}),
  Link: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Imported AFTER mocks are declared so the screen picks them up.
import DashboardScreen from "@/app/(tabs)/index";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function makeRoutinesResponse(routines: unknown[]): Response {
  return {
    ok: true,
    json: () => Promise.resolve(routines),
  } as unknown as Response;
}

function renderWithClient() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <DashboardScreen />
    </QueryClientProvider>,
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("DashboardScreen – today's activities + age badge", () => {
  beforeEach(() => {
    mockAuthFetch.mockReset();
  });

  it("renders today's activity from /api/routines with the 'Ages 6–10' badge and the Undo state when status is completed", async () => {
    const today = formatYMD(new Date());
    mockAuthFetch.mockResolvedValue(
      makeRoutinesResponse([
        {
          id: 42,
          childId: 1,
          childName: "Aarav",
          date: today,
          title: "Today's Plan",
          items: [
            {
              time: "10:00 AM",
              activity: "Reading time",
              duration: 20,
              category: "study",
              status: "completed",
              ageBand: "6-10",
            },
          ],
        },
      ]),
    );

    renderWithClient();

    // Activity from the mocked /api/routines item is rendered by RoutineCarousel.
    expect(await screen.findByText("Reading time")).toBeInTheDocument();

    // ageBand "6-10" → "Ages 6–10" badge (en-dash) is present.
    expect(screen.getByText("Ages 6–10")).toBeInTheDocument();

    // status === "completed" flips the action button to the "Undo" state.
    expect(screen.getByText("Undo")).toBeInTheDocument();
    expect(screen.queryByText("Done")).not.toBeInTheDocument();

    // category "study" → "book" icon (locks in the icon-map contract so
    // a renamed category in the API doesn't silently fall back to default).
    const renderedIconNames = Array.from(
      document.querySelectorAll("[data-icon]"),
    ).map((el) => el.getAttribute("data-icon"));
    expect(renderedIconNames).toContain("book");
    expect(renderedIconNames).not.toContain("ellipse-outline");

    // Sanity: the screen actually called the routines endpoint.
    expect(mockAuthFetch).toHaveBeenCalledWith("/api/routines");
  });

  it("renders the 'Pending' / 'Done' state when status is not completed", async () => {
    const today = formatYMD(new Date());
    mockAuthFetch.mockResolvedValue(
      makeRoutinesResponse([
        {
          id: 43,
          childId: 1,
          childName: "Aarav",
          date: today,
          title: "Today's Plan",
          items: [
            {
              time: "07:00 AM",
              activity: "Morning stretch",
              duration: 10,
              category: "morning",
              status: "pending",
              ageBand: "6-10",
            },
          ],
        },
      ]),
    );

    renderWithClient();

    expect(await screen.findByText("Morning stretch")).toBeInTheDocument();
    expect(screen.getByText("Ages 6–10")).toBeInTheDocument();
    expect(screen.getByText("Done")).toBeInTheDocument();
    expect(screen.queryByText("Undo")).not.toBeInTheDocument();
  });
});
