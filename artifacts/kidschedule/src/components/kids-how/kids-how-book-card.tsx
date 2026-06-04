import { useEffect, useRef, useState } from "react";
import { BookOpen, HelpCircle } from "lucide-react";
import { AppLink } from "@/components/app-link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { LearningBook } from "@/lib/kids-how-books";
import { HUB_GLASS_CARD } from "@/lib/parent-hub-premium";

type KidsHowBookCardProps = {
  book: LearningBook;
  readHref: string;
};

export function KidsHowBookCard({ book, readHref }: KidsHowBookCardProps) {
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

  return (
    <article
      ref={rootRef}
      className={cn(
        HUB_GLASS_CARD,
        "flex h-full flex-col overflow-hidden transition-all duration-200",
        "hover:-translate-y-0.5 hover:shadow-[0_12px_36px_-12px_rgba(251,191,36,0.35)]",
      )}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-gradient-to-br from-amber-500/20 via-violet-500/15 to-cyan-500/10">
        {visible && book.coverImage ? (
          <img
            src={book.coverImage}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20">
              <HelpCircle className="h-7 w-7 text-amber-200" aria-hidden />
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Visual learning
            </p>
          </div>
        )}
        <Badge className="absolute left-3 top-3 border-0 bg-black/50 text-[10px] font-bold text-white backdrop-blur-md">
          {book.category}
        </Badge>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <h3 className="line-clamp-2 text-[15px] font-bold leading-snug text-foreground">
          {book.title}
        </h3>
        <p className="line-clamp-3 flex-1 text-xs leading-relaxed text-muted-foreground">
          {book.description}
        </p>
        <AppLink href={readHref} className="mt-auto block" source="kids-how-read">
          <Button
            className="w-full rounded-xl gap-2 text-sm font-semibold"
            data-testid={`kids-how-read-${book.id}`}
          >
            <BookOpen className="h-4 w-4" aria-hidden />
            Read Book
          </Button>
        </AppLink>
      </div>
    </article>
  );
}
