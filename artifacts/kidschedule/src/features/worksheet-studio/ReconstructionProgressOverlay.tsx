import { Loader2, ScanLine } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReconstructionProgressStage } from "@workspace/worksheet-studio";
import { WS_GLASS_CARD, WS_OVERLAY, WS_MUTED_TEXT } from "./worksheet-studio-theme";

const STAGE_ORDER: ReconstructionProgressStage[] = [
  "uploading",
  "cleaning",
  "detecting_layout",
  "reading_text",
  "understanding",
  "generating",
  "validating",
  "opening",
];

const STAGE_LABELS: Record<ReconstructionProgressStage, string> = {
  uploading: "Uploading…",
  cleaning: "Cleaning image…",
  detecting_layout: "Detecting layout…",
  reading_text: "Reading text…",
  understanding: "Understanding worksheet…",
  generating: "Generating editable version…",
  validating: "Validating quality…",
  opening: "Opening editor…",
};

type Props = {
  stage: ReconstructionProgressStage;
};

export function ReconstructionProgressOverlay({ stage }: Props) {
  const idx = STAGE_ORDER.indexOf(stage);
  const pct = Math.round(((idx + 1) / STAGE_ORDER.length) * 100);

  return (
    <div className={cn(WS_OVERLAY, "z-50 items-center bg-[#1e3a5f]/25 backdrop-blur-sm")} role="status" aria-live="polite">
      <div className={cn(WS_GLASS_CARD, "mx-auto flex w-full min-w-0 max-w-sm flex-col items-center gap-4 px-8 py-10")}>
        <div className="relative">
          <ScanLine className="h-10 w-10 text-[#c9a227] animate-pulse" aria-hidden />
          <Loader2 className="absolute -right-1 -top-1 h-5 w-5 animate-spin text-[#1e3a5f]" aria-hidden />
        </div>
        <p className="text-center text-base font-semibold text-[#1e3a5f]">{STAGE_LABELS[stage]}</p>
        <p className={cn("text-center text-sm", WS_MUTED_TEXT)}>AI teaching assistant at work</p>
        <div className="h-2 w-full max-w-xs overflow-hidden rounded-full bg-[#1e3a5f]/10" aria-hidden>
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#1e3a5f] to-[#c9a227] transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <ol className={cn("w-full space-y-1 text-xs", WS_MUTED_TEXT)}>
          {STAGE_ORDER.slice(0, idx + 1).map((s) => (
            <li key={s} className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[#c9a227]" aria-hidden />
              {STAGE_LABELS[s]}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
