import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { DocumentChangeSummary } from "@workspace/worksheet-studio";
import { WS_PRIMARY_BTN, WS_MUTED_TEXT, WS_DIALOG } from "./worksheet-studio-theme";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  summary: DocumentChangeSummary | null;
  editSummary: string;
  onAccept: () => void;
  onReject: () => void;
};

export function CopilotChangePreview({
  open, onOpenChange, summary, editSummary, onAccept, onReject,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(WS_DIALOG)}>
        <DialogHeader>
          <DialogTitle className="text-[#1e3a5f]">Review AI Edit</DialogTitle>
          <DialogDescription className={WS_MUTED_TEXT}>
            Current → Proposed. Accept to apply, or Reject to keep the worksheet unchanged.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 rounded-xl border border-[#d4cfc4]/50 bg-[#faf8f5] p-4 text-sm">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Current</p>
            <p className="mt-1 text-[#1e3a5f]/70">Worksheet stays as-is until you accept.</p>
          </div>
          <div className="flex justify-center text-muted-foreground" aria-hidden>↓</div>
          <div className="border-t border-[#d4cfc4]/40 pt-3">
            <p className="text-xs font-bold uppercase tracking-wider text-[#c9a227]">Proposed</p>
            <p className="mt-1 font-medium text-[#1e3a5f]">{editSummary}</p>
            {summary?.highlights.map((h) => (
              <p key={h} className="mt-1 text-xs text-emerald-700">• {h}</p>
            ))}
          </div>
        </div>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button className={cn(WS_PRIMARY_BTN, "w-full")} onClick={onAccept}>Accept</Button>
          <Button variant="ghost" className="w-full" onClick={onReject}>Reject</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
