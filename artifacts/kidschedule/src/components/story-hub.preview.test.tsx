/**
 * Integration tests that prove the API-driven `previewOnly` contract is
 * honoured end-to-end through StoryHub → StoryPlayer.
 *
 * Specifically:
 *   1. A story whose id is in `previewStoryIds` plays in preview mode.
 *   2. The same story id, removed from `previewStoryIds` (early-unlock /
 *      DOB rollover), plays at full length with no preview cap.
 *   3. A "next-stage" carousel story whose id is NOT in `previewStoryIds`
 *      (i.e. server marks it unlocked) plays at full length even though
 *      it appears in the next-stage row — no client-side fallback.
 *   4. Untagged / universal stories surfaced via the regular catalogue
 *      route through Section 1 (no preview).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { fireEvent } from "@testing-library/react";
import type { StoryDto } from "@/hooks/use-stories-data";
import type { HubStoryDto } from "@/hooks/use-hub-content";

const recordProgress = vi.fn();
const refresh = vi.fn();
const useStoriesDataMock = vi.fn();

vi.mock("@/hooks/use-stories-data", () => ({
  useStoriesData: (...args: unknown[]) => useStoriesDataMock(...args),
}));

const playerProps: { current: Record<string, unknown> | null } = {
  current: null,
};

vi.mock("@/components/story-player", () => ({
  StoryPlayer: (props: Record<string, unknown>) => {
    playerProps.current = props;
    if (!props.story) return null;
    return (
      <div
        data-testid="story-player"
        data-preview-mode={(props.previewMode as string | null) ?? "off"}
      />
    );
  },
}));

vi.mock("@/components/story-carousel", () => ({
  StoryCarousel: ({
    title,
    stories,
    onSelect,
  }: {
    title: string;
    stories: StoryDto[];
    onSelect: (s: StoryDto) => void;
  }) => (
    <div data-testid={`carousel-${title.replace(/\s+/g, "-").toLowerCase()}`}>
      {stories.map((s) => (
        <button
          key={s.id}
          data-testid={`story-card-${s.id}`}
          onClick={() => onSelect(s)}
        >
          {s.title}
        </button>
      ))}
    </div>
  ),
}));

import { StoryHub } from "./story-hub";

function makeStory(id: number, title: string): StoryDto {
  return {
    id,
    driveFileId: `drive-${id}`,
    title,
    category: "general",
    thumbnailUrl: null,
    durationSec: 60,
    streamUrl: `/stream/${id}`,
    positionSec: 0,
    playCount: 0,
    completed: false,
  };
}

function makeHubStory(id: number, previewOnly: boolean): HubStoryDto {
  return {
    id,
    driveFileId: `drive-${id}`,
    title: `Hub Story ${id}`,
    category: "general",
    thumbnailUrl: null,
    durationSec: 60,
    streamUrl: `/stream/${id}`,
    ageBand: "4-6",
    isUniversal: false,
    previewOnly,
  };
}

const baseStoriesPayload = (rows: {
  continueWatching?: StoryDto[];
  recommended?: StoryDto[];
  trending?: StoryDto[];
  allStories?: StoryDto[];
}) => ({
  loading: false,
  error: null,
  data: {
    activeChildId: 1,
    child: { id: 1, name: "Test" },
    catalogSize: 4,
    rows: {
      continueWatching: rows.continueWatching ?? [],
      recommended: rows.recommended ?? [],
      trending: rows.trending ?? [],
      allStories: rows.allStories ?? [],
    },
  },
  refresh,
  recordProgress,
});

describe("<StoryHub> preview gating from /api/hub/content", () => {
  beforeEach(() => {
    playerProps.current = null;
    useStoriesDataMock.mockReset();
    recordProgress.mockReset();
    refresh.mockReset();
  });

  it("plays in preview mode when launched from the next-stage row", () => {
    // Preview-only stories never live in Section 1 carousels (they're filtered
    // out — see the dedicated test below). The user reaches them via the
    // next-stage carousel, where they trigger preview mode via previewStoryIds.
    const previewStory = makeHubStory(101, true);
    useStoriesDataMock.mockReturnValue(baseStoriesPayload({}));

    render(
      <StoryHub
        childId={1}
        childName="Test"
        previewStoryIds={new Set([101])}
        nextStageStories={[previewStory]}
        previewMode="next-level"
      />,
    );

    fireEvent.click(screen.getByTestId("story-card-101"));
    const player = screen.getByTestId("story-player");
    expect(player.dataset.previewMode).toBe("next-level");
    expect(playerProps.current?.previewMode).toBe("next-level");
  });

  it("plays at full length when the same id is removed from previewStoryIds (unlock flip)", () => {
    const story = makeStory(202, "Unlocked Story");
    useStoriesDataMock.mockReturnValue(
      baseStoriesPayload({ recommended: [story] }),
    );

    // Empty preview set simulates an early-unlock or DOB rollover that
    // promoted this story out of Section 2.
    render(
      <StoryHub
        childId={1}
        childName="Test"
        previewStoryIds={new Set()}
        previewMode="next-level"
      />,
    );

    fireEvent.click(screen.getByTestId("story-card-202"));
    const player = screen.getByTestId("story-player");
    expect(player.dataset.previewMode).toBe("off");
    expect(playerProps.current?.previewMode).toBeNull();
  });

  it("does NOT force preview mode for next-stage carousel items missing from previewStoryIds", () => {
    // The story is in nextStageStories (carousel) but the server says
    // it's actually unlocked (not in previewStoryIds). We must trust the
    // server flag — no client-side fallback to "in next-stage row =>
    // preview".
    const unlockedHubStory = makeHubStory(303, false);
    useStoriesDataMock.mockReturnValue(baseStoriesPayload({}));

    render(
      <StoryHub
        childId={1}
        childName="Test"
        previewStoryIds={new Set()}
        nextStageStories={[unlockedHubStory]}
        previewMode="next-level"
      />,
    );

    // Find the next-stage card — the carousel renders inside a "Coming up next"
    // sub-section, but the test stub uses the title verbatim so it'll be a
    // story-card with id 303.
    fireEvent.click(screen.getByTestId("story-card-303"));
    const player = screen.getByTestId("story-player");
    expect(player.dataset.previewMode).toBe("off");
  });

  it("removes preview-only ids from Section-1 carousels even if /api/stories returned them", () => {
    // /api/stories returns a flat unfiltered catalog, so a future-band story
    // can show up in the regular rows. The hub-content payload tells us which
    // ids are preview-only — those must be filtered OUT of Section 1 entirely
    // and only appear in the next-stage row.
    const unlockedStory = makeStory(501, "Unlocked");
    const futureStory = makeStory(502, "Future Band");
    useStoriesDataMock.mockReturnValue(
      baseStoriesPayload({
        continueWatching: [unlockedStory, futureStory],
        recommended: [futureStory],
        trending: [unlockedStory],
        allStories: [unlockedStory, futureStory],
      }),
    );

    render(
      <StoryHub
        childId={1}
        childName="Test"
        previewStoryIds={new Set([502])}
        nextStageStories={[makeHubStory(502, true)]}
        previewMode="next-level"
      />,
    );

    // Unlocked story is everywhere it was sourced from; future story is gone
    // from every Section-1 carousel.
    expect(screen.getAllByTestId("story-card-501").length).toBeGreaterThan(0);
    // The future-band story should appear ONLY once — inside the
    // next-stage carousel — not in any of the Section-1 carousels.
    const futureCards = screen.getAllByTestId("story-card-502");
    expect(futureCards.length).toBe(1);
  });

  it("plays a universal/untagged Section-1 story without preview", () => {
    // Section 1 routing: stories sourced from the regular catalogue (Continue
    // Watching / Recommended) are never in the preview set unless the server
    // explicitly added them. This guards against accidental preview-treatment
    // of universal content.
    const universal = makeStory(404, "Universal Story");
    useStoriesDataMock.mockReturnValue(
      baseStoriesPayload({ continueWatching: [universal] }),
    );

    render(
      <StoryHub
        childId={1}
        childName="Test"
        previewStoryIds={new Set([999])}
        previewMode="next-level"
      />,
    );

    fireEvent.click(screen.getByTestId("story-card-404"));
    const player = screen.getByTestId("story-player");
    expect(player.dataset.previewMode).toBe("off");
  });
});
