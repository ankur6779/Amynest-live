/**
 * Amy Audio Lessons coach tile — first-class module card.
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AmyAudioLessonsCard, amyAudioLessonsPath } from "@/components/amy-coach/amy-audio-lessons-card";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    i18n: { language: "en" },
    t: (key: string, defaultValue?: string) => {
      const copy: Record<string, string> = {
        "pages.ai_coach.amy_audio_lessons": "Amy Audio Lessons",
        "pages.ai_coach.hands_full_listen_to_age_curated_parenting_lessons_3_5_min_e":
          "Hands full? Listen to age-curated parenting lessons (3–5 min each).",
        "pages.ai_coach.audio_lessons_tag_audio": "Audio",
        "pages.ai_coach.audio_lessons_tag_age_curated": "Age-based",
        "pages.ai_coach.audio_lessons_explore": "Explore audio →",
      };
      return copy[key] ?? (typeof defaultValue === "string" ? defaultValue : key);
    },
  }),
}));

describe("AmyAudioLessonsCard", () => {
  it("renders as a first-class module with title, supporting copy, and CTA", () => {
    render(<AmyAudioLessonsCard onClick={() => undefined} />);
    const tile = screen.getByTestId("amy-audio-lessons-card");
    expect(tile).toBeVisible();
    expect(tile.tagName).toBe("BUTTON");
    expect(screen.getByText("Amy Audio Lessons")).toBeVisible();
    expect(
      screen.getByText("Hands full? Listen to age-curated parenting lessons (3–5 min each)."),
    ).toBeVisible();
    expect(screen.getByText("Explore audio →")).toBeVisible();
    expect(tile).toHaveAccessibleName(/Amy Audio Lessons/i);
    expect(tile.className).toMatch(/min-h-\[3rem\]/);
  });

  it("makes the entire tile clickable", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<AmyAudioLessonsCard onClick={onClick} />);
    await user.click(screen.getByTestId("amy-audio-lessons-card"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("opens the existing Audio Lessons route", () => {
    expect(amyAudioLessonsPath()).toBe("/audio-lessons");
    expect(amyAudioLessonsPath("tantrums")).toBe("/audio-lessons?goal=tantrums");
  });
});
