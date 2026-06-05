import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { HUB_GLASS_SURFACE, ROUTINES_HUB_ACCENT } from "@/lib/parent-hub-premium";
import { cn } from "@/lib/utils";

const CRAFT_MS = 1500;

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
  const [phase, setPhase] = useState<"crafting" | "reveal" | "done">("crafting");

  useEffect(() => {
    if (!active) return;
    setPhase("crafting");
    const craftTimer = window.setTimeout(() => setPhase("reveal"), CRAFT_MS);
    const doneTimer = window.setTimeout(() => {
      setPhase("done");
      onComplete();
    }, CRAFT_MS + 2200);
    return () => {
      window.clearTimeout(craftTimer);
      window.clearTimeout(doneTimer);
    };
  }, [active, onComplete]);

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
    >
      <div
        className={cn(
          HUB_GLASS_SURFACE,
          ROUTINES_HUB_ACCENT.border,
          "w-full max-w-md rounded-[24px] p-6 text-center transition-opacity duration-500",
          phase === "crafting" ? "opacity-100" : "opacity-0",
        )}
      >
        <Sparkles className="h-8 w-8 text-amber-300/90 mx-auto mb-3" />
        <p className="text-sm font-semibold text-foreground/90">
          Amy is crafting your routine…
        </p>
        <p className="text-xs text-muted-foreground mt-1">{childName}</p>
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
            Routine ready
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
