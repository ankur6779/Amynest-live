import { useEffect, useRef, useState } from "react";
import { X, AlertCircle, RotateCcw, ChevronRight, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { StoryDto } from "@/hooks/use-stories-data";

interface StoryFlowPlayerProps {
  story: StoryDto;
  storyIndex: number;
  totalStories: number;
  /** Countdown in seconds before auto-advancing (null = not counting down). */
  autoAdvanceIn: number | null;
  /** Show the "Great! Let's watch again 🎉" loop-complete banner. */
  showLoopBanner: boolean;
  /** Increment to seek the current video back to 0 and replay. */
  replaySignal: number;
  onNext: () => void;
  onReplay: () => void;
  onClose: () => void;
  onEnded: () => void;
  onError: () => void;
  onProgress: (
    storyId: number,
    positionSec: number,
    options?: { durationSec?: number; completed?: boolean; startedSession?: boolean },
  ) => void;
}

export function StoryFlowPlayer({
  story,
  storyIndex,
  totalStories,
  autoAdvanceIn,
  showLoopBanner,
  replaySignal,
  onNext,
  onReplay,
  onClose,
  onEnded,
  onError,
  onProgress,
}: StoryFlowPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [errored, setErrored] = useState(false);
  const startedRef = useRef(false);

  // Reset on story change.
  useEffect(() => {
    setErrored(false);
    startedRef.current = false;
  }, [story.id]);

  // Replay signal: seek to start and play.
  useEffect(() => {
    if (replaySignal === 0) return;
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = 0;
    void v.play().catch(() => {});
  }, [replaySignal]);

  // Resume from last position once metadata loads.
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !story) return;
    const handleLoaded = () => {
      const resumeFrom = story.positionSec ?? 0;
      if (resumeFrom > 5 && resumeFrom < (v.duration || Infinity) - 5) {
        v.currentTime = resumeFrom;
      }
    };
    v.addEventListener("loadedmetadata", handleLoaded);
    return () => v.removeEventListener("loadedmetadata", handleLoaded);
  }, [story.id]);

  // Progress writes + lifecycle events.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const handleTimeUpdate = () => {
      onProgress(story.id, v.currentTime, {
        durationSec: Number.isFinite(v.duration) ? v.duration : undefined,
      });
    };
    const handlePlay = () => {
      if (!startedRef.current) {
        startedRef.current = true;
        onProgress(story.id, v.currentTime, {
          durationSec: Number.isFinite(v.duration) ? v.duration : undefined,
          startedSession: true,
        });
      }
    };
    const handleEnded = () => {
      onProgress(story.id, v.duration || 0, {
        durationSec: Number.isFinite(v.duration) ? v.duration : undefined,
        completed: true,
      });
      onEnded();
    };
    const handleError = () => {
      setErrored(true);
      onError();
    };

    v.addEventListener("timeupdate", handleTimeUpdate);
    v.addEventListener("play", handlePlay);
    v.addEventListener("ended", handleEnded);
    v.addEventListener("error", handleError);
    return () => {
      v.removeEventListener("timeupdate", handleTimeUpdate);
      v.removeEventListener("play", handlePlay);
      v.removeEventListener("ended", handleEnded);
      v.removeEventListener("error", handleError);
    };
  }, [story.id, onProgress, onEnded, onError]);

  return (
    <div
      className="relative overflow-hidden rounded-2xl bg-black shadow-2xl shadow-purple-900/40"
      data-testid={`story-flow-player-${story.id}`}
    >
      {/* Top bar: progress dots + close */}
      <div className="absolute left-0 right-0 top-0 z-20 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent px-4 py-3">
        <div className="flex items-center gap-2">
          {/* Dot indicators — capped at 20 visible dots */}
          <div className="flex gap-1">
            {Array.from({ length: Math.min(totalStories, 20) }).map((_, i) => (
              <div
                key={i}
                className={`h-1 rounded-full transition-all ${
                  i === (storyIndex % 20)
                    ? "w-6 bg-white"
                    : i < (storyIndex % 20)
                    ? "w-3 bg-white/40"
                    : "w-3 bg-white/20"
                }`}
              />
            ))}
          </div>
          <span className="ml-1 text-[11px] tabular-nums text-white/60">
            {storyIndex + 1}&thinsp;/&thinsp;{totalStories}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/80 focus:outline-none focus:ring-2 focus:ring-white/30"
          aria-label="Close player"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Video element or error state */}
      {errored ? (
        <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 bg-black p-8 text-center">
          <AlertCircle className="h-10 w-10 text-red-400" />
          <p className="text-sm font-semibold text-white">Couldn't load this story</p>
          <p className="text-xs text-white/50">Skipping to next…</p>
        </div>
      ) : (
        <video
          key={story.id}
          ref={videoRef}
          src={story.streamUrl}
          controls
          autoPlay
          playsInline
          className="aspect-video w-full bg-black"
        />
      )}

      {/* Auto-advance countdown overlay */}
      {autoAdvanceIn !== null && !showLoopBanner && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 bg-black/75 backdrop-blur-sm">
          <p className="text-sm text-white/70">Up next</p>
          <p className="text-2xl font-bold text-white">
            Next story in {autoAdvanceIn}s…
          </p>
          <div className="flex gap-3">
            <Button
              variant="ghost"
              className="border border-white/30 text-white hover:bg-white/10"
              onClick={onReplay}
            >
              <RotateCcw className="mr-2 h-3.5 w-3.5" />
              Watch again
            </Button>
            <Button
              className="bg-white text-black hover:bg-white/90"
              onClick={onNext}
            >
              <Play className="mr-2 h-3.5 w-3.5 fill-current" />
              Play now
            </Button>
          </div>
        </div>
      )}

      {/* Loop-complete banner */}
      {showLoopBanner && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-black/90">
          <span className="text-5xl" role="img" aria-label="party">🎉</span>
          <p className="text-2xl font-bold text-white">All stories watched!</p>
          <p className="text-sm text-white/60">
            Starting over…
          </p>
        </div>
      )}

      {/* Bottom bar: title + controls */}
      <div className="flex items-end justify-between gap-4 bg-gradient-to-t from-black to-black/0 px-4 pb-4 pt-8">
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-white">{story.title}</p>
          <p className="mt-0.5 text-xs capitalize text-white/50">{story.category}</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={onReplay}
            className="h-8 gap-1.5 text-xs text-white/70 hover:bg-white/10 hover:text-white"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Replay
          </Button>
          <Button
            size="sm"
            onClick={onNext}
            className="h-8 gap-1.5 bg-violet-600 text-xs text-white hover:bg-violet-500"
          >
            Next
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
