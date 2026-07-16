import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Mic, MicOff, RefreshCw, Sparkles } from "lucide-react";
import { usePhonicsVoiceRound } from "../voice/usePhonicsVoiceRound";
import type { CoachEvaluation, CoachTargetKind } from "@/lib/phonics-v3/ai-reading-coach";
import { MouthShapeCue } from "./MouthShapeCue";

type AiPronunciationCoachProps = {
  childId: number;
  childName: string;
  totalAgeMonths: number;
  expected: string;
  targetKind?: CoachTargetKind;
  /** Show articulation tip panel */
  showArticulation?: boolean;
  onEvaluation?: (evaluation: CoachEvaluation) => void;
  onPassed?: (evaluation: CoachEvaluation) => void;
  onSkip?: () => void;
};

/**
 * Interactive AI Reading Coach — listen → score → encourage → retry.
 * Never persists raw audio; only transcript-derived scores.
 */
export function AiPronunciationCoach({
  childId,
  childName,
  totalAgeMonths,
  expected,
  targetKind = "word",
  showArticulation = true,
  onEvaluation,
  onPassed,
  onSkip,
}: AiPronunciationCoachProps) {
  const voice = usePhonicsVoiceRound({
    childId,
    childName,
    totalAgeMonths,
    word: expected,
    targetKind,
    onCoachEvaluation: (evaluation) => {
      onEvaluation?.(evaluation);
      if (evaluation.correct && evaluation.tier !== "try_again") {
        onPassed?.(evaluation);
      }
    },
  });

  const evalResult = voice.coachEval;
  const label =
    targetKind === "phoneme"
      ? `Say the sound /${expected}/`
      : `Read: ${expected}`;

  return (
    <div
      data-testid="ai-pronunciation-coach"
      className="space-y-3 rounded-2xl border border-primary/20 bg-primary/[0.04] p-4"
    >
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <p className="text-sm font-bold">{label}</p>
        <Badge variant="outline" className="ml-auto text-[9px]">
          AI coach
        </Badge>
      </div>

      {showArticulation && targetKind === "phoneme" && (
        <MouthShapeCue grapheme={expected} className="bg-card/80" />
      )}

      <Button
        type="button"
        size="lg"
        className={cn(
          "w-full min-h-12 rounded-2xl font-bold",
          voice.listening && "animate-pulse ring-2 ring-rose-400",
        )}
        onClick={() => {
          if (voice.listening) voice.stopListening();
          else voice.startListening();
        }}
        aria-label={voice.listening ? "Stop listening" : "Tap to speak"}
      >
        {voice.listening ? (
          <>
            <MicOff className="mr-2 h-5 w-5" />
            Stop listening
          </>
        ) : (
          <>
            <Mic className="mr-2 h-5 w-5" />
            Tap to speak
          </>
        )}
      </Button>

      {(voice.transcribing || voice.phase === "evaluating") && (
        <p className="text-center text-xs text-muted-foreground">Amy is listening…</p>
      )}

      {voice.error && (
        <p className="text-center text-xs text-amber-700 dark:text-amber-300">
          Mic needs a moment — you can skip and keep learning.
        </p>
      )}

      {evalResult && (
        <div className="space-y-2 rounded-xl border border-border bg-card/90 p-3 text-center">
          <p className="text-2xl" aria-hidden>
            {evalResult.tier === "excellent"
              ? "🌟"
              : evalResult.tier === "good"
                ? "👍"
                : evalResult.tier === "almost"
                  ? "💪"
                  : "🎯"}
          </p>
          <p className="text-sm font-bold text-foreground">{evalResult.feedback}</p>
          <div className="flex flex-wrap justify-center gap-2 text-[10px] text-muted-foreground">
            <span>Accuracy {evalResult.accuracyPct}%</span>
            <span>·</span>
            <span>Confidence {evalResult.confidencePct}%</span>
            {evalResult.heardAs && (
              <>
                <span>·</span>
                <span>Heard closer to /{evalResult.heardAs}/</span>
              </>
            )}
          </div>
          {evalResult.articulation && evalResult.retryRecommended && (
            <div className="rounded-lg bg-muted/40 px-2 py-1.5 text-left text-[11px]">
              <p className="font-semibold">{evalResult.articulation.title}</p>
              <ul className="mt-1 list-inside list-disc text-muted-foreground">
                {evalResult.articulation.steps.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
          )}
          {evalResult.retryRecommended && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full"
              onClick={voice.startListening}
            >
              <RefreshCw className="mr-1 h-3.5 w-3.5" />
              Practice again
            </Button>
          )}
        </div>
      )}

      {onSkip && (
        <button
          type="button"
          className="mx-auto block text-[11px] text-muted-foreground underline"
          onClick={onSkip}
        >
          Continue without mic
        </button>
      )}
    </div>
  );
}
