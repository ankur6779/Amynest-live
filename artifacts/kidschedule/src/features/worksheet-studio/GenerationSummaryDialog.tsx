import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { GenerationSummary } from "@workspace/worksheet-studio";
import { Sparkles } from "lucide-react";
import { WS_PRIMARY_BTN, WS_MUTED_TEXT, WS_DIALOG } from "./worksheet-studio-theme";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  summary: GenerationSummary | null;
  onConfirm: () => void;
  loading?: boolean;
  answerKey?: boolean;
};

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className={WS_MUTED_TEXT}>{label}</span>
      <span className="font-semibold text-[#1e3a5f]">{value}</span>
    </div>
  );
}

export function GenerationSummaryDialog({
  open, onOpenChange, summary, onConfirm, loading, answerKey,
}: Props) {
  if (!summary) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(WS_DIALOG)}>
        <DialogHeader>
          <DialogTitle className="text-[#1e3a5f]">Ready to generate</DialogTitle>
          <DialogDescription className={WS_MUTED_TEXT}>
            Review your worksheet request, then tap Generate.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2.5 rounded-xl border border-[#d4cfc4]/50 bg-[#faf8f5] p-4">
          <Row label="Class" value={summary.classLabel} />
          <Row label="Subject" value={summary.subjectLabel} />
          <Row label="Pages" value={summary.pages} />
          <Row label="Language" value={summary.languageLabel} />
          <Row label="Reference files" value={summary.referenceFiles} />
          {summary.imagesFound > 0 && <Row label="Images found" value={summary.imagesFound} />}
          <Row label="Prompt quality" value={summary.promptQuality} />
          <Row label="Quality estimate" value={`${summary.qualityEstimate}%`} />
        </div>
        <p className={cn("max-h-24 overflow-y-auto text-xs leading-relaxed", WS_MUTED_TEXT)}>
          {summary.effectivePrompt.slice(0, 280)}
          {summary.effectivePrompt.length > 280 ? "…" : ""}
        </p>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button className={cn(WS_PRIMARY_BTN, "w-full")} disabled={loading} onClick={onConfirm}>
            {loading ? "Generating…" : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                {answerKey ? "Generate Answer Key" : "Generate Worksheet"}
              </>
            )}
          </Button>
          <Button variant="ghost" className="w-full" onClick={() => onOpenChange(false)}>
            Edit prompt
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
