import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  getPostGenerationRecommendations,
  getQualityBreakdown,
  type PostGenerationRecommendation,
  type WorksheetDocument,
  type WorksheetImproveAction,
} from "@workspace/worksheet-studio";
import { PenLine, Sparkles, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { WS_SHEET, WS_MUTED_TEXT, WS_CHIP_GRID, WS_GLASS_CARD, WS_PRIMARY_BTN } from "./worksheet-studio-theme";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: WorksheetDocument | null;
  onRecommendation: (rec: PostGenerationRecommendation) => void;
  onEditNow?: () => void;
};

function ScoreRow({ label, value }: { label: string; value: number }) {
  const color = value >= 90 ? "text-emerald-600" : value >= 75 ? "text-[#1e3a5f]" : "text-amber-600";
  return (
    <div className="flex justify-between text-sm">
      <span className={WS_MUTED_TEXT}>{label}</span>
      <span className={cn("font-semibold", color)}>{value}%</span>
    </div>
  );
}

export function PostGenerationSheet({ open, onOpenChange, document, onRecommendation, onEditNow }: Props) {
  if (!document) return null;
  const breakdown = getQualityBreakdown(document);
  const recs = getPostGenerationRecommendations(document);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className={WS_SHEET}>
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 text-[#1e3a5f]">
            <TrendingUp className="h-5 w-5 text-[#c9a227]" /> Worksheet ready — {document.meta.topic}
          </SheetTitle>
        </SheetHeader>
        <p className={cn("mt-2 text-sm", WS_MUTED_TEXT)}>
          Your worksheet is open in the editor. Tap below to start editing text, moving items, or exporting PDF.
        </p>
        <Button
          className={cn(WS_PRIMARY_BTN, "mt-4 w-full min-h-12")}
          onClick={() => {
            onEditNow?.();
            onOpenChange(false);
          }}
        >
          <PenLine className="mr-2 h-5 w-5" />
          Open Editor &amp; Edit
        </Button>
        <div className={cn(WS_GLASS_CARD, "mt-4 p-4")}>
          <p className="text-3xl font-bold text-[#1e3a5f]">{breakdown.overall}%</p>
          <p className="text-sm text-muted-foreground">Overall quality score</p>
          <div className="mt-4 space-y-2">
            <ScoreRow label="Educational" value={breakdown.educational} />
            <ScoreRow label="Print" value={breakdown.print} />
            <ScoreRow label="Visual" value={breakdown.visual} />
            <ScoreRow label="Question diversity" value={breakdown.diversity} />
            <ScoreRow label="Writing practice" value={breakdown.writingPractice} />
            <ScoreRow label="Age suitability" value={breakdown.ageSuitability} />
            <ScoreRow label="Bloom coverage" value={breakdown.bloomCoverage} />
          </div>
          {breakdown.improvements.length > 0 && (
            <div className="mt-4 border-t border-[#d4cfc4]/40 pt-3">
              <p className="text-xs font-bold uppercase tracking-wider text-amber-700">AI suggestions</p>
              <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                {breakdown.improvements.map((i) => <li key={i}>• {i}</li>)}
              </ul>
            </div>
          )}
        </div>
        <p className="mt-4 text-xs font-bold uppercase tracking-wider text-[#1e3a5f]/60">One-tap variants</p>
        <div className={cn(WS_CHIP_GRID, "mt-2 pb-6")}>
          {recs.map((rec) => (
            <Button
              key={rec.id}
              variant="outline"
              className="h-auto min-h-12 flex-col items-start rounded-xl px-3 py-2 text-left"
              onClick={() => { onRecommendation(rec); onOpenChange(false); }}
            >
              <span className="flex items-center gap-1 text-sm font-semibold text-[#1e3a5f]">
                <Sparkles className="h-3.5 w-3.5 text-[#c9a227]" /> {rec.label}
              </span>
              <span className="text-xs text-muted-foreground">{rec.description}</span>
            </Button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export type { WorksheetImproveAction };
