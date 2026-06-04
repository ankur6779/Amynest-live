import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";
import { useParams } from "wouter";
import { useAppNavigate } from "@/components/app-link";
import { KidsHowPdfViewer } from "@/components/kids-how/kids-how-pdf-viewer";
import { usePageBackHandler } from "@/hooks/use-page-back-handler";
import {
  getKidsHowBook,
  resolveKidsHowPdfUrl,
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
  const book = getKidsHowBook(bookId);

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

  const pdfUrl = resolveKidsHowPdfUrl(book.gcsPath);

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
        <KidsHowPdfViewer
          bookId={book.id}
          url={pdfUrl}
          onPageChange={(page, _total) => {
            /* duration tracked on unmount; page persisted in viewer */
            void page;
          }}
        />
      </main>
    </div>
  );
}
