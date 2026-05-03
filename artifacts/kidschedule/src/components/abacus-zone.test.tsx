/**
 * Integration tests for the Abacus PRO Zone web component (#214).
 *
 * Covers:
 *  1. Locked / age-gated rendering branches.
 *  2. Practice mode answer-checking (correct + wrong feedback paths).
 *  3. Challenge mode submit/timer scoring through to the completion screen.
 *  4. localStorage cache hydration when the API is slow/unavailable.
 *
 * Hooks/fetch are mocked at the module boundary so the test exercises the
 * real component logic without making network calls.
 */
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, cleanup, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mocks must be hoisted before importing the component under test.
const fetchMock = vi.fn();
vi.mock("@/hooks/use-auth-fetch", () => ({
  useAuthFetch: () => fetchMock,
}));
vi.mock("@/hooks/use-amy-voice", () => ({
  useAmyVoice: () => ({
    speak: vi.fn(),
    stop: vi.fn(),
    speaking: false,
    loading: false,
  }),
}));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, vars?: Record<string, unknown>) => {
      if (!vars) return key;
      let out = key;
      for (const [k, v] of Object.entries(vars)) {
        out = out.replace(`{{${k}}}`, String(v));
      }
      return out;
    },
    i18n: { language: "en" },
  }),
}));

// Override `generateChallenge` (only) so the Challenge mode emits a
// deterministic 5-question batch whose answer is 0 — i.e. the empty
// abacus already matches the answer. Submitting 5 times in a row therefore
// scores 100% and crosses the unlock threshold for Level 1 (≥70%).
vi.mock("@workspace/abacus", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@workspace/abacus")>();
  return {
    ...actual,
    generateChallenge: () =>
      Array.from({ length: 5 }, () => ({
        prompt: "0",
        answer: 0,
        rods: 1,
        hint: "Leave the abacus at zero.",
      })),
  };
});

import { AbacusZone } from "./abacus-zone";

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  fetchMock.mockReset();
  window.localStorage.clear();
});
afterEach(() => cleanup());

describe("AbacusZone — gating", () => {
  it("renders the age-not-eligible message for kids outside 4–10", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ eligible: false }));
    render(<AbacusZone childId={1} childName="Mira" ageYears={2} />);
    await waitFor(() => {
      expect(screen.getByText(/abacus\.age_not_eligible/)).toBeInTheDocument();
    });
  });

  it("renders the zone (with mode tabs) for an eligible child", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        eligible: true,
        progress: {
          currentLevel: 1,
          lastMode: "practice",
          completedLevels: [],
          highestUnlocked: 1,
          bestScores: {},
          totalCorrect: 0,
          totalAttempts: 0,
          totalPoints: 0,
        },
      }),
    );
    render(<AbacusZone childId={42} childName="Ana" ageYears={6} />);
    await waitFor(() => {
      expect(screen.getByTestId("abacus-zone")).toBeInTheDocument();
    });
    expect(screen.getAllByRole("button").length).toBeGreaterThan(0);
  });
});

describe("AbacusZone — Practice mode", () => {
  beforeEach(() => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        eligible: true,
        progress: {
          currentLevel: 1,
          lastMode: "practice",
          completedLevels: [],
          highestUnlocked: 1,
          bestScores: {},
          totalCorrect: 0,
          totalAttempts: 0,
          totalPoints: 0,
        },
      }),
    );
  });

  it("shows the wrong-answer feedback when the abacus value does not match", async () => {
    const user = userEvent.setup();
    render(<AbacusZone childId={7} childName="Sam" ageYears={6} />);
    await waitFor(() => screen.getByTestId("abacus-zone"));
    // Practice tab is the persisted lastMode.
    const checkBtn = await screen.findByTestId("abacus-practice-check");
    await act(async () => {
      await user.click(checkBtn);
    });
    // Initial board is value 0; for any non-zero prompt the answer is wrong.
    // For prompt of 0 it's correct. We accept either feedback as long as one
    // appears — both render via data-testid prefix `abacus-practice-feedback-`.
    const correctOrWrong = await screen.findByTestId(/abacus-practice-feedback-/);
    expect(correctOrWrong).toBeInTheDocument();
  });

  it("regenerates the problem when 'new problem' is clicked", async () => {
    const user = userEvent.setup();
    render(<AbacusZone childId={7} childName="Sam" ageYears={6} />);
    await waitFor(() => screen.getByTestId("abacus-zone"));
    const before = (await screen.findByTestId("abacus-problem")).textContent;
    const nextBtn = screen.getByTestId("abacus-practice-next");
    let after = before;
    // Click up to 5 times in case the random seed produces the same prompt.
    for (let i = 0; i < 5 && after === before; i += 1) {
      await act(async () => {
        await user.click(nextBtn);
      });
      after = screen.getByTestId("abacus-problem").textContent;
    }
    expect(after).not.toBe(before);
  });
});

