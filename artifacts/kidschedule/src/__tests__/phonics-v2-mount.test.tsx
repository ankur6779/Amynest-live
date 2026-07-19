import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { PhonicsV2 } from "@/components/phonics-v2";
import { PHONICS_LEVELS } from "@/lib/phonics-content";

vi.mock("@/components/audio-play-button", () => ({
  AudioPlayButton: () => <button type="button">play</button>,
}));

vi.mock("@/components/cvc-blend-panel", () => ({
  CvcBlendingPracticeCard: () => <div data-testid="cvc-practice-stub" />,
  CvcBlendPanel: () => null,
}));

vi.mock("@/hooks/use-auth-fetch", () => ({
  useAuthFetch: () => vi.fn().mockResolvedValue(new Response(JSON.stringify({ progress: {} }), { status: 200 })),
}));

vi.mock("@/lib/phonics-v3/sync", () => ({
  hydratePhonicsV3Progress: vi.fn().mockResolvedValue(undefined),
  ensurePhonicsV3OnlineSync: vi.fn(),
  persistPhonicsV3Mastery: vi.fn(),
  persistPhonicsV3Fluency: vi.fn(),
  persistPhonicsV3Stories: vi.fn(),
  loadPhonicsV3MissionLocal: vi.fn(() => null),
  persistPhonicsV3Mission: vi.fn(),
}));

vi.mock("@/components/phonics-v2/voice/usePhonicsVoiceRound", () => ({
  usePhonicsVoiceRound: () => ({
    phase: "idle",
    outcome: null,
    feedback: null,
    speechFeedback: null,
    listening: false,
    transcribing: false,
    transcript: "",
    error: null,
    startListening: vi.fn(),
    stopListening: vi.fn(),
    reset: vi.fn(),
  }),
}));

describe("PhonicsV2 mount", () => {
  it("renders Daily Learning Session home with one Start Today CTA", () => {
    render(
      <PhonicsV2
        childId={1}
        childName="Sam"
        totalAgeMonths={42}
        level={PHONICS_LEVELS["3_4y"]}
        items={[
          { id: "bl-cat", symbol: "cat", type: "word", sound: "cat" },
        ]}
        progress={{ practiced: {}, mastered: {} }}
        recordPlay={() => {}}
        curriculumLevel={3}
      />,
    );
    expect(screen.getByTestId("phonics-v2")).toBeTruthy();
    expect(screen.getByTestId("phonics-learning-hub")).toBeTruthy();
    expect(screen.getByTestId("phonics-hub-primary-cta")).toHaveTextContent(/Start Today/i);
    expect(screen.queryByTestId("daily-session-runner")).toBeNull();
    expect(screen.queryByTestId("phonics-v2-journey-map")).toBeNull();

    fireEvent.click(screen.getByTestId("phonics-hub-primary-cta"));
    expect(screen.getByTestId("daily-session-runner")).toBeTruthy();
    expect(screen.getByTestId("daily-session-step-header")).toHaveTextContent(/Step 1 of 4/i);
  });
});
