import { useCallback, useEffect, useMemo, useState } from "react";
import { Volume2, Loader2, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAmyVoice } from "@/hooks/use-amy-voice";
import { useToast } from "@/hooks/use-toast";
import { useInFlightGuard, useMountedRef, useSafeAsync } from "@/hooks/use-safe-async";
import {
  onStaticAudioVisualFallback,
  preloadStaticPhrases,
  prefetchStaticAudioUrl,
  lookupStaticAudioUrl,
  primeStaticAudioInUserGesture,
} from "@/lib/static-audio";
import { getPhonicsAudioText } from "@workspace/phonics-sounds";
import { cn } from "@/lib/utils";
import {
  audioManager,
  AUDIO_UI_MESSAGE,
  onAudioNeedsUserGesture,
} from "@/lib/audio-manager";

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
  /** Fired when playback ends (success or pause). */
  onSpeakingEnd?: () => void;
  mode?: "default" | "phonics";
  /** Prefetch on hover (e.g. next phoneme in sequence). */
  prefetchNextText?: string;
  /** Slower playback for repeat / blending (0.75 ≈ teaching pace). */
  slow?: boolean;
  /** IPA phoneme key for GCS cache (phoneme_k). */
  phonemeKey?: string;
  /** CVC word key for GCS cache (word_cat). */
  cvcWordKey?: string;
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
  onSpeakingEnd,
  mode,
  prefetchNextText,
  slow = false,
  phonemeKey,
  cvcWordKey,
  className,
}: AudioPlayButtonProps) {
  const { toast } = useToast();
  const playbackRate = slow ? 0.78 : 1;
  const handleFinished = useCallback(() => {
    onFinished?.();
    onSpeakingEnd?.();
  }, [onFinished, onSpeakingEnd]);
  const { speak, pause, speaking, loading, error } = useAmyVoice({
    onFinished: handleFinished,
    playbackRate,
  });
  const [visualFallback, setVisualFallback] = useState(false);
  const busy = speaking || loading;
  const isMounted = useMountedRef();
  const { safeAsync } = useSafeAsync();
  const { run: runInFlight } = useInFlightGuard();

  useEffect(() => {
    return onAudioNeedsUserGesture(() => {
      if (!isMounted.current) return;
      toast({
        title: "Sound disabled",
        description: AUDIO_UI_MESSAGE.TAP_TO_ENABLE_SOUND,
        variant: "destructive",
      });
    });
  }, [toast, isMounted]);

  useEffect(() => {
    return onStaticAudioVisualFallback(({ phrase, showTapToHear }) => {
      const trimmed = (text ?? "").trim();
      if (phrase && phrase !== trimmed) return;
      if (!isMounted.current) return;
      setVisualFallback(true);
      if (showTapToHear !== false) {
        toast({
          title: "Tap to hear again",
          description: trimmed || "Amy voice",
        });
      }
      window.setTimeout(() => {
        if (isMounted.current) setVisualFallback(false);
      }, 2200);
    });
  }, [text, isMounted, toast]);

  useEffect(() => {
    if (!error || !isMounted.current) return;
    toast({
      title: "Voice unavailable",
      description:
        error === "playback_blocked_tap_again"
          ? AUDIO_UI_MESSAGE.TAP_TO_ENABLE_SOUND
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

  const resolvedText = useMemo(() => {
    const trimmed = (text ?? "").trim();
    if (!trimmed) return "";
    return mode === "phonics" ? getPhonicsAudioText(trimmed) : trimmed;
  }, [text, mode]);

  const resolvedPrefetch = useMemo(() => {
    const next = (prefetchNextText ?? "").trim();
    if (!next) return "";
    return mode === "phonics" ? getPhonicsAudioText(next) : next;
  }, [prefetchNextText, mode]);

  const handlePointerEnter = useCallback(() => {
    if (!resolvedText) return;
    const currentUrl = lookupStaticAudioUrl(resolvedText, mode ?? "default");
    if (currentUrl) prefetchStaticAudioUrl(currentUrl);
    if (resolvedPrefetch) {
      const nextUrl = lookupStaticAudioUrl(resolvedPrefetch, mode ?? "phonics");
      if (nextUrl) prefetchStaticAudioUrl(nextUrl);
    }
  }, [resolvedText, resolvedPrefetch, mode]);

  const handlePointerDown = useCallback(() => {
    audioManager.unlockFromUserGesture();
    if (resolvedText) {
      primeStaticAudioInUserGesture(resolvedText, mode ?? "default");
      const url = lookupStaticAudioUrl(resolvedText, mode ?? "default");
      if (url) prefetchStaticAudioUrl(url);
    }
  }, [resolvedText, mode]);

  const handleClick = useCallback(async () => {
    audioManager.unlockFromUserGesture();

    await runInFlight(async () => {
      const play = safeAsync(async () => {
        if (busy) {
          pause();
          return null;
        }
        if (!resolvedText) return null;
        const res = await speak(resolvedText, {
          mode,
          phoneme: phonemeKey,
          word: cvcWordKey,
        });
        if (!res?.success) {
          setVisualFallback(true);
          window.setTimeout(() => {
            if (isMounted.current) setVisualFallback(false);
          }, 1600);
          return null;
        }
        if (isMounted.current) onPlay?.();
        return res;
      });
      try {
        await play();
      } catch {
        // speak() never throws — guard only
      }
    });
  }, [busy, isMounted, mode, onPlay, runInFlight, safeAsync, speak, pause, resolvedText]);

  return (
    <Button
      type="button"
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerEnter={handlePointerEnter}
      disabled={busy}
      aria-label={ariaLabel ?? `Play ${text}`}
      data-testid={`audio-play-${text.slice(0, 16).replace(/\s+/g, "-").toLowerCase()}`}
      className={cn(
        "rounded-full p-0 border-0 shadow-sm transition-all",
        SIZE_CLASSES[size],
        VARIANT_CLASSES[variant],
        busy && "ring-2 ring-offset-2 ring-offset-transparent ring-current/40 animate-pulse",
        visualFallback && "ring-4 ring-amber-400/80 animate-pulse scale-110",
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
