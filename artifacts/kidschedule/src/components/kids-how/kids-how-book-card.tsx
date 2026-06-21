import { useEffect, useRef, useState } from "react";
import { BookOpen, Lock } from "lucide-react";
import { AppLink } from "@/components/app-link";
import { KidsHowBookCoverPreview } from "@/components/kids-how/kids-how-book-cover-preview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { openSubscriptionGate } from "@/lib/subscription-gate";
import { cn } from "@/lib/utils";
import type { LearningBook } from "@/lib/kids-how-books";
import { HUB_GLASS_CARD } from "@/lib/parent-hub-premium";

type KidsHowBookCardProps = {
  book: LearningBook;
  readHref: string;
  locked?: boolean;
  previewEnabled?: boolean;
};

export function KidsHowBookCard({
  book,
  readHref,
  locked = false,
  previewEnabled = true,
}: KidsHowBookCardProps) {
  const rootRef = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "120px 0px", threshold: 0.01 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const openPaywall = () => {
    openSubscriptionGate({ reason: "hub_locked", source: "kids_how_book_card" });
  };

  return (
    <article
      ref={rootRef}
      className={cn(
        HUB_GLASS_CARD,
        "flex h-full flex-col overflow-hidden transition-all duration-200",
        locked
          ? "opacity-90"
          : "hover:-translate-y-0.5 hover:shadow-[0_12px_36px_-12px_rgba(251,191,36,0.35)]",
      )}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-gradient-to-br from-amber-500/20 via-violet-500/15 to-cyan-500/10">
        {visible ? (
          <KidsHowBookCoverPreview
            bookId={book.id}
            title={book.title}
            enabled={visible && previewEnabled && !locked}
          />
        ) : (
          <div className="h-full w-full animate-pulse bg-white/5" />
        )}
        <Badge className="absolute left-3 top-3 border-0 bg-black/50 text-[10px] font-bold text-white backdrop-blur-md">
          {book.category}
        </Badge>
        {locked ? (
          <div className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/55 backdrop-blur-md">
            <Lock className="h-4 w-4 text-amber-200" aria-hidden />
          </div>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <h3 className="line-clamp-2 text-[15px] font-bold leading-snug text-foreground">
          {book.title}
        </h3>
        <p className="line-clamp-3 flex-1 text-xs leading-relaxed text-muted-foreground">
          {book.description}
        </p>
        {locked ? (
          <Button
            type="button"
            className="mt-auto w-full rounded-xl gap-2 text-sm font-semibold"
            onClick={openPaywall}
            data-testid={`kids-how-read-locked-${book.id}`}
          >
            <Lock className="h-4 w-4" aria-hidden />
            Unlock book
          </Button>
        ) : (
          <AppLink href={readHref} className="mt-auto block" source="kids-how-read">
            <Button
              className="w-full rounded-xl gap-2 text-sm font-semibold"
              data-testid={`kids-how-read-${book.id}`}
            >
              <BookOpen className="h-4 w-4" aria-hidden />
              Read Book
            </Button>
          </AppLink>
        )}
      </div>
    </article>
  );
}
