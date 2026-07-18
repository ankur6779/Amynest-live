import { AmyIcon } from "@/components/amy-icon";
import { cn } from "@/lib/utils";

type GuidedAmyCueProps = {
  /** Short spoken-style cue — keep under ~8 words */
  line: string;
  className?: string;
  celebrate?: boolean;
};

/**
 * Visual Amy cue for phonics — presentation only (no TTS wiring required).
 * Children should understand the next action without reading long copy.
 */
export function GuidedAmyCue({ line, className, celebrate }: GuidedAmyCueProps) {
  return (
    <div
      data-testid="guided-amy-cue"
      role="status"
      aria-live="polite"
      className={cn(
        "flex items-center gap-3 rounded-2xl border px-3 py-2.5",
        celebrate
          ? "border-amber-500/35 bg-amber-500/10"
          : "border-primary/25 bg-primary/[0.06]",
        className,
      )}
    >
      <div
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-card shadow-sm",
          celebrate && "animate-bounce",
        )}
        aria-hidden
      >
        <AmyIcon size={28} />
      </div>
      <p className="font-quicksand text-sm font-bold leading-snug text-foreground sm:text-base">
        {line}
      </p>
    </div>
  );
}

/** Kid-facing one-liners mapped from lesson step ids (UI only). */
export const LESSON_STEP_AMY_CUES: Record<string, string> = {
  hear: "Listen carefully.",
  mouth: "Watch Amy’s mouth.",
  repeat: "Say the sound with me!",
  letter_id: "Tap the matching letter.",
  trace: "Trace the letter.",
  find_sound: "Tap the right picture.",
  beginning: "Which word starts with this sound?",
  ending: "Which word ends with this sound?",
  build_word: "Drag the sounds together.",
  read_independent: "Read the word!",
};
