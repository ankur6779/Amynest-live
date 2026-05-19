import { useCallback, useEffect } from "react";
import { Volume2, Loader2, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAmyVoice } from "@/hooks/use-amy-voice";
import { useToast } from "@/hooks/use-toast";
import { useInFlightGuard, useMountedRef, useSafeAsync } from "@/hooks/use-safe-async";
import { preloadStaticPhrases } from "@/lib/static-audio";
import { cn } from "@/lib/utils";
import { recordTtsUserGesture } from "@/lib/tts-guard";

/**
 * Warm static GCS audio for a phrase (no ElevenLabs / API).
 */
export function preloadAmyVoice(
  _authFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
  text: string,
  opts: { mode?: "default" | "phonics" } = {},
): void {
  const trimmed = (text ?? "").trim();
  if (!trimmed) return;
  preloadStaticPhrases([trimmed], opts.mode ?? "default", 1);
}

interface AudioPlayButtonProps {
  text: string;
  size?: "sm" | "md" | "lg";
  variant?: "primary" | "ghost" | "violet" | "amber";
  ariaLabel?: string;
  onFinished?: () => void;
  onPlay?: () => void;
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
              : error === "tts_static_missing_url"
                ? "This sound is not available yet."
                : error.replace(/_/g, " "),
      variant: "destructive",
    });
  }, [error, toast, isMounted]);

  const handleClick = useCallback(async () => {
    recordTtsUserGesture();

    await runInFlight(async () => {
      const play = safeAsync(async () => {
        if (busy) {
          stop();
          return null;
        }
        const trimmed = (text ?? "").trim();
        if (!trimmed) return null;
        const res = await speak(trimmed, { mode });
        if (!res?.success) return null;
        if (isMounted.current) onPlay?.();
        return res;
      });
      try {
        await play();
      } catch {
        // speak() never throws — guard only
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
