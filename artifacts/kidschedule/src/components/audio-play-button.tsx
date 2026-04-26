import { Volume2, Loader2, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAmyVoice } from "@/hooks/use-amy-voice";
import { cn } from "@/lib/utils";

/**
 * Warm the server-side TTS cache for a piece of text without playing it.
 * Subsequent calls to `useAmyVoice().speak(text)` then resolve almost
 * instantly because the server already has the MP3 ready. Failures are
 * deliberately silent — preloading is best-effort and never blocks the UI.
 */
export async function preloadAmyVoice(
  authFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
  text: string,
  opts: { voiceId?: string; modelId?: string; signal?: AbortSignal } = {},
): Promise<void> {
  const t = (text ?? "").trim();
  if (!t) return;
  try {
    await authFetch("/api/tts/synthesize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: t, voiceId: opts.voiceId, modelId: opts.modelId }),
      signal: opts.signal,
    });
  } catch {
    /* best-effort; ignore */
  }
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
  violet:  "bg-violet-500 text-white hover:bg-violet-600",
  amber:   "bg-amber-500 text-white hover:bg-amber-600",
  ghost:   "bg-white/70 dark:bg-white/[0.06] text-foreground hover:bg-white",
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
  className,
}: AudioPlayButtonProps) {
  const { speak, stop, speaking, loading } = useAmyVoice({ onFinished });
  const busy = speaking || loading;

  const handleClick = () => {
    if (busy) {
      stop();
      return;
    }
    onPlay?.();
    void speak(text);
  };

  return (
    <Button
      type="button"
      onClick={handleClick}
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
