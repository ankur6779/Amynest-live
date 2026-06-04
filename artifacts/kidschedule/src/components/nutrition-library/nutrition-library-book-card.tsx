import { BookOpen, Download, Eye, Lock, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { HUB_GLASS_CARD } from "@/lib/parent-hub-premium";
import type { NutritionLibraryBookItem } from "@/lib/nutrition-library-types";

type NutritionLibraryBookCardProps = {
  book: NutritionLibraryBookItem;
  isPremium: boolean;
  onPreview: () => void;
  onDownload: () => void;
  downloading?: boolean;
};

export function NutritionLibraryBookCard({
  book,
  isPremium,
  onPreview,
  onDownload,
  downloading,
}: NutritionLibraryBookCardProps) {
  return (
    <article
      className={cn(
        HUB_GLASS_CARD,
        "flex h-full flex-col overflow-hidden transition-all duration-200",
        "hover:-translate-y-0.5 hover:border-emerald-400/30 hover:shadow-[0_12px_36px_-12px_rgba(52,211,153,0.35)]",
      )}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-gradient-to-br from-emerald-500/20 via-teal-500/15 to-cyan-500/10">
        <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-emerald-400/25 shadow-[0_0_20px_rgba(52,211,153,0.2)]">
            <BookOpen className="h-7 w-7 text-emerald-200" aria-hidden />
          </div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-200/80">
            PDF Guide
          </p>
        </div>
        <Badge className="absolute left-3 top-3 border-0 bg-black/50 text-[10px] font-bold text-white backdrop-blur-md">
          {book.category}
        </Badge>
        {!isPremium && (
          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full border border-amber-400/40 bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-200 shadow-[0_0_12px_rgba(251,191,36,0.35)]">
            <Sparkles className="h-3 w-3" aria-hidden />
            Premium
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <h3 className="line-clamp-2 text-[15px] font-bold leading-snug text-foreground">
          {book.title}
        </h3>
        <p className="text-xs font-medium text-muted-foreground">{book.sizeLabel}</p>

        <div className="mt-auto flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            className="flex-1 rounded-xl gap-2 border-emerald-400/25 text-sm font-semibold"
            onClick={onPreview}
            data-testid={`nutrition-library-preview-${book.id}`}
          >
            <Eye className="h-4 w-4" aria-hidden />
            Preview
          </Button>
          <Button
            type="button"
            className={cn(
              "flex-1 rounded-xl gap-2 text-sm font-semibold",
              isPremium
                ? "bg-emerald-600 hover:bg-emerald-500"
                : "border border-amber-400/30 bg-amber-500/10 text-amber-100 hover:bg-amber-500/20",
            )}
            variant={isPremium ? "default" : "outline"}
            onClick={onDownload}
            disabled={downloading}
            data-testid={`nutrition-library-download-${book.id}`}
          >
            {isPremium ? (
              <>
                <Download className="h-4 w-4" aria-hidden />
                {downloading ? "Downloading…" : "? Download PDF"}
              </>
            ) : (
              <>
                <Lock className="h-4 w-4" aria-hidden />
                ?? Premium Required
              </>
            )}
          </Button>
        </div>
      </div>
    </article>
  );
}
