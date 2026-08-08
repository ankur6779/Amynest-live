import { useEffect, useState } from "react";
import { Calendar, Sparkles } from "lucide-react";
import { HUB_GLASS_SURFACE, ROUTINES_HUB_ACCENT } from "@/lib/parent-hub-premium";
import { cn } from "@/lib/utils";
import { isRoutineLivingV1Enabled } from "@/lib/routine-generation/living-entry";
import {
  livingRevealCraftingLine,
  livingRevealReadyEyebrow,
} from "@/lib/routine-generation/living-result";

const CRAFT_MS_LEGACY = 1500;
const CRAFT_MS_LIVING = 700;

type RoutineRevealOverlayProps = {
  active: boolean;
  title: string;
  childName: string;
  highlightChips: string[];
  onComplete: () => void;
};

export function RoutineRevealOverlay({
  active,
  title,
  childName,
  highlightChips,
  onComplete,
}: RoutineRevealOverlayProps) {
  const living = isRoutineLivingV1Enabled();
  const [phase, setPhase] = useState<"crafting" | "reveal" | "done">("crafting");

  useEffect(() => {
    if (!active) return;
    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

    if (living && reduceMotion) {
      setPhase("reveal");
      const doneTimer = window.setTimeout(() => {
        setPhase("done");
        onComplete();
      }, 900);
      return () => window.clearTimeout(doneTimer);
    }

    setPhase("crafting");
    const craftMs = living ? CRAFT_MS_LIVING : CRAFT_MS_LEGACY;
    const craftTimer = window.setTimeout(() => setPhase("reveal"), craftMs);
    const doneTimer = window.setTimeout(() => {
      setPhase("done");
      onComplete();
    }, craftMs + (living ? 1600 : 2200));
    return () => {
      window.clearTimeout(craftTimer);
      window.clearTimeout(doneTimer);
    };
  }, [active, onComplete, living]);

  if (!active || phase === "done") return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center px-6",
        "bg-[rgba(8,12,28,0.72)] backdrop-blur-md",
        phase === "reveal" && "pointer-events-none",
      )}
      role="status"
      aria-live="polite"
      data-testid="routine-reveal-overlay"
      data-living={living ? "1" : "0"}
    >
      <div
        className={cn(
          HUB_GLASS_SURFACE,
          ROUTINES_HUB_ACCENT.border,
          "w-full max-w-md rounded-[24px] p-6 text-center transition-opacity duration-500",
          phase === "crafting" ? "opacity-100" : "opacity-0",
        )}
      >
        {living ? (
          <Calendar className="h-7 w-7 text-amber-200/90 mx-auto mb-3" aria-hidden />
        ) : (
          <Sparkles className="h-8 w-8 text-amber-300/90 mx-auto mb-3" aria-hidden />
        )}
        <p className="text-sm font-semibold text-foreground/90">
          {living
            ? livingRevealCraftingLine(childName)
            : "Amy is crafting your routine…"}
        </p>
        {!living ? (
          <p className="text-xs text-muted-foreground mt-1">{childName}</p>
        ) : null}
      </div>

      {phase === "reveal" ? (
        <div
          className={cn(
            HUB_GLASS_SURFACE,
            ROUTINES_HUB_ACCENT.border,
            "absolute w-full max-w-md rounded-[24px] p-6 text-center",
          )}
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-300/90 mb-2">
            {living ? livingRevealReadyEyebrow() : "Routine ready"}
          </p>
          <h2 className="font-quicksand text-2xl font-bold text-foreground leading-snug">
            {title}
          </h2>
          {highlightChips.length > 0 ? (
            <div className="flex flex-wrap justify-center gap-1.5 mt-4">
              {highlightChips.map((chip) => (
                <span
                  key={chip}
                  className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-200 border border-amber-500/25"
                >
                  {chip}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
