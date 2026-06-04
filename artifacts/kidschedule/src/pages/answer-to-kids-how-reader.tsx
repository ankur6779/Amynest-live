import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAppNavigate } from "@/components/app-link";
import { KidsHowPdfViewer } from "@/components/kids-how/kids-how-pdf-viewer";
import { usePageBackHandler } from "@/hooks/use-page-back-handler";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import {
  getKidsHowBook,
  kidsHowPreviewApiPath,
} from "@/lib/kids-how-books";
import { getKidsHowLastPage } from "@/lib/kids-how-reading-progress";
import {
  trackKidsHowBookOpened,
  trackKidsHowReadingEnded,
} from "@/lib/kids-how-analytics";
import { PARENT_HUB_PAGE } from "@/lib/parent-hub-premium";
import { cn } from "@/lib/utils";

export default function AnswerToKidsHowReaderPage() {
  const { t } = useTranslation();
  const { bookId = "" } = useParams<{ bookId: string }>();
  const { back, navigate } = useAppNavigate();
  const authFetch = useAuthFetch();
  const book = getKidsHowBook(bookId);

  const { data: preview, isLoading, isError } = useQuery({
    queryKey: ["kids-how-preview", bookId],
    enabled: Boolean(book),
    queryFn: async () => {
      const res = await authFetch(kidsHowPreviewApiPath(bookId));
      if (!res.ok) throw new Error("preview_failed");
      return res.json() as Promise<{ url: string }>;
    },
    staleTime: 25 * 60 * 1000,
  });

  usePageBackHandler(() => {
    back("answer-to-kids-how-reader-back");
    return true;
  }, [back]);

  useEffect(() => {
    if (!book) return;
    trackKidsHowBookOpened(book.id, book.category);
    return () => {
      trackKidsHowReadingEnded(book.id, book.category, getKidsHowLastPage(book.id));
    };
  }, [book]);

  if (!book) {
    return (
      <div className={cn(PARENT_HUB_PAGE, "min-h-screen bg-background p-6")}>
        <p className="text-sm text-muted-foreground">Book not found.</p>
        <button
          type="button"
          className="mt-4 text-sm font-semibold text-primary"
          onClick={() => navigate("/answer-to-kids-how", { source: "kids-how-missing" })}
        >
          Back to library
        </button>
      </div>
    );
  }

  return (
    <div className={cn(PARENT_HUB_PAGE, "min-h-screen bg-background pb-6")}>
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/90 px-4 py-3 backdrop-blur">
        <button
          type="button"
          onClick={() => back("answer-to-kids-how-reader-back")}
          className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          {t("parent_hub.web_tiles.answer-to-kids-how.title")}
        </button>
        <h1 className="mt-2 line-clamp-2 text-lg font-bold text-foreground">{book.title}</h1>
        <p className="text-xs text-muted-foreground">{book.category}</p>
      </header>

      <main className="mx-auto max-w-3xl px-4 pt-4 md:px-6">
        {isLoading || !preview?.url ? (
          <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
            <p className="text-sm">Opening book…</p>
          </div>
        ) : isError ? (
          <p className="p-8 text-center text-sm text-destructive">
            Couldn&apos;t load this book. Check your connection and try again.
          </p>
        ) : (
          <KidsHowPdfViewer
            bookId={book.id}
            url={preview.url}
            onPageChange={(page, _total) => {
              void page;
            }}
          />
        )}
      </main>
    </div>
  );
}
