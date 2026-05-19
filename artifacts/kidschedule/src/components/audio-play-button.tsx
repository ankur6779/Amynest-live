import { useCallback, useEffect, useRef } from "react";
import { Volume2, Loader2, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAmyVoice } from "@/hooks/use-amy-voice";
import { useToast } from "@/hooks/use-toast";
import { useInFlightGuard, useMountedRef, useSafeAsync } from "@/hooks/use-safe-async";
import { cn } from "@/lib/utils";
import { recordTtsUserGesture } from "@/lib/tts-guard";

const DEBOUNCE_MS = 800;

/**
 * Warm the server-side TTS cache for a piece of text without playing it.
 * Subsequent calls to `useAmyVoice().speak(text)` then resolve almost
 * instantly because the server already has the MP3 ready. Failures are
 * deliberately silent — preloading is best-effort and never blocks the UI.
 */
export async function preloadAmyVoice(
  _authFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
  _text: string,
  _opts: {
    voiceId?: string;
    modelId?: string;
    mode?: "default" | "phonics";
    signal?: AbortSignal;
  } = {},
): Promise<void> {
  // Disabled: background preload must not hit TTS during app boot.
}

interface AudioPlayButtonProps {
  /** The text the TTS engine will speak. */
  text: string;
  /** Visual size of the button. */
  size?: "sm" | "md" | "lg";
  /** Tailwind colour classes for the play state. */
  variant?: "primary" | "ghost" | "violet" | "amber";
  /** Optional aria-label override. Default uses the text. */
  ariaLabel?: string;
  /** Optional callback when playback finishes naturally (not on stop). */
  onFinished?: () => void;
  /** Optional callback when the user taps Play (used for progress tracking). */
  onPlay?: () => void;
  /**
   * `phonics` uses crisp ElevenLabs voice settings tuned for teaching
   * letter sounds. Caches separately from default. Use ONLY for the bare
   * phoneme ("buh"), never for full sentences.
   */
  mode?: "default" | "phonics";
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<AudioPlayButtonProps["size"]>, string> = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-12 w-12",
};

const ICON_SIZES: Record<NonNullable<AudioPlayButtonProps["size"]>, string> = {
  sm: "h-3.5 w-3.5",
  md: "h-4 w-4",
  lg: "h-5 w-5",
};

const VARIANT_CLASSES: Record<NonNullable<AudioPlayButtonProps["variant"]>, string> = {
  primary: "bg-primary text-primary-foreground hover:bg-primary/90",
  violet:  "bg-primary text-primary-foreground hover:bg-primary",
  amber:   "bg-primary text-primary-foreground hover:bg-primary",
  ghost:   "bg-card text-foreground hover:bg-card",
};

/**
 * Reusable Play / Stop / Loading button that plays a piece of text using the
 * Amy (ElevenLabs) voice. The underlying hook caches by content hash on the
 * server, so once a sound has been played anywhere in the app it will be
 * served instantly the next time.
 */
export function AudioPlayButton({
  text,
  size = "md",
  variant = "primary",
  ariaLabel,
  onFinished,
  onPlay,
  mode,
  className,
}: AudioPlayButtonProps) {
  const { toast } = useToast();
  const { speak, stop, speaking, loading, error } = useAmyVoice({ onFinished });
  const busy = speaking || loading;
  const isMounted = useMountedRef();
  const { safeAsync } = useSafeAsync();
  const { run: runInFlight } = useInFlightGuard();
  // Debounce ref: ignore taps within DEBOUNCE_MS of each other to prevent
  // double-fire from fast taps or accidental repeated presses.
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!error || !isMounted.current) return;
    toast({
      title: "Voice unavailable",
      description:
        error === "playback_blocked_tap_again"
          ? "Tap play again to start audio (browser blocked autoplay)."
          : error === "tts_missing_api_key"
            ? "Amy voice is temporarily unavailable. Please try again later."
            : error === "tts_timeout"
              ? "Voice request timed out. Please try again."
              : error.replace(/_/g, " "),
      variant: "destructive",
    });
  }, [error, toast, isMounted]);

  const handleClick = useCallback(async () => {
    recordTtsUserGesture();
    if (debounceRef.current) {
      console.warn("[TTS] click debounced — too soon after last tap");
      return;
    }
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
    }, DEBOUNCE_MS);

    await runInFlight(async () => {
      const play = safeAsync(async () => {
        if (busy) {
          stop();
          return null;
        }
        const trimmed = (text ?? "").trim();
        if (!trimmed) return null;
        const res = await speak(trimmed, { mode });
        if (!res?.success) {
          console.warn("TTS failed, skipping audio flow:", res?.error);
          return null;
        }
        if (isMounted.current) onPlay?.();
        return res;
      });
      try {
        await play();
      } catch (err) {
        console.error("VOICE ERROR:", err);
      }
    });
  }, [busy, isMounted, mode, onPlay, runInFlight, safeAsync, speak, stop, text]);

  return (
    <Button
      type="button"
      onClick={handleClick}
      disabled={busy}
      aria-label={ariaLabel ?? `Play ${text}`}
      data-testid={`audio-play-${text.slice(0, 16).replace(/\s+/g, "-").toLowerCase()}`}
      className={cn(
        "rounded-full p-0 border-0 shadow-sm transition-all",
        SIZE_CLASSES[size],
        VARIANT_CLASSES[variant],
        busy && "ring-2 ring-offset-2 ring-offset-transparent ring-current/40 animate-pulse",
        className,
      )}
    >
      {loading ? (
        <Loader2 className={cn(ICON_SIZES[size], "animate-spin")} />
      ) : speaking ? (
        <Square className={cn(ICON_SIZES[size], "fill-current")} />
      ) : (
        <Volume2 className={ICON_SIZES[size]} />
      )}
    </Button>
  );
}
