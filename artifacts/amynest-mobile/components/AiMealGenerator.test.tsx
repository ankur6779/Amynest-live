/**
 * AiMealGenerator component tests
 *
 * Covers: free-text input rendering, loading skeleton appearing during
 * generation, recipe cards rendering on success, and error + retry
 * state appearing on a 503-like failure.
 *
 * `useAuthFetch` is mocked at the module level so tests control fetch
 * behaviour without a real network or auth session.
 * Native modules (expo-speech, async-storage) are stubbed via vi.mock.
 *
 * React Native components are replaced with DOM equivalents via vitest
 * aliases so assertions run in jsdom without a native bridge.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AiMealGenerator from "./AiMealGenerator";

// ─── Module mocks ─────────────────────────────────────────────────────────────

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
  }),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeMeal(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "meal-1",
    title: "Paneer Paratha",
    emoji: "🫓",
    bgGradient: ["#7C3AED", "#4F46E5"] as [string, string],
    region: "pan_indian",
    category: "tiffin",
    ingredients: ["1 cup flour", "100g paneer"],
    steps: ["Mix and roll.", "Cook on tawa."],
    calories: 320,
    tags: ["veg", "high-protein"],
    prepMinutes: 15,
    isVeg: true,
    matchedIngredients: ["flour"],
    missingIngredients: [],
    ...overrides,
  };
}

function makeSuccessResponse(meals = [makeMeal()]) {
  return {
    ok: true,
    json: vi.fn().mockResolvedValue({
      meals,
      amyMessage: "Here are some great options for you!",
    }),
  } as unknown as Response;
}

function makeErrorResponse(status = 503, errorText = "Service Unavailable") {
  return {
    ok: false,
    status,
    json: vi.fn().mockResolvedValue({ error: errorText }),
  } as unknown as Response;
}

function clickGenerate() {
  fireEvent.click(screen.getByTestId("ai-meal-generate-btn"));
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("AiMealGenerator – input rendering", () => {
  beforeEach(() => {
    mockAuthFetch.mockReset();
  });

  it("renders the free-text input field", () => {
    render(<AiMealGenerator />);
    const input = screen.getByPlaceholderText(
      "e.g. quick protein tiffin without onion",
    );
    expect(input).toBeInTheDocument();
  });

  it("renders the Generate with Amy AI button", () => {
    render(<AiMealGenerator />);
    expect(screen.getByTestId("ai-meal-generate-btn")).toBeInTheDocument();
  });

  it("renders suggestion chips before any generation", () => {
    render(<AiMealGenerator />);
    expect(screen.getByText("Quick tiffin with rice")).toBeInTheDocument();
    expect(screen.getByText("High protein breakfast")).toBeInTheDocument();
  });

  it("reflects typed text in the input", () => {
    render(<AiMealGenerator />);
    const input = screen.getByPlaceholderText(
      "e.g. quick protein tiffin without onion",
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "dal makhani for toddler" } });
    expect(input.value).toBe("dal makhani for toddler");
  });
});

describe("AiMealGenerator – loading skeleton", () => {
  beforeEach(() => {
    mockAuthFetch.mockReset();
  });

  it("shows the skeleton while authFetch is in flight", async () => {
    let resolve!: (r: Response) => void;
    mockAuthFetch.mockReturnValue(
      new Promise<Response>((res) => {
        resolve = res;
      }),
    );

    render(<AiMealGenerator />);
    clickGenerate();

    expect(screen.getByTestId("ai-meal-skeleton")).toBeInTheDocument();

    resolve(makeSuccessResponse());
    await waitFor(() =>
      expect(screen.queryByTestId("ai-meal-skeleton")).not.toBeInTheDocument(),
    );
  });

  it("skeleton disappears after successful response", async () => {
    mockAuthFetch.mockResolvedValue(makeSuccessResponse());

    render(<AiMealGenerator />);
    clickGenerate();

    await waitFor(() =>
      expect(screen.queryByTestId("ai-meal-skeleton")).not.toBeInTheDocument(),
    );
  });

  it("skeleton disappears after an error response", async () => {
    mockAuthFetch.mockResolvedValue(makeErrorResponse());

    render(<AiMealGenerator />);
    clickGenerate();

    await waitFor(() =>
      expect(screen.queryByTestId("ai-meal-skeleton")).not.toBeInTheDocument(),
    );
  });
});

describe("AiMealGenerator – success: recipe cards", () => {
  beforeEach(() => {
    mockAuthFetch.mockReset();
  });

  it("renders a recipe card for each returned meal", async () => {
    const meals = [
      makeMeal({ id: "m1", title: "Paneer Paratha" }),
      makeMeal({ id: "m2", title: "Vegetable Poha" }),
    ];
    mockAuthFetch.mockResolvedValue(makeSuccessResponse(meals));

    render(<AiMealGenerator />);
    clickGenerate();

    await waitFor(() =>
      expect(screen.getByText("Paneer Paratha")).toBeInTheDocument(),
    );
    expect(screen.getByText("Vegetable Poha")).toBeInTheDocument();
  });

  it("shows Amy's message alongside the cards", async () => {
    mockAuthFetch.mockResolvedValue(makeSuccessResponse());

    render(<AiMealGenerator />);
    clickGenerate();

    await waitFor(() =>
      expect(
        screen.getByText("Here are some great options for you!"),
      ).toBeInTheDocument(),
    );
  });

  it("displays the meal emoji on each card", async () => {
    mockAuthFetch.mockResolvedValue(
      makeSuccessResponse([makeMeal({ emoji: "🍛" })]),
    );

    render(<AiMealGenerator />);
    clickGenerate();

    await waitFor(() =>
      expect(screen.getByText("🍛")).toBeInTheDocument(),
    );
  });

  it("shows the prep-time on each card", async () => {
    mockAuthFetch.mockResolvedValue(
      makeSuccessResponse([makeMeal({ prepMinutes: 20 })]),
    );

    render(<AiMealGenerator />);
    clickGenerate();

    await waitFor(() =>
      expect(screen.getByText("20m")).toBeInTheDocument(),
    );
  });

  it("renders an empty-state message when the API returns an empty meals array", async () => {
    mockAuthFetch.mockResolvedValue(makeSuccessResponse([]));

    render(<AiMealGenerator />);
    clickGenerate();

    await waitFor(() =>
      expect(
        screen.getByText(
          "No recipes generated. Try a different description.",
        ),
      ).toBeInTheDocument(),
    );
  });
});

describe("AiMealGenerator – error and retry (503)", () => {
  beforeEach(() => {
    mockAuthFetch.mockReset();
  });

  it("shows an error message on a 503 response", async () => {
    mockAuthFetch.mockResolvedValue(
      makeErrorResponse(503, "Service Unavailable"),
    );

    render(<AiMealGenerator />);
    clickGenerate();

    await waitFor(() =>
      expect(screen.getByText("Service Unavailable")).toBeInTheDocument(),
    );
  });

  it("shows a Retry button on failure", async () => {
    mockAuthFetch.mockResolvedValue(makeErrorResponse());

    render(<AiMealGenerator />);
    clickGenerate();

    await waitFor(() =>
      expect(screen.getByText("Retry")).toBeInTheDocument(),
    );
  });

  it("does not show recipe cards when in error state", async () => {
    mockAuthFetch.mockResolvedValue(makeErrorResponse());

    render(<AiMealGenerator />);
    clickGenerate();

    await waitFor(() => expect(screen.getByText("Retry")).toBeInTheDocument());
    expect(screen.queryByText("Paneer Paratha")).not.toBeInTheDocument();
  });

  it("clears the error and shows cards after a successful retry", async () => {
    mockAuthFetch
      .mockResolvedValueOnce(makeErrorResponse())
      .mockResolvedValueOnce(
        makeSuccessResponse([makeMeal({ title: "Aloo Sabji" })]),
      );

    render(<AiMealGenerator />);
    clickGenerate();

    await waitFor(() => expect(screen.getByText("Retry")).toBeInTheDocument());

    fireEvent.click(screen.getByText("Retry"));

    await waitFor(() =>
      expect(screen.getByText("Aloo Sabji")).toBeInTheDocument(),
    );
    expect(screen.queryByText("Retry")).not.toBeInTheDocument();
  });

  it("shows a fallback message when the error body cannot be parsed", async () => {
    mockAuthFetch.mockResolvedValue({
      ok: false,
      status: 503,
      json: vi.fn().mockRejectedValue(new Error("no body")),
    } as unknown as Response);

    render(<AiMealGenerator />);
    clickGenerate();

    await waitFor(() =>
      expect(screen.getByText(/Server error 503/)).toBeInTheDocument(),
    );
  });
});
