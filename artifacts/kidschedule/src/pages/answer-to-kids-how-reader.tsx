import { parseApiJson } from "@/lib/safe-json-response";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Loader2, Lock } from "lucide-react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAppNavigate } from "@/components/app-link";
import { JourneyPreviewContent } from "@/components/journey-preview-overlay";
import { KidsHowPdfViewer } from "@/components/kids-how/kids-how-pdf-viewer";
import { LockedBlock } from "@/components/locked-block";
import { Button } from "@/components/ui/button";
import { useHubModuleGate } from "@/hooks/use-hub-module-gate";
import { usePageBackHandler } from "@/hooks/use-page-back-handler";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { useSubscription } from "@/hooks/use-subscription";
import { useAuth } from "@/lib/firebase-auth-hooks";
import {
  getKidsHowBook,
  kidsHowPreviewApiPath,
} from "@/lib/kids-how-books";
import { getKidsHowLastPage } from "@/lib/kids-how-reading-progress";
import {
  trackKidsHowBookOpened,
  trackKidsHowReadingEnded,
} from "@/lib/kids-how-analytics";
import {
  canOpenKidsHowBook,
  KIDS_HOW_HUB_FEATURE,
  markKidsHowBookOpened,
} from "@/lib/kids-how-pdf-access";
import { openSubscriptionGate } from "@/lib/subscription-gate";
import { PARENT_HUB_PAGE } from "@/lib/parent-hub-premium";
import { cn } from "@/lib/utils";

export default function AnswerToKidsHowReaderPage() {
  const { t } = useTranslation();
  const { bookId = "" } = useParams<{ bookId: string }>();
  const { back, navigate } = useAppNavigate();
  const authFetch = useAuthFetch();
  const { userId } = useAuth();
  const { isPremium } = useSubscription();
  const hubGate = useHubModuleGate(KIDS_HOW_HUB_FEATURE);
  const book = getKidsHowBook(bookId);

  const pdfAllowed = book ? canOpenKidsHowBook(book.id, userId, isPremium) : false;
  const hubBlocked = hubGate.locked || hubGate.journeySoft;

  const { data: preview, isLoading, isError } = useQuery({
    queryKey: ["kids-how-preview", bookId],
    enabled: Boolean(book) && pdfAllowed && !hubBlocked,
    queryFn: async () => {
      const res = await authFetch(kidsHowPreviewApiPath(bookId));
      if (!res.ok) throw new Error("preview_failed");
      return parseApiJson(res) as Promise<{ url: string }>;
    },
    staleTime: 25 * 60 * 1000,
  });

  usePageBackHandler(() => {
    back("answer-to-kids-how-reader-back");
    return true;
  }, [back]);

  useEffect(() => {
    if (!book || !pdfAllowed || hubBlocked) return;
    if (userId) markKidsHowBookOpened(book.id, userId);
    trackKidsHowBookOpened(book.id, book.category);
    return () => {
      trackKidsHowReadingEnded(book.id, book.category, getKidsHowLastPage(book.id));
    };
  }, [book, pdfAllowed, hubBlocked, userId]);

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

  const openPaywall = () => {
    openSubscriptionGate({
      reason: hubBlocked ? "hub_journey" : "hub_locked",
      source: "kids_how_reader",
    });
  };

  const readerBody = (
    <>
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
        {!pdfAllowed ? (
          <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/15 ring-1 ring-amber-400/30">
              <Lock className="h-8 w-8 text-amber-300" aria-hidden />
            </div>
            <p className="text-sm text-muted-foreground">
              {t("parent_hub.web_tiles.answer-to-kids-how.book_locked")}
            </p>
            <Button className="rounded-xl" onClick={openPaywall}>
              {t("parent_hub.badges.premium_feature")}
            </Button>
          </div>
        ) : isLoading || !preview?.url ? (
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
    </>
  );

  return (
    <div
      className={cn(PARENT_HUB_PAGE, "min-h-screen bg-background pb-6")}
      onPointerDownCapture={() => hubGate.onEngage()}
      onKeyDownCapture={(e) => {
        if (e.key === "Enter" || e.key === " ") hubGate.onEngage();
      }}
    >
      {hubGate.journeySoft ? (
        <JourneyPreviewContent childName={hubGate.childName ?? "your child"}>
          {readerBody}
        </JourneyPreviewContent>
      ) : (
        <LockedBlock locked={hubGate.locked} reason="hub_journey" journeySoft={hubGate.journeySoft}>
          {readerBody}
        </LockedBlock>
      )}
    </div>
  );
}
