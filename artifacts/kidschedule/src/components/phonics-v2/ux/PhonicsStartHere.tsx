import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { GuidedAmyCue } from "./GuidedAmyCue";
import { PulseCta } from "./PulseCta";
import { ChevronRight, Clock3 } from "lucide-react";
import { cn } from "@/lib/utils";

const STORAGE_PREFIX = "amynest:phonics-ftue-dismissed:";

type PhonicsStartHereProps = {
  childId: number;
  childName: string;
  focusSound: string;
  letterGroupName: string;
  estimatedMinutes?: number;
  onStartLesson: () => void;
  className?: string;
};

/**
 * First-paint clarity card: what this is, what to tap, how long it takes.
 * Dismissible after first use; always shows a compact “today” strip.
 */
export function PhonicsStartHere({
  childId,
  childName,
  focusSound,
  letterGroupName,
  estimatedMinutes = 5,
  onStartLesson,
  className,
}: PhonicsStartHereProps) {
  const [showFtue, setShowFtue] = useState(false);

  useEffect(() => {
    try {
      setShowFtue(!localStorage.getItem(`${STORAGE_PREFIX}${childId}`));
    } catch {
      setShowFtue(true);
    }
  }, [childId]);

  const dismissFtue = () => {
    try {
      localStorage.setItem(`${STORAGE_PREFIX}${childId}`, "1");
    } catch {
      /* quota */
    }
    setShowFtue(false);
  };

  const start = () => {
    dismissFtue();
    onStartLesson();
    requestAnimationFrame(() => {
      document
        .getElementById("phonics-reading-lesson")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  return (
    <div
      id="phonics-start-here"
      data-testid="phonics-start-here"
      className={cn(
        "space-y-3 rounded-3xl border border-amber-500/30 bg-gradient-to-br from-amber-500/[0.1] via-card to-emerald-500/[0.06] p-4 sm:p-5",
        className,
      )}
    >
      {showFtue && (
        <GuidedAmyCue
          line={`Hi ${childName.trim() || "friend"}! Let’s learn letter sounds.`}
        />
      )}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-[10px] font-black uppercase tracking-wide text-amber-700 dark:text-amber-300">
            Start here
          </p>
          <h2 className="font-quicksand text-lg font-black leading-tight">
            Today&apos;s sound: /{focusSound}/
          </h2>
          <p className="text-xs text-muted-foreground">
            Group {letterGroupName} · Learn sounds → blend → read words
          </p>
          <p className="inline-flex items-center gap-1 text-[11px] font-semibold text-foreground/80">
            <Clock3 className="h-3.5 w-3.5" aria-hidden />
            About {estimatedMinutes} minutes
          </p>
        </div>
      </div>

      <PulseCta>
        <Button
          type="button"
          size="lg"
          className="min-h-14 w-full rounded-2xl font-quicksand text-base font-black"
          onClick={start}
          data-testid="phonics-start-here-cta"
        >
          Start today&apos;s lesson
          <ChevronRight className="ml-1 h-5 w-5" />
        </Button>
      </PulseCta>

      {showFtue && (
        <button
          type="button"
          className="mx-auto block text-[11px] text-muted-foreground underline"
          onClick={dismissFtue}
        >
          I know how this works
        </button>
      )}
    </div>
  );
}
