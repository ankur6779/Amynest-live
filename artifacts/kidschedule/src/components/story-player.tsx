import { useEffect, useRef, useState } from "react";
import { X, AlertCircle, RotateCcw } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { StoryDto } from "@/hooks/use-stories-data";

interface StoryPlayerProps {
  story: StoryDto | null;
  onClose: () => void;
  onProgress: (
    storyId: number,
    positionSec: number,
    options?: { durationSec?: number; completed?: boolean; startedSession?: boolean },
  ) => void;
}

export function StoryPlayer({ story, onClose, onProgress }: StoryPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [errored, setErrored] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const startedRef = useRef(false);

  // Reset error state and "started" flag when the story changes.
  useEffect(() => {
    setErrored(false);
    startedRef.current = false;
  }, [story?.id, retryKey]);

  // Resume from last position once metadata is loaded.
  useEffect(() => {
    if (!story || !videoRef.current) return;
    const v = videoRef.current;
    const handleLoaded = () => {
      const resumeFrom = story.positionSec ?? 0;
      if (resumeFrom > 5 && resumeFrom < (v.duration || Infinity) - 5) {
        v.currentTime = resumeFrom;
      }
    };
    v.addEventListener("loadedmetadata", handleLoaded);
    return () => v.removeEventListener("loadedmetadata", handleLoaded);
  }, [story, retryKey]);

  // Periodic progress writes.
  useEffect(() => {
    if (!story || !videoRef.current) return;
    const v = videoRef.current;

    const handleTimeUpdate = () => {
      if (!story) return;
      onProgress(story.id, v.currentTime, {
        durationSec: Number.isFinite(v.duration) ? v.duration : undefined,
      });
    };
    const handlePlay = () => {
      if (!story) return;
      if (!startedRef.current) {
        startedRef.current = true;
        onProgress(story.id, v.currentTime, {
          durationSec: Number.isFinite(v.duration) ? v.duration : undefined,
          startedSession: true,
        });
      }
    };
    const handleEnded = () => {
      if (!story) return;
      onProgress(story.id, v.duration || 0, {
        durationSec: Number.isFinite(v.duration) ? v.duration : undefined,
        completed: true,
      });
    };
    const handleError = () => setErrored(true);

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
  }, [story, onProgress, retryKey]);

  // On close, write current position one final time.
  const handleClose = () => {
    const v = videoRef.current;
    if (story && v && v.currentTime > 0) {
      onProgress(story.id, v.currentTime, {
        durationSec: Number.isFinite(v.duration) ? v.duration : undefined,
      });
    }
    onClose();
  };

  if (!story) return null;

  // story.streamUrl is "/api/reels/stream/:fileId" — relative paths work
  // because Vite proxies /api to the api-server in dev and the prod deploy
  // serves both from the same origin.
  const streamSrc = story.streamUrl;

  return (
    <Dialog open={!!story} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent
        className="max-w-5xl border-0 bg-black p-0 sm:rounded-xl"
        showCloseButton={false}
        data-testid={`story-player-${story.id}`}
      >
        <DialogTitle className="sr-only">{story.title}</DialogTitle>
        <div className="relative">
          {errored ? (
            <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 bg-black p-8 text-center">
              <AlertCircle className="h-12 w-12 text-red-400" />
              <p className="text-base font-semibold text-white">
                Couldn't load this story
              </p>
              <p className="max-w-sm text-sm text-white/60">
                The video stream failed. This can happen if Drive is rate-limiting
                or the file is temporarily unavailable.
              </p>
              <Button
                onClick={() => setRetryKey((k) => k + 1)}
                variant="secondary"
                className="mt-2"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Try again
              </Button>
            </div>
          ) : (
            <video
              key={`${story.id}-${retryKey}`}
              ref={videoRef}
              src={streamSrc}
              controls
              autoPlay
              playsInline
              className="aspect-video w-full bg-black"
            />
          )}

          <button
            type="button"
            onClick={handleClose}
            className="absolute right-2 top-2 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-black/80 focus:outline-none focus:ring-2 focus:ring-white/40"
            aria-label="Close player"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="bg-gradient-to-t from-black to-black/0 px-4 py-3">
            <p className="text-base font-semibold text-white">{story.title}</p>
            <p className="text-xs capitalize text-white/60">{story.category}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
