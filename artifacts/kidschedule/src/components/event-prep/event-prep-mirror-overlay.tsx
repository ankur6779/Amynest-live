import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  childName: string;
  costumeLabel: string;
  accent: [string, string];
  costumeImageUrl?: string;
  showCostume?: boolean;
  className?: string;
}

/** Static mirror frame — draggable props render in a sibling layer. */
export function EventPrepMirrorOverlay({
  childName,
  costumeLabel,
  accent,
  costumeImageUrl,
  showCostume = true,
  className,
}: Props) {
  return (
    <div className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      {showCostume && (
        <>
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(180deg, transparent 35%, ${accent[1]}99 72%, ${accent[0]}cc 100%)`,
            }}
          />
          <div
            className="absolute inset-0 opacity-40"
            style={{
              background: `linear-gradient(135deg, ${accent[0]}44, transparent 50%, ${accent[1]}44)`,
            }}
          />

          {costumeImageUrl && (
            <div className="absolute right-3 top-3 h-16 w-16 overflow-hidden rounded-2xl border-2 border-white/50 shadow-lg sm:h-20 sm:w-20">
              <img src={costumeImageUrl} alt="" className="h-full w-full object-cover" />
            </div>
          )}

          <div className="absolute inset-x-3 bottom-3 rounded-2xl border border-white/25 bg-black/35 px-3 py-2.5 text-center backdrop-blur-sm">
            <p className="font-quicksand text-sm font-bold text-white">{childName}</p>
            <p className="text-xs text-white/90">as {costumeLabel}</p>
          </div>

          <Sparkles className="absolute left-4 top-6 h-5 w-5 text-amber-200/80 hub-sparkle-glow" />
          <Sparkles className="absolute right-5 top-[38%] h-4 w-4 text-white/70" />
          <div
            className="absolute inset-3 rounded-[20px] border-2 border-white/25"
            style={{ boxShadow: `0 0 28px ${accent[0]}55 inset` }}
          />
        </>
      )}
    </div>
  );
}
