import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Sparkles, RefreshCw, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStoriesData, type StoryDto } from "@/hooks/use-stories-data";
import { StoryCarousel } from "@/components/story-carousel";
import { StoryPlayer } from "@/components/story-player";
import type { PreviewLockMode } from "@/components/preview-lock-wrapper";
import type { HubStoryDto } from "@/hooks/use-hub-content";

interface StoryHubProps {
  childId: number | null;
  childName?: string;
  /**
   * Story ids that should be played in preview-and-lock mode (5–8 s cap +
   * lock overlay). Sourced from the parent-hub /api/hub/content payload.
   */
  previewStoryIds?: ReadonlySet<number>;
  /** Section-2 stories to render as a "Next Stage" preview carousel. */
  nextStageStories?: readonly HubStoryDto[];
  /** Mode for the preview lock copy. Defaults to "next-level". */
  previewMode?: PreviewLockMode;
}

/** Map a HubStoryDto into the StoryDto shape consumed by StoryCarousel. */
function toCarouselStory(s: HubStoryDto): StoryDto {
  return {
    id: s.id,
    driveFileId: s.driveFileId,
    title: s.title,
    category: s.category,
    thumbnailUrl: s.thumbnailUrl,
    durationSec: s.durationSec,
    streamUrl: s.streamUrl,
    positionSec: s.positionSec ?? 0,
    playCount: s.playCount ?? 0,
    completed: s.completed ?? false,
  };
}

/**
 * Netflix-style story browsing UI.
 *
 *   Continue Watching → Recommended for You → Trending Stories → All Stories
 *
 * Single full-screen-style player launches when a card is clicked. Resume
 * position is restored from per-child watch progress; close/end events
 * write back to the server.
 */
export function StoryHub({
  childId,
  childName,
  previewStoryIds,
  nextStageStories,
  previewMode = "next-level",
}: StoryHubProps) {
  const { loading, error, data, refresh, recordProgress } = useStoriesData(childId);
  const [activeStory, setActiveStory] = useState<StoryDto | null>(null);

  const nextStageRow = useMemo(
    () => (nextStageStories ?? []).map(toCarouselStory),
    [nextStageStories],
  );

  // Multi-child safety: when the active child changes, immediately close any
  // open player. Otherwise progress writes (now bound to the new childId)
  // would record the previous child's playback against the new child.
  useEffect(() => {
    setActiveStory(null);
  }, [childId]);

  // The active story is preview-only iff the API said so via `previewStoryIds`.
  // We deliberately do NOT fall back to "is it in the next-stage row" — the
  // server-side `previewOnly` flag is the single source of truth and already
  // accounts for early-unlock and DOB rollover, so a story sitting in
  // `nextStageRow` that has been unlocked plays at full length.
  const activeIsPreview =
    !!activeStory && (previewStoryIds?.has(activeStory.id) ?? false);

  if (childId === null) {
    return (
      <p className="rounded-lg bg-white/5 p-4 text-sm text-white/60">
        Pick a child above to see their personalised story collection.
      </p>
    );
  }

  if (loading && !data) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-white/5 p-4 text-sm text-white/70">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading {childName ? `${childName}'s` : "the"} story collection…
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="space-y-3 rounded-lg bg-white/5 p-4">
        <p className="text-sm text-white/80">
          Couldn't load stories right now.
        </p>
        <Button size="sm" variant="secondary" onClick={refresh}>
          <RefreshCw className="mr-2 h-3.5 w-3.5" />
          Retry
        </Button>
      </div>
    );
  }

  if (!data || data.catalogSize === 0) {
    return (
      <div className="rounded-lg bg-white/5 p-4 text-sm text-white/60">
        No stories yet. New content is added regularly — check back soon!
      </div>
    );
  }

  // Section-1 partition: drop any story id that the API has marked as
  // preview-only. The /api/stories endpoint returns the full active catalog
  // (no age-band partitioning), so without this filter a future-band story
  // would surface in "Continue Watching / Recommended / Trending / All
  // Stories" alongside unlocked content. Section-1 must be **fully unlocked
  // current+universal content only** — preview-only items belong solely in
  // the Section-2 next-stage row below.
  const filterUnlocked = useCallback(
    (list: StoryDto[]): StoryDto[] =>
      previewStoryIds && previewStoryIds.size > 0
        ? list.filter((s) => !previewStoryIds.has(s.id))
        : list,
    [previewStoryIds],
  );
  const section1Rows = useMemo(
    () => ({
      continueWatching: filterUnlocked(data.rows.continueWatching),
      recommended: filterUnlocked(data.rows.recommended),
      trending: filterUnlocked(data.rows.trending),
      allStories: filterUnlocked(data.rows.allStories),
    }),
    [data.rows, filterUnlocked],
  );
  const rows = section1Rows;

  return (
    <div className="space-y-6" data-testid="story-hub">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-white/50">
          <Sparkles className="mr-1 inline h-3 w-3" />
          {data.catalogSize} stories • personalised for {data.child.name}
        </p>
        <Button
          size="sm"
          variant="ghost"
          onClick={refresh}
          className="h-7 gap-1.5 text-xs text-white/60 hover:bg-white/10 hover:text-white"
        >
          <RefreshCw className="h-3 w-3" />
          Refresh
        </Button>
      </div>

      <StoryCarousel
        title="Continue Watching"
        stories={rows.continueWatching}
        onSelect={setActiveStory}
        size="wide"
      />

      <StoryCarousel
        title="Recommended for You"
        stories={rows.recommended}
        onSelect={setActiveStory}
      />

      <StoryCarousel
        title="Trending Stories"
        stories={rows.trending}
        onSelect={setActiveStory}
        emptyHint="Once you've watched a few stories, the most popular ones will show up here."
      />

      <StoryCarousel
        title="All Stories"
        stories={rows.allStories}
        onSelect={setActiveStory}
      />

      {nextStageRow.length > 0 && (
        <div
          data-testid="story-hub-next-stage"
          className="relative rounded-2xl border border-amber-300/30 bg-gradient-to-br from-amber-500/10 via-rose-500/5 to-violet-500/10 p-3"
        >
          <div className="flex items-center gap-2 px-1 pb-2 text-[11px] font-extrabold uppercase tracking-wide text-amber-200">
            <Lock className="h-3 w-3" />
            Next Stage — preview only
          </div>
          <div className="opacity-90 saturate-90">
            <StoryCarousel
              title="Coming up next"
              stories={nextStageRow}
              onSelect={setActiveStory}
            />
          </div>
        </div>
      )}

      <StoryPlayer
        story={activeStory}
        onClose={() => {
          setActiveStory(null);
          // After the player closes, refresh so Continue Watching reflects the
          // new progress immediately.
          refresh();
        }}
        onProgress={recordProgress}
        previewMode={activeIsPreview ? previewMode : null}
      />
    </div>
  );
}