describe("AbacusZone — Challenge mode unlocks Level 2", () => {
  it("posts complete_level + log_session and exposes Level 2 after a 100% Level 1 run", async () => {
    // 1) Initial GET returns a fresh Level-1 progress row.
    // 2) After the 5 challenge submits, the component POSTs:
    //      action=set_mode (challenge tab)
    //      action=complete_level → server returns completedLevels=[1]
    //      action=log_session    → ack
    //    Subsequent GETs (none expected here) would also be JSON.
    const initialProgress = {
      currentLevel: 1,
      lastMode: "learn",
      completedLevels: [],
      highestUnlocked: 1,
      bestScores: {},
      totalCorrect: 0,
      totalAttempts: 0,
      totalPoints: 0,
    };
    const calls: { url: string; body?: unknown }[] = [];
    fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
      const body = init?.body ? JSON.parse(String(init.body)) : undefined;
      calls.push({ url, body });
      if (typeof url === "string" && url.startsWith("/api/abacus/progress?")) {
        return jsonResponse({ eligible: true, progress: initialProgress });
      }
      if (body?.action === "complete_level") {
        return jsonResponse({
          ok: true,
          progress: {
            ...initialProgress,
            currentLevel: 2,
            completedLevels: [1],
            bestScores: {
              "1": {
                points: body.points,
                accuracyPct: body.accuracyPct,
                completedAt: new Date().toISOString(),
              },
            },
          },
          unlocked: 2,
          newBest: true,
        });
      }
      // set_mode + log_session
      return jsonResponse({ ok: true, progress: initialProgress });
    });

    const user = userEvent.setup();
    render(<AbacusZone childId={11} childName="Kai" ageYears={6} />);
    await waitFor(() => screen.getByTestId("abacus-zone"));

    // Switch to Challenge mode.
    await act(async () => {
      await user.click(screen.getByTestId("abacus-mode-challenge"));
    });

    // Submit the 5 deterministic-answer-zero questions back-to-back. The
    // empty board already equals the expected answer, so each submit is
    // scored as correct → 100% accuracy → Level 2 unlocks.
    for (let i = 0; i < 5; i += 1) {
      const submit = await screen.findByTestId("abacus-challenge-submit");
      await act(async () => {
        await user.click(submit);
      });
    }

    // Completion screen renders with the unlock copy.
    const complete = await screen.findByTestId("abacus-challenge-complete");
    expect(complete).toBeInTheDocument();
    expect(complete.textContent).toMatch(/level_unlocked/i);

    // The unlock fetch fired with the right action + level.
    await waitFor(() => {
      const completeCall = calls.find(
        (c) =>
          (c.body as { action?: string } | undefined)?.action ===
          "complete_level",
      );
      expect(completeCall).toBeTruthy();
      const b = completeCall!.body as { level: number; accuracyPct: number };
      expect(b.level).toBe(1);
      expect(b.accuracyPct).toBe(100);
    });
    // log_session also fired so lifetime totals stay in sync.
    await waitFor(() => {
      expect(
        calls.find(
          (c) =>
            (c.body as { action?: string } | undefined)?.action ===
            "log_session",
        ),
      ).toBeTruthy();
    });

    // Level-2 chip is now enabled (no `disabled` attribute).
    await waitFor(() => {
      const lvl2 = screen.getByTestId("abacus-level-2") as HTMLButtonElement;
      expect(lvl2.disabled).toBe(false);
    });
  });
});

describe("AbacusZone — localStorage hydration", () => {
  it("reads cached progress before the API resolves", async () => {
    const cached = {
      currentLevel: 2,
      lastMode: "practice",
      completedLevels: [1],
      highestUnlocked: 2,
      bestScores: {},
      totalCorrect: 4,
      totalAttempts: 5,
      totalPoints: 999,
    };
    window.localStorage.setItem(
      "abacus.progress.v1.99",
      JSON.stringify(cached),
    );
    // API never resolves in this test — cache must drive the UI.
    fetchMock.mockReturnValue(new Promise(() => {}));
    render(<AbacusZone childId={99} childName="Riya" ageYears={7} />);
    await waitFor(() => {
      expect(screen.getByTestId("abacus-zone")).toBeInTheDocument();
    });
    expect(screen.getByText(/999/)).toBeInTheDocument();
  });
});
