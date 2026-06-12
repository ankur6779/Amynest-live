import { ArrowLeft, Music } from "lucide-react";
import { useAppNavigate } from "@/components/app-link";
import { usePageBackHandler } from "@/hooks/use-page-back-handler";
import { InfantSleepTracks } from "@/components/infant-sleep-tracks";

/** Nursery rhymes & lullabies — GCS catalog surfaced at /rhymes for deep links and cert. */
export default function RhymesPage() {
  const { back } = useAppNavigate();
  usePageBackHandler(() => {
    back("rhymes-back");
    return true;
  }, [back]);

  return (
    <div className="min-h-full pb-10 bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur px-4 py-3">
        <div className="mx-auto flex max-w-4xl items-center gap-3">
          <button
            type="button"
            onClick={() => back("rhymes-back")}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <Music className="h-5 w-5 text-primary shrink-0" />
            <div className="min-w-0">
              <h1 className="font-quicksand text-lg font-bold text-foreground truncate">
                Rhymes & Lullabies
              </h1>
              <p className="text-xs text-muted-foreground truncate">
                Tap a rhyme to listen
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 pt-4" data-testid="rhymes-page">
        <InfantSleepTracks
          category="lullaby"
          headerTitle="Rhymes & Lullabies"
          headerBlurb="Classic nursery rhymes and soothing lullabies for little listeners."
          tileTestIdPrefix="rhyme-tile"
        />
      </main>
    </div>
  );
}
