/**
 * Amy AI tutor screen — snapshot tests
 *
 * Locks the rendered tree for the new structured tutor contract:
 *   - a "teach" reply (content + example chips, no MCQ block)
 *   - a "quiz"  reply (question + options + answer index)
 *
 * Both also exercise the mode/subject pill strip and the topic input,
 * so accidental relabelling, layout, or missing-i18n-key drift is caught
 * by `pnpm --filter @workspace/amynest-mobile test`.
 */
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";

const mockAuthFetch = vi.fn();

vi.mock("@/hooks/useAuthFetch", () => ({
  useAuthFetch: () => mockAuthFetch,
}));

vi.mock("expo-router", () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), replace: vi.fn() }),
  useLocalSearchParams: () => ({}),
}));

vi.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k, i18n: { language: "en" } }),
}));

vi.mock("@/contexts/ThemeContext", () => ({
  useTheme: () => ({ theme: { gradient: ["#0b0b1a", "#1a1633"] } }), // audit-ok: test fixture
  ThemeProvider: ({ children }: any) => children,
}));

vi.mock("@/components/AiQuotaBanner", () => ({
  default: () => null,
}));

vi.mock("@/store/useSubscriptionStore", () => ({
  useSubscriptionStore: Object.assign(
    () => ({ refresh: vi.fn() }),
    {
      getState: () => ({ refresh: vi.fn().mockResolvedValue(undefined) }),
    },
  ),
}));

const mockUseQuery = vi.fn();
vi.mock("@tanstack/react-query", () => ({
  useQuery: (opts: any) => mockUseQuery(opts),
}));

import AmyAIScreen from "@/app/amy-ai";

function makeJsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response;
}

describe("Amy AI tutor screen", () => {
  beforeEach(() => {
    mockAuthFetch.mockReset();
    mockUseQuery.mockReturnValue({
      data: [{ id: 1, name: "Aarav", age: 6 }],
    });
  });

  it("renders mode strip + subject chips + empty state", () => {
    const { container } = render(<AmyAIScreen />);
    expect(screen.getByText("ai.mode_teach")).toBeInTheDocument();
    expect(screen.getByText("ai.mode_practice")).toBeInTheDocument();
    expect(screen.getByText("ai.mode_quiz")).toBeInTheDocument();
    expect(screen.getByText("ai.mode_doubt")).toBeInTheDocument();
    expect(screen.getByText("ai.subject_math")).toBeInTheDocument();
    expect(screen.getByText("ai.tutor_empty_heading")).toBeInTheDocument();
    expect(container.firstChild).toMatchSnapshot();
  });

  async function sendMessage(container: HTMLElement, text: string) {
    const input = container.querySelector(
      'input[placeholder="ai.tutor_input_placeholder"]',
    ) as HTMLInputElement;
    expect(input).toBeTruthy();
    fireEvent.change(input, { target: { value: text } });
    const sendBtns = container.querySelectorAll("button");
    await act(async () => {
      fireEvent.click(sendBtns[sendBtns.length - 1]);
    });
  }

  it("renders a structured TEACH reply with example chips", async () => {
    mockAuthFetch.mockResolvedValueOnce(
      makeJsonResponse({
        reply: {
          type: "teach",
          content: "The letter B says 'buh'. Press your lips together!",
          examples: ["Ball", "Banana", "Bus"],
          question: null,
          options: [],
          answer: null,
        },
      }),
    );

    const { container } = render(<AmyAIScreen />);
    await sendMessage(container, "Teach me the letter B");

    await waitFor(() => {
      expect(screen.getByText(/letter B says/i)).toBeInTheDocument();
    });
    expect(screen.getByText("Ball")).toBeInTheDocument();
    expect(screen.getByText("Banana")).toBeInTheDocument();
    expect(screen.getByText("Bus")).toBeInTheDocument();
    expect(container.firstChild).toMatchSnapshot();
  });

  it("renders a QUIZ reply with options and grades the chosen answer", async () => {
    mockAuthFetch.mockResolvedValueOnce(
      makeJsonResponse({
        reply: {
          type: "quiz",
          content: "Quick one!",
          examples: [],
          question: "What is 2 + 3?",
          options: ["4", "5", "6", "7"],
          answer: 1,
        },
      }),
    );

    const { container } = render(<AmyAIScreen />);
    await sendMessage(container, "Quiz me on addition");

    await waitFor(() => {
      expect(screen.getByText("What is 2 + 3?")).toBeInTheDocument();
    });
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(container.firstChild).toMatchSnapshot("before-pick");

    const correct = screen.getByText("5").closest("button")!;
    await act(async () => {
      fireEvent.click(correct);
    });
    await waitFor(() => {
      expect(screen.getByText(/ai\.tutor_right_on/)).toBeInTheDocument();
    });
  });

  it("shows the fallback bubble when the model returns an unparseable shape", async () => {
    mockAuthFetch.mockResolvedValueOnce(makeJsonResponse({ reply: { type: "teach" } }));

    const { container } = render(<AmyAIScreen />);
    await sendMessage(container, "anything");

    await waitFor(() => {
      expect(screen.getByText("ai.tutor_lost_reply")).toBeInTheDocument();
    });
  });
});
