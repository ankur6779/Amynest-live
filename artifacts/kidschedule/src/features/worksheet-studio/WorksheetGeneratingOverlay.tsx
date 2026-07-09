import { Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { WS_GLASS_CARD } from "./worksheet-studio-theme";

type Props = { message?: string };

export function WorksheetGeneratingOverlay({ message = "Creating your worksheet…" }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1e3a5f]/20 backdrop-blur-sm" role="status" aria-live="polite" aria-labelledby="worksheet-generating-msg">
      <div className={cn(WS_GLASS_CARD, "mx-4 flex max-w-sm flex-col items-center gap-4 px-8 py-10")}>
        <div className="relative">
          <Sparkles className="h-10 w-10 text-[#c9a227] animate-pulse" aria-hidden />
          <Loader2 className="absolute -right-1 -top-1 h-5 w-5 animate-spin text-[#1e3a5f]" aria-hidden />
        </div>
        <p className="text-center text-base font-semibold text-[#1e3a5f]" id="worksheet-generating-msg">{message}</p>
        <p className="text-center text-sm text-muted-foreground">Usually under 20 seconds</p>
        <div className="h-1.5 w-48 overflow-hidden rounded-full bg-[#1e3a5f]/10" aria-hidden>
          <div className="h-full w-1/2 animate-[worksheet-progress_1.2s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-[#1e3a5f] to-[#c9a227]" />
        </div>
      </div>
    </div>
  );
}
