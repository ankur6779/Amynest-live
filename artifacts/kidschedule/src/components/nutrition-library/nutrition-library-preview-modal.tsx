import { X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { NutritionLibraryPdfViewer } from "@/components/nutrition-library/nutrition-library-pdf-viewer";

type NutritionLibraryPreviewModalProps = {
  open: boolean;
  title: string;
  previewUrl: string | null;
  loading?: boolean;
  onClose: () => void;
};

export function NutritionLibraryPreviewModal({
  open,
  title,
  previewUrl,
  loading,
  onClose,
}: NutritionLibraryPreviewModalProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="flex max-h-[95vh] w-[min(100vw-1rem,56rem)] max-w-none flex-col gap-0 overflow-hidden border-emerald-400/25 bg-background p-0">
        <DialogHeader className="flex flex-row items-center justify-between gap-2 border-b border-emerald-400/15 px-4 py-3">
          <DialogTitle className="line-clamp-2 pr-8 text-base font-bold text-foreground">
            {title}
          </DialogTitle>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-3 top-3 h-9 w-9 shrink-0 rounded-xl"
            onClick={onClose}
            aria-label="Close preview"
          >
            <X className="h-5 w-5" />
          </Button>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-hidden p-3 sm:p-4">
          {loading || !previewUrl ? (
            <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
              Preparing preview…
            </div>
          ) : (
            <NutritionLibraryPdfViewer url={previewUrl} title={title} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
