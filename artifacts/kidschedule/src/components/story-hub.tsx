import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, Play, RefreshCw, Film } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStoriesData, type StoryDto } from "@/hooks/use-stories-data";
import { resolveApiMediaUrl } from "@/lib/api";
import { StoryFlowPlayer } from "@/components/story-player";
import { SubItemGate } from "@/components/sub-item-gate";

// ─── Per-child index persistence ─────────────────────────────────────────────
import { useTranslation } from "react-i18next";
const FLOW_KEY = (childId: number) => `story_flow_v1_${childId}`;
function readStoredIndex(childId: number, max: number): number {
  try {
    const raw = localStorage.getItem(FLOW_KEY(childId));
    if (raw === null) return 0;
    const n = parseInt(raw, 10);
    return Number.isFinite(n) && n >= 0 && n < max ? n : 0;
  } catch {
    return 0;
  }
}
function writeStoredIndex(childId: number, index: number): void {
  try {
    localStorage.setItem(FLOW_KEY(childId), String(index));
  } catch {}
}

// ─── Component ────────────────────────────────────────────────────────────────

interface StoryHubProps {
  childId: number | null;
  childName?: string;
}

/**
 * Single Story Flow hub.
 *
 * Replaces the Netflix-style carousel with a focused, one-story-at-a-time
 * player experience:
 *   • Resumes from the last-watched story per child (localStorage).
 *   • "Next" advances through the ordered catalog; after the last story
 *     the list loops back to index 0.
 *   • Stories auto-advance 3 s after the video ends.
 *   • Errors are silently skipped after 2 s.
 *   • The next story is preloaded so playback starts quickly.
 */
