import { useEffect, useRef, useState } from "react";
import { Lock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getPreviewLockCopy, type PreviewLockMode } from "@/components/preview-lock-wrapper";

export interface UseMediaPreviewCapOptions {
  /** When false, the cap is disabled (full playback). */
  active: boolean;
  /** Cap in seconds. Default 6, clamped to the 5–8 s contract. */
  capSeconds?: number;
  /** Fired once per mount when the cap is hit. */
  onCap?: () => void;
}

/**
 * Hook that enforces a hard playback cap on a media element. The cap is the
 * single source of truth: every `timeupdate`, every `seeking`, and every
 * `play` event after the cap has fired forces the media back to the cap and
 * pauses it. The user cannot drag past the cap before, during, or after the
 * overlay appears.
 *
 * The hook does not render any UI — pair it with `<MediaPreviewLockOverlay>`
 * (or your own overlay) and gate that overlay on the returned `capped` flag.
 */
export function useMediaPreviewCap<T extends HTMLMediaElement>(
  ref: React.RefObject<T | null>,
  { active, capSeconds = 6, onCap }: UseMediaPreviewCapOptions,
): boolean {
  const [capped, setCapped] = useState(false);
  const cap = Math.min(8, Math.max(5, capSeconds));
  const onCapRef = useRef(onCap);
  useEffect(() => {
    onCapRef.current = onCap;
  }, [onCap]);

  // Reset whenever the active flag toggles so a new playback session starts
  // fresh (e.g. switching from one preview-only story to another).
  useEffect(() => {
    if (!active) setCapped(false);
  }, [active]);

  useEffect(() => {
    if (!active) return;
    const media = ref.current;
    if (!media) return;

    let didCap = false;
    const triggerCap = () => {
      if (didCap) return;
      didCap = true;
      try {
        if (media.currentTime > cap) media.currentTime = cap;
      } catch {
        /* setting currentTime can throw on some browsers; ignore */
      }
      media.pause();
      setCapped(true);
      onCapRef.current?.();
    };

    const handleTimeUpdate = () => {
      if (media.currentTime >= cap) triggerCap();
    };
    const handleSeeking = () => {
      if (media.currentTime > cap) {
        try {
          media.currentTime = cap;
        } catch {
          /* ignore */
        }
        triggerCap();
      }
    };
    const handlePlay = () => {
      // After the cap, any attempt to resume is immediately pinned back.
      if (didCap) {
        try {
          media.currentTime = cap;
        } catch {
          /* ignore */
        }
        media.pause();
      }
    };

    media.addEventListener("timeupdate", handleTimeUpdate);
    media.addEventListener("seeking", handleSeeking);
    media.addEventListener("play", handlePlay);
    return () => {
      media.removeEventListener("timeupdate", handleTimeUpdate);
      media.removeEventListener("seeking", handleSeeking);
      media.removeEventListener("play", handlePlay);
    };
  }, [ref, active, cap]);

  return capped;
}

interface MediaPreviewLockOverlayProps {
  mode: PreviewLockMode;
  onClose?: () => void;
  closeLabel?: string;
  /** Tone the overlay for video (dark backdrop) vs cards (light). */
  appearance?: "dark" | "light";
}

/**
 * Centered lock overlay used by media preview wrappers (StoryPlayer,
 * AudioPlayButton tiles). Copy is shared with the non-media wrapper so the
 * messaging is consistent across the two surfaces.
 */
export function MediaPreviewLockOverlay({
  mode,
  onClose,
  closeLabel = "Got it",
  appearance = "dark",
}: MediaPreviewLockOverlayProps) {
  const copy = getPreviewLockCopy(mode);
  const backdrop =
    appearance === "dark"
      ? "bg-black/55 backdrop-blur-[2px]"
      : "bg-gradient-to-br from-amber-500/15 via-rose-500/10 to-violet-500/15 backdrop-blur-[3px]";
  return (
    <div
      data-testid="media-preview-lock-overlay"
      className={`absolute inset-0 z-20 flex items-center justify-center rounded-2xl ${backdrop}`}
    >
      <div className="max-w-xs rounded-2xl bg-white/95 dark:bg-zinc-900/95 border border-amber-200/60 dark:border-amber-400/30 shadow-2xl px-5 py-4 text-center">
        <div className="mx-auto w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center mb-2">
          <Lock className="h-4 w-4 text-amber-700 dark:text-amber-300" />
        </div>
        <p className="font-bold text-sm text-foreground">{copy.title}</p>
        <p className="text-xs text-muted-foreground mt-1 leading-snug">
          {copy.subtitle}
        </p>
        {onClose && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onClose}
            className="mt-3 rounded-full h-8 px-3 text-xs font-bold gap-1.5"
          >
            <X className="h-3.5 w-3.5" />
            {closeLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
