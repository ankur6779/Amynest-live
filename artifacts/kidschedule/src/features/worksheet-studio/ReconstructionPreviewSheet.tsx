import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  CLASS_LABELS,
  RECONSTRUCTION_STYLE_LABELS,
  SUBJECT_LABELS,
  type ReconstructionAnalysis,
  type ReconstructionStyle,
  type WorksheetClass,
  type WorksheetSubject,
} from "@workspace/worksheet-studio";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { WS_DIALOG, WS_MUTED_TEXT, WS_OUTLINE_BTN, WS_PRIMARY_BTN, WS_TOUCH } from "./worksheet-studio-theme";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  analysis: ReconstructionAnalysis | null;
  analyzing: boolean;
  style: ReconstructionStyle;
  onStyleChange: (s: ReconstructionStyle) => void;
  classLevel: WorksheetClass;
  onClassChange: (c: WorksheetClass) => void;
  subject: WorksheetSubject;
  onSubjectChange: (s: WorksheetSubject) => void;
  topic: string;
  onTopicChange: (t: string) => void;
  onConfirm: () => void;
  loading: boolean;
};

const STYLES = Object.keys(RECONSTRUCTION_STYLE_LABELS) as ReconstructionStyle[];

export function ReconstructionPreviewSheet({
  open,
  onOpenChange,
  analysis,
  analyzing,
  style,
  onStyleChange,
  classLevel,
  onClassChange,
  subject,
  onSubjectChange,
  topic,
  onTopicChange,
  onConfirm,
  loading,
}: Props) {
  const confidence = analysis?.confidence ?? 0;
  const lowConfidence = confidence < 90;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(WS_DIALOG, "max-h-[90dvh] overflow-y-auto")}>
        <DialogHeader>
          <DialogTitle className="text-[#1e3a5f]">Smart Analysis</DialogTitle>
          <DialogDescription className={WS_MUTED_TEXT}>
            Review detected content before reconstruction. Edit values if needed.
          </DialogDescription>
        </DialogHeader>

        {analyzing ? (
          <div className="flex items-center justify-center gap-2 py-8 text-[#1e3a5f]">
            <Loader2 className="h-5 w-5 animate-spin" />
            Analyzing upload…
          </div>
        ) : analysis ? (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1">
                <span className={WS_MUTED_TEXT}>Class</span>
                <select
                  className="w-full rounded-lg border border-[#1e3a5f]/20 bg-white px-3 py-2 text-[#1e3a5f]"
                  value={classLevel}
                  onChange={(e) => onClassChange(e.target.value as WorksheetClass)}
                >
                  {Object.entries(CLASS_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </label>
              <label className="space-y-1">
                <span className={WS_MUTED_TEXT}>Subject</span>
                <select
                  className="w-full rounded-lg border border-[#1e3a5f]/20 bg-white px-3 py-2 text-[#1e3a5f]"
                  value={subject}
                  onChange={(e) => onSubjectChange(e.target.value as WorksheetSubject)}
                >
                  {Object.entries(SUBJECT_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </label>
            </div>
            <label className="block space-y-1">
              <span className={WS_MUTED_TEXT}>Topic</span>
              <input
                className="w-full rounded-lg border border-[#1e3a5f]/20 bg-white px-3 py-2 text-[#1e3a5f]"
                value={topic}
                onChange={(e) => onTopicChange(e.target.value)}
                placeholder="Detected topic"
              />
            </label>
            <div className="rounded-xl bg-[#1e3a5f]/5 p-3">
              <p className="font-medium text-[#1e3a5f]">Detected</p>
              <ul className={cn("mt-2 space-y-1", WS_MUTED_TEXT)}>
                <li>Activities: {analysis.activities.join(", ") || "—"}</li>
                <li>Questions: {analysis.questions.length}</li>
                <li>Images: {analysis.detectedImages.join(", ") || "—"}</li>
                <li>Pages: {analysis.pageCount}</li>
                <li>Confidence: {confidence}%</li>
              </ul>
            </div>
            {lowConfidence && (
              <div className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-900">
                <AlertTriangle className="h-5 w-5 shrink-0" />
                <div>
                  <p className="font-medium">Review uncertain areas</p>
                  <ul className="mt-1 list-disc pl-4 text-xs">
                    {analysis.uncertainAreas.map((a) => <li key={a}>{a}</li>)}
                  </ul>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <p className="font-medium text-[#1e3a5f]">Reconstruction style</p>
              <div className="flex flex-wrap gap-2">
                {STYLES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => onStyleChange(s)}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-xs font-medium touch-manipulation",
                      style === s
                        ? "bg-[#1e3a5f] text-white"
                        : "bg-[#1e3a5f]/10 text-[#1e3a5f]",
                    )}
                  >
                    {RECONSTRUCTION_STYLE_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <p className={cn("py-4 text-center", WS_MUTED_TEXT)}>Upload a worksheet to analyze.</p>
        )}

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button
            className={cn(WS_PRIMARY_BTN, WS_TOUCH, "w-full")}
            disabled={loading || analyzing || !analysis}
            onClick={onConfirm}
          >
            {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <CheckCircle2 className="mr-2 h-5 w-5" />}
            Reconstruct Worksheet
          </Button>
          <Button variant="outline" className={cn(WS_OUTLINE_BTN, "w-full")} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
