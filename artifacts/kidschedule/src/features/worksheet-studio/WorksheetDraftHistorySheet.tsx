import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { WorksheetDraftVersion } from "@workspace/worksheet-studio";
import { History, RotateCcw } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  versions: WorksheetDraftVersion[];
  onRestore: (version: WorksheetDraftVersion) => void;
  loading?: boolean;
};

export function WorksheetDraftHistorySheet({ open, onOpenChange, versions, onRestore, loading }: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[70dvh] rounded-t-3xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 text-left">
            <History className="h-5 w-5" aria-hidden /> Version history
          </SheetTitle>
        </SheetHeader>
        <ul className="mt-4 space-y-2 overflow-y-auto">
          {loading && (
            <li className="py-8 text-center text-sm text-muted-foreground" role="status">Loading versions…</li>
          )}
          {!loading && versions.length === 0 && (
            <li className="py-8 text-center text-sm text-muted-foreground">No saved versions yet</li>
          )}
          {versions.map((v) => (
            <li key={v.id} className="flex items-center justify-between rounded-xl border bg-card px-4 py-3">
              <div>
                <p className="text-sm font-medium">{v.label}</p>
                <p className="text-xs text-muted-foreground">{format(new Date(v.savedAt), "MMM d, h:mm a")}</p>
              </div>
              <Button size="sm" variant="outline" className="h-10 touch-manipulation" onClick={() => { onRestore(v); onOpenChange(false); }}>
                <RotateCcw className="mr-1 h-3.5 w-3.5" /> Restore
              </Button>
            </li>
          ))}
        </ul>
      </SheetContent>
    </Sheet>
  );
}
