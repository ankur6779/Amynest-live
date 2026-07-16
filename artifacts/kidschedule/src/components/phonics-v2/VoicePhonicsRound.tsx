import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Mic, MicOff, Sparkles } from "lucide-react";
import { usePhonicsVoiceRound } from "./voice/usePhonicsVoiceRound";

type VoicePhonicsRoundProps = {
  childId: number;
  childName: string;
  totalAgeMonths: number;
  word: string;
  onComplete?: () => void;
  /** Fires on every voice outcome for retention + integrity tracking. */
  onReviewOutcome?: (result: { passed: boolean; confidence: number }) => void;
};

const OUTCOME_COPY = {
  correct: { emoji: "🌟", label: "Excellent!", color: "text-emerald-600" },
  almost: { emoji: "💪", label: "Almost there!", color: "text-amber-600" },
  retry: { emoji: "🎯", label: "Try again", color: "text-primary" },
};

export function VoicePhonicsRound({
  childId,
  childName,
  totalAgeMonths,
  word,
  onComplete,
  onReviewOutcome,
}: VoicePhonicsRoundProps) {
  const voice = usePhonicsVoiceRound({
    childId,
    childName,
    totalAgeMonths,
    word,
    onOutcome: (outcome, _fb, speech) => {
      const passed = outcome === "correct";
      // Integrity gates expect confidence on a 0–1 scale.
      const confidence01 =
        speech.confidence > 1 ? speech.confidence / 100 : speech.confidence;
      onReviewOutcome?.({ passed, confidence: confidence01 });
      if (passed) onComplete?.();
    },
  });

  const speech = voice.speechFeedback;
  const outcomeUi = speech
    ? { emoji: speech.emoji, label: speech.label, color: "text-emerald-600" }
    : voice.outcome
      ? OUTCOME_COPY[voice.outcome]
      : null;

  return (
    <div data-testid="voice-phonics-round" className="rounded-2xl border border-border p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <p className="text-sm font-bold">Say the word: <span className="uppercase">{word}</span></p>
      </div>

      <Button
        type="button"
        size="lg"
        className={cn(
          "w-full rounded-2xl font-bold",
          voice.listening && "ring-2 ring-red-400 animate-pulse",
        )}
        onClick={() => {
          if (voice.listening) voice.stopListening();
          else voice.startListening();
        }}
      >
        {voice.listening ? (
          <>
            <MicOff className="h-5 w-5 mr-2" />
            Stop listening
          </>
        ) : (
          <>
            <Mic className="h-5 w-5 mr-2" />
            Tap to speak
          </>
        )}
      </Button>

      {voice.transcribing && (
        <p className="text-xs text-center text-muted-foreground">Listening…</p>
      )}

      {outcomeUi && voice.feedback && (
        <div className="text-center space-y-1">
          <span className="text-2xl">{outcomeUi.emoji}</span>
          <p className={cn("text-sm font-bold", outcomeUi.color)}>{outcomeUi.label}</p>
          <p className="text-xs text-muted-foreground">{voice.feedback}</p>
          {speech?.phonemeHint && (
            <p className="text-[10px] text-primary/80 italic">{speech.phonemeHint}</p>
          )}
        </div>
      )}

      {voice.outcome === "retry" && (
        <Button type="button" variant="outline" size="sm" className="w-full rounded-full" onClick={voice.startListening}>
          Try once more
        </Button>
      )}
    </div>
  );
}