export function StoryHub({
  childId,
  childName
}: StoryHubProps) {
  const {
    t
  } = useTranslation();
  const {
    loading,
    error,
    data,
    refresh,
    recordProgress
  } = useStoriesData(childId);

  // Ordered catalog: all stories sorted consistently by title.
  const stories: StoryDto[] = useMemo(() => {
    if (!data?.rows.allStories?.length) return [];
    return [...data.rows.allStories].sort((a, b) => a.title.localeCompare(b.title));
  }, [data]);

  // ── Flow state ──
  const [flowIndex, setFlowIndex_] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [autoAdvanceIn, setAutoAdvanceIn] = useState<number | null>(null);
  const [showLoopBanner, setShowLoopBanner] = useState(false);
  const [replaySignal, setReplaySignal] = useState(0);

  // Wrap setFlowIndex to also persist.
  const setFlowIndex = useCallback((idx: number) => {
    setFlowIndex_(idx);
    if (childId !== null) writeStoredIndex(childId, idx);
  }, [childId]);

  // Restore index when child changes or stories first load.
  const restoredForChild = useRef<number | null>(null);
  useEffect(() => {
    if (!childId || !stories.length) return;
    if (restoredForChild.current === childId) return;
    restoredForChild.current = childId;
    setFlowIndex_(readStoredIndex(childId, stories.length));
    setIsPlaying(false);
    setAutoAdvanceIn(null);
    setShowLoopBanner(false);
  }, [childId, stories.length]);

  // On child switch, clear any active player immediately.
  useEffect(() => {
    restoredForChild.current = null;
    setIsPlaying(false);
    setAutoAdvanceIn(null);
    setShowLoopBanner(false);
  }, [childId]);

  // ── Body scroll lock while full-screen player is open ──
  useEffect(() => {
    if (!isPlaying) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [isPlaying]);

  // ── Countdown management ──
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const clearCountdown = useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    setAutoAdvanceIn(null);
  }, []);
  const advanceToNext = useCallback(() => {
    clearCountdown();
    setReplaySignal(0);
    setFlowIndex_(prev => {
      const next = prev + 1;
      if (next >= stories.length) {
        // Loop: reset to 0 + show banner briefly.
        if (childId !== null) writeStoredIndex(childId, 0);
        setShowLoopBanner(true);
        setTimeout(() => setShowLoopBanner(false), 3000);
        return 0;
      }
      if (childId !== null) writeStoredIndex(childId, next);
      return next;
    });
  }, [clearCountdown, stories.length, childId]);
  const startCountdown = useCallback(() => {
    clearCountdown();
    setAutoAdvanceIn(3);
    let remaining = 3;
    countdownRef.current = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        clearInterval(countdownRef.current!);
        countdownRef.current = null;
        setAutoAdvanceIn(null);
        advanceToNext();
      } else {
        setAutoAdvanceIn(remaining);
      }
    }, 1000);
  }, [clearCountdown, advanceToNext]);

  // Error auto-skip: 2 s timeout.
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleError = useCallback(() => {
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    errorTimerRef.current = setTimeout(() => {
      advanceToNext();
    }, 2000);
  }, [advanceToNext]);

  // Cleanup on unmount.
  useEffect(() => () => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
  }, []);
  const handleNext = useCallback(() => {
    clearCountdown();
    setShowLoopBanner(false);
    advanceToNext();
  }, [clearCountdown, advanceToNext]);
  const handleReplay = useCallback(() => {
    clearCountdown();
    setShowLoopBanner(false);
    setAutoAdvanceIn(null);
    setReplaySignal(s => s + 1);
  }, [clearCountdown]);
  const handleClose = useCallback(() => {
    clearCountdown();
    setIsPlaying(false);
    setShowLoopBanner(false);
    refresh();
  }, [clearCountdown, refresh]);

  // ── Derived ──
  const currentStory = stories[flowIndex] ?? null;
  const nextStory = stories[(flowIndex + 1) % Math.max(stories.length, 1)] ?? null;

  // ── Early-return states ──

  if (childId === null) {
    return <p className="rounded-lg bg-white/5 p-4 text-sm text-white/60">
        {t("components.story_hub.pick_a_child_above_to_see_their_personalised_story_collectio")}
      </p>;
  }
  if (loading && !data) {
    return <div className="flex items-center gap-2 rounded-lg bg-white/5 p-4 text-sm text-white/70">
        <Loader2 className="h-4 w-4 animate-spin" />
        {t("components.story_hub.loading")} {childName ? `${childName}'s` : "the"} {t("components.story_hub.story_collection")}
      </div>;
  }
  if (error && !data) {
    return <div className="space-y-3 rounded-lg bg-white/5 p-4">
        <p className="text-sm text-white/80">{t("components.story_hub.couldn_t_load_stories_right_now")}</p>
        <Button size="sm" variant="secondary" onClick={refresh}>
          <RefreshCw className="mr-2 h-3.5 w-3.5" />
          {t("components.story_hub.retry")}
        </Button>
      </div>;
  }
  if (!stories.length) {
    return <div className="rounded-lg bg-white/5 p-4 text-sm text-white/60">
        {t("components.story_hub.no_stories_yet_new_content_is_added_regularly_check_back_soo")}
      </div>;
  }

  // ── Active player — portal-based full-screen overlay ──
  if (isPlaying && currentStory) {
    return <>
        {/* Invisible preload element for the next story (stays in the regular tree) */}
        {nextStory && nextStory.id !== currentStory.id && <video key={`preload-${nextStory.id}`} src={resolveApiMediaUrl(nextStory.streamUrl)} preload="auto" className="hidden" aria-hidden="true" muted />}
        {createPortal(
          <div
            data-testid="story-hub"
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 9999,
              background: "#000",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <StoryFlowPlayer
              story={currentStory}
              storyIndex={flowIndex}
              totalStories={stories.length}
              autoAdvanceIn={autoAdvanceIn}
              showLoopBanner={showLoopBanner}
              replaySignal={replaySignal}
              fullScreen
              onNext={handleNext}
              onReplay={handleReplay}
              onClose={handleClose}
              onEnded={startCountdown}
              onError={handleError}
              onProgress={recordProgress}
            />
          </div>,
          document.body
        )}
      </>;
  }

  // ── Hero card (before / after playing) ──
  return <div className="space-y-4" data-testid="story-hub">
      {/* Catalog meta */}
      <p className="text-xs text-white/50">
        {stories.length} {t("components.story_hub.stories_personalised_for")} {data?.child.name ?? childName}
      </p>

      {/* Now-playing card.
          Card surface uses bg-white/5 / text-white tokens which the
          kidschedule legacy-color safety net (index.css) remaps to
          themed values in light mode. The thumbnail well and the violet
          Watch button, however, are intentionally dark surfaces with
          white text in BOTH themes — they get data-on-dark so the
          safety net leaves them alone. */}
      {currentStory && <SubItemGate sectionId="hub_story_hub" subItemId={String(currentStory.id)}>
        <div className="overflow-hidden rounded-2xl bg-white/5 ring-1 ring-white/10">
          {/* Thumbnail */}
          <div data-on-dark className="relative aspect-video w-full bg-black">
            {currentStory.thumbnailUrl ? <img src={currentStory.thumbnailUrl} alt={currentStory.title} className="h-full w-full object-cover opacity-80" /> : <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary to-primary">
                <Film className="h-16 w-16 text-white/30" />
              </div>}

            {/* Play button overlay */}
            <button type="button" onClick={() => setIsPlaying(true)} className="absolute inset-0 flex items-center justify-center bg-black/40 transition hover:bg-black/50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white/30" aria-label={`Watch ${currentStory.title}`}>
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 shadow-2xl transition hover:scale-105 hover:bg-white">
                <Play className="ml-1 h-7 w-7 fill-primary text-primary" />
              </div>
            </button>

            {/* Story counter badge */}
            <span className="absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-semibold text-white/80">
              {t("components.story_hub.story")} {flowIndex + 1} of {stories.length}
            </span>
          </div>

          {/* Story info + button */}
          <div className="flex items-center justify-between gap-4 px-4 py-3">
            <div className="min-w-0">
              <p className="truncate font-semibold text-white">{currentStory.title}</p>
              <p className="mt-0.5 text-xs capitalize text-white/50">
                {currentStory.category}
              </p>
            </div>
            <Button data-on-dark onClick={() => setIsPlaying(true)} className="shrink-0 gap-2 bg-primary text-white hover:bg-primary">
              <Play className="h-4 w-4 fill-current" />
              {t("components.story_hub.watch")}
            </Button>
          </div>
        </div>
        </SubItemGate>}
    </div>;
}