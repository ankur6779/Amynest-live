import { useCallback, useEffect, useMemo, useState } from "react";
import { Volume2, Loader2, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAmyVoice } from "@/hooks/use-amy-voice";
import { useToast } from "@/hooks/use-toast";
import { useInFlightGuard, useMountedRef, useSafeAsync } from "@/hooks/use-safe-async";
import {
  prefetchPhonicsAudioKeys,
  resolvePhonicsAudioKey,
} from "@/lib/phonics-static-audio";
import {
  checkPhonicsLetterClip,
  checkPhonicsWordClip,
} from "@/lib/phonics-audio-availability";
import { subscribePhonicsPlayback, isPhonicsPlaying } from "@/lib/phonics-player";
import {
  onStaticAudioVisualFallback,
  preloadStaticPhrases,
  prefetchStaticAudioUrl,
  lookupStaticAudioUrl,
  primeStaticAudioInUserGesture,
} from "@/lib/static-audio";
import {
  catalogPlaybackSpeakOptions,
  hasStaticCatalogAudio,
  playCatalogPreparedUrl,
  resolvePhonicsCatalogPhrase,
  shouldBypassPhonicsSpellingLibraries,
} from "@/lib/unified-catalog-playback";
import { getPhonicsAudioText } from "@workspace/phonics-sounds";
import { isLocalAudioRecoveryEnabled } from "@/lib/local-audio-recovery";
import { phonicsEnginePlayWord, phonicsEngineStop } from "@/lib/phonics-audio-engine";
import {
  isPhonicsLocalPlaybackAvailable,
  playLocalPhonicsLetter,
  playLocalPhonicsWord,
} from "@/lib/phonics-local-playback";
import { speakPhonicsFastClip } from "@/lib/phonics-audio";
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
  variant?: "primary" | "ghost" | "violet" | "amber" | "outline";
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
  /** Disable while another phonics clip is playing (prevents double-tap races). */
  lockWhileGlobalPlayback?: boolean;
  disabled?: boolean;
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
  outline: "bg-card text-foreground border border-border hover:bg-muted",
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
  lockWhileGlobalPlayback = false,
  disabled: disabledProp = false,
  className,
}: AudioPlayButtonProps) {
  const { toast } = useToast();
  const playbackRate = slow ? 0.78 : 1;
  const handleFinished = useCallback(() => {
    onFinished?.();
    onSpeakingEnd?.();
  }, [onFinished, onSpeakingEnd]);
  const { speak, pause, speaking, loading, error, activePhrase } = useAmyVoice({
    onFinished: handleFinished,
    playbackRate,
  });
  const [visualFallback, setVisualFallback] = useState(false);
  const [globalPlaying, setGlobalPlaying] = useState(isPhonicsPlaying());
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

  const resolvedAudioKey = useMemo(() => {
    const trimmed = (text ?? "").trim();
    if (!trimmed || mode !== "phonics") return "";
    return (
      resolvePhonicsAudioKey({ text: trimmed, phoneme: phonemeKey ?? null }) ?? ""
    );
  }, [text, mode, phonemeKey]);

  const isWordClip = Boolean(cvcWordKey);

  const audioAvailable = useMemo(() => {
    if (mode !== "phonics") return true;
    const trimmed = (text ?? "").trim();
    if (!trimmed) return false;
    try {
      if (hasStaticCatalogAudio(trimmed)) return true;
      // Phonics clips often live in phonics-library / TTS, not static-audio-map — keep buttons tappable.
      if (shouldBypassPhonicsSpellingLibraries() || isLocalAudioRecoveryEnabled()) {
        return true;
      }
      if (cvcWordKey || (!phonemeKey && trimmed && !/\s/.test(trimmed))) {
        return checkPhonicsWordClip(cvcWordKey ?? trimmed).available;
      }
      const key = resolvedAudioKey || phonemeKey || trimmed.toLowerCase();
      return checkPhonicsLetterClip(key).available;
    } catch (err) {
      console.warn("[AudioPlayButton] phonics availability check failed", err);
      return true;
    }
  }, [mode, text, phonemeKey, cvcWordKey, resolvedAudioKey, isWordClip]);

  const resolvedText = useMemo(() => {
    const trimmed = (text ?? "").trim();
    if (!trimmed) return "";
    if (mode !== "phonics") return trimmed;
    if (shouldBypassPhonicsSpellingLibraries()) {
      return resolvePhonicsCatalogPhrase(trimmed, phonemeKey);
    }
    return resolvedAudioKey || trimmed;
  }, [text, mode, resolvedAudioKey, phonemeKey]);

  const activeKeys = useMemo(() => {
    const keys = new Set<string>();
    const trimmed = (text ?? "").trim().toLowerCase();
    if (trimmed) keys.add(trimmed);
    if (resolvedAudioKey) keys.add(resolvedAudioKey.toLowerCase());
    if (resolvedText) keys.add(resolvedText.toLowerCase());
    return keys;
  }, [text, resolvedAudioKey, resolvedText]);

  const isThisClipActive =
    activePhrase != null && activeKeys.has(activePhrase.toLowerCase());
  const busy = isThisClipActive && (speaking || loading);

  const preparing = mode === "phonics" && !audioAvailable;
  const lockedByGlobal = lockWhileGlobalPlayback && globalPlaying && !busy;
  const disabled = disabledProp || preparing || lockedByGlobal;

  useEffect(() => {
    return subscribePhonicsPlayback(({ playing }) => {
      if (isMounted.current) setGlobalPlaying(playing);
    });
  }, [isMounted]);

  const resolvedPrefetch = useMemo(() => {
    const next = (prefetchNextText ?? "").trim();
    if (!next) return "";
    return mode === "phonics" ? getPhonicsAudioText(next) : next;
  }, [prefetchNextText, mode]);

  const handlePointerEnter = useCallback(() => {
    if (mode === "phonics" && resolvedAudioKey) {
      prefetchPhonicsAudioKeys([resolvedAudioKey]);
      return;
    }
    if (!resolvedText) return;
    const currentUrl = lookupStaticAudioUrl(resolvedText, mode ?? "default");
    if (currentUrl) prefetchStaticAudioUrl(currentUrl);
    if (resolvedPrefetch) {
      const nextUrl = lookupStaticAudioUrl(resolvedPrefetch, mode ?? "phonics");
      if (nextUrl) prefetchStaticAudioUrl(nextUrl);
    }
  }, [resolvedText, resolvedPrefetch, mode, resolvedAudioKey]);

  const handlePointerDown = useCallback(() => {
    audioManager.unlockFromUserGesture();
    if (resolvedText) {
      primeStaticAudioInUserGesture(resolvedText, mode ?? "default");
      const url = lookupStaticAudioUrl(resolvedText, mode ?? "default");
      if (url) prefetchStaticAudioUrl(url);
    }
  }, [resolvedText, mode]);

  const handleClick = useCallback(async () => {
    if (disabled || preparing) return;
    audioManager.unlockFromUserGesture();

    await runInFlight(async () => {
      const play = safeAsync(async () => {
        if (busy) {
          pause();
          return null;
        }
        if (!resolvedText) return null;

        if (mode === "phonics") {
          pause();
          await phonicsEngineStop("audio_play_button");
          const tryStaticCatalogFirst = async (phrase: string) => {
            if (!hasStaticCatalogAudio(phrase)) return null;
            const catalog = await playCatalogPreparedUrl(phrase, {
              playbackRate,
              source: "audio-play-button",
            });
            if (catalog.ok) {
              if (isMounted.current) onPlay?.();
              return { success: true, layer: "static" as const };
            }
            return null;
          };
          if (isWordClip && cvcWordKey) {
            if (
              isLocalAudioRecoveryEnabled() &&
              isPhonicsLocalPlaybackAvailable(cvcWordKey, "word")
            ) {
              const localRes = await playLocalPhonicsWord(cvcWordKey);
              if (localRes.ok) {
                if (isMounted.current) onPlay?.();
                return { success: true, layer: "static" as const };
              }
            }
            const engineRes = await phonicsEnginePlayWord(cvcWordKey);
            if (engineRes.ok) {
              if (isMounted.current) onPlay?.();
              return { success: true, layer: "static" as const };
            }
            const staticFirst = await tryStaticCatalogFirst(
              resolvePhonicsCatalogPhrase(resolvedText, phonemeKey),
            );
            if (staticFirst?.success) return staticFirst;
            const fastWord = await speakPhonicsFastClip(resolvedText, {
              phoneme: phonemeKey,
              playbackRate,
            });
            if (fastWord.success) {
              if (isMounted.current) onPlay?.();
              return fastWord;
            }
            const speakWord = await speak(
              resolvedText,
              catalogPlaybackSpeakOptions(resolvedText, {
                mode: "phonics",
                phoneme: phonemeKey,
                word: cvcWordKey,
                playbackMode: "partial-ok",
              }),
            );
            if (speakWord?.success) {
              if (isMounted.current) onPlay?.();
              return speakWord;
            }
            if (isMounted.current) setVisualFallback(true);
            return { success: false, error: speakWord?.error ?? "phonics_play_failed" };
          }
          const letterKey = resolvedAudioKey || phonemeKey || resolvedText;
          if (
            isLocalAudioRecoveryEnabled() &&
            letterKey &&
            isPhonicsLocalPlaybackAvailable(letterKey, "letter")
          ) {
            const localRes = await playLocalPhonicsLetter(letterKey);
            if (localRes.ok) {
              if (isMounted.current) onPlay?.();
              return { success: true, layer: "static" as const };
            }
          }
          const fast = await speakPhonicsFastClip(resolvedText, {
            phoneme: phonemeKey,
            playbackRate,
          });
          if (fast.success) {
            if (isMounted.current) onPlay?.();
            return fast;
          }
          const staticLetter = await tryStaticCatalogFirst(
            resolvePhonicsCatalogPhrase(resolvedText, phonemeKey),
          );
          if (staticLetter?.success) return staticLetter;
          const speakLetter = await speak(
            resolvedText,
            catalogPlaybackSpeakOptions(resolvedText, {
              mode: "phonics",
              phoneme: phonemeKey,
              word: cvcWordKey,
              playbackMode: "partial-ok",
            }),
          );
          if (speakLetter?.success) {
            if (isMounted.current) onPlay?.();
            return speakLetter;
          }
          if (isMounted.current) setVisualFallback(true);
          return speakLetter ?? fast;
        }

        const isSentenceRead = resolvedText.includes(" ");
        const speakOpts = hasStaticCatalogAudio(resolvedText)
          ? catalogPlaybackSpeakOptions(resolvedText, {
              mode: mode ?? "default",
              phoneme: phonemeKey,
              word: cvcWordKey,
              playbackMode: isSentenceRead ? ("full-required" as const) : ("partial-ok" as const),
            })
          : {
              mode: mode ?? "default",
              playbackMode: isSentenceRead ? ("full-required" as const) : ("partial-ok" as const),
              waitUntilEnd: !isSentenceRead,
              phoneme: phonemeKey,
              word: cvcWordKey,
            };
        const res = await speak(resolvedText, speakOpts);
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
  }, [
    busy,
    disabled,
    preparing,
    isMounted,
    mode,
    onPlay,
    runInFlight,
    safeAsync,
    speak,
    pause,
    resolvedText,
    cvcWordKey,
    isWordClip,
    phonemeKey,
    resolvedAudioKey,
    playbackRate,
  ]);

  const label = preparing
    ? "Audio preparing"
    : ariaLabel ?? `Play ${text}`;

  return (
    <Button
      type="button"
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerEnter={handlePointerEnter}
      disabled={disabled}
      aria-label={label}
      title={preparing ? "Audio preparing" : undefined}
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
