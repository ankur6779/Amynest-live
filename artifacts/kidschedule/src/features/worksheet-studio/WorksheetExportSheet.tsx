import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { PRINT_MODE_LABELS, type PrintMode } from "@workspace/worksheet-studio";
import { Loader2, Printer, Share2 } from "lucide-react";
import { toast } from "sonner";

const PRINT_MODES = Object.keys(PRINT_MODE_LABELS) as PrintMode[];

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  printMode: PrintMode;
  onPrintModeChange: (mode: PrintMode) => void;
  onPdf: () => Promise<void>;
  onAnswerKey?: () => Promise<void>;
  onDocx: () => Promise<void>;
  onPng: () => Promise<void>;
  onJpeg: () => Promise<void>;
  onPrint: () => void;
  onShare: () => Promise<void>;
  busy: boolean;
  progress?: number;
};

export function WorksheetExportSheet({
  open, onOpenChange, printMode, onPrintModeChange, onPdf, onAnswerKey, onDocx, onPng, onJpeg, onPrint, onShare, busy, progress = 0,
}: Props) {
  const run = (fn: () => Promise<void>, label: string) => () => {
    void fn()
      .then(() => onOpenChange(false))
      .catch(() => {
        toast.error(`${label} export failed`, { description: "Please try again. Your worksheet is still saved." });
      });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl pb-[max(env(safe-area-inset-bottom),1rem)]">
        <SheetHeader>
          <SheetTitle className="text-left text-lg font-bold text-[#1e3a5f]">Export worksheet</SheetTitle>
        </SheetHeader>
        <p className="text-sm text-muted-foreground">Print-validated · A4 · 300 DPI PDF</p>

        <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Print mode">
          {PRINT_MODES.map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => onPrintModeChange(mode)}
              aria-pressed={printMode === mode}
              aria-label={`Print mode: ${PRINT_MODE_LABELS[mode]}`}
              className={cn(
                "min-h-11 rounded-full px-3 py-2 text-xs font-medium touch-manipulation transition-colors",
                printMode === mode ? "bg-[#1e3a5f] text-white" : "bg-muted text-muted-foreground",
              )}
            >
              {PRINT_MODE_LABELS[mode]}
            </button>
          ))}
        </div>

        {busy && (
          <div className="mt-4 space-y-2" role="status" aria-live="polite">
            {progress > 0 ? (
              <>
                <Progress value={progress} className="h-2" aria-label="Export progress" />
                <p className="text-center text-xs text-muted-foreground">Exporting… {progress}%</p>
              </>
            ) : (
              <p className="text-center text-xs text-muted-foreground">Preparing export…</p>
            )}
          </div>
        )}

        <div className="mt-4 grid grid-cols-2 gap-3">
          {([["PDF", onPdf], ["DOCX", onDocx], ["PNG", onPng], ["JPEG", onJpeg]] as const).map(([label, handler]) => (
            <Button
              key={label}
              size="lg"
              variant="outline"
              className="h-14 rounded-2xl text-base font-semibold touch-manipulation"
              disabled={busy}
              onClick={run(handler, label)}
            >
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
              {label}
            </Button>
          ))}
          {onAnswerKey && (
            <Button
              size="lg"
              variant="outline"
              className="col-span-2 h-14 rounded-2xl text-base font-semibold touch-manipulation"
              disabled={busy}
              onClick={run(onAnswerKey, "Answer key")}
            >
              Answer Key PDF
            </Button>
          )}
          <Button size="lg" variant="secondary" className="h-14 rounded-2xl font-semibold touch-manipulation" disabled={busy} onClick={() => { onPrint(); onOpenChange(false); }}>
            <Printer className="mr-2 h-4 w-4" aria-hidden /> Print
          </Button>
          <Button size="lg" className="h-14 rounded-2xl font-semibold touch-manipulation" disabled={busy} onClick={run(onShare, "Share")}>
            <Share2 className="mr-2 h-4 w-4" aria-hidden /> Share
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
