import { useEffect, useState } from "react";
import { Loader2, Sparkles, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStoriesData, type StoryDto } from "@/hooks/use-stories-data";
import { StoryCarousel } from "@/components/story-carousel";
import { StoryPlayer } from "@/components/story-player";

interface StoryHubProps {
  childId: number | null;
  childName?: string;
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
export function StoryHub({ childId, childName }: StoryHubProps) {
  const { loading, error, data, refresh, recordProgress } = useStoriesData(childId);
  const [activeStory, setActiveStory] = useState<StoryDto | null>(null);

  // Multi-child safety: when the active child changes, immediately close any
  // open player. Otherwise progress writes (now bound to the new childId)
  // would record the previous child's playback against the new child.
  useEffect(() => {
    setActiveStory(null);
  }, [childId]);

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

  const { rows } = data;

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

      <StoryPlayer
        story={activeStory}
        onClose={() => {
          setActiveStory(null);
          // After the player closes, refresh so Continue Watching reflects the
          // new progress immediately.
          refresh();
        }}
        onProgress={recordProgress}
      />
    </div>
  );
}
