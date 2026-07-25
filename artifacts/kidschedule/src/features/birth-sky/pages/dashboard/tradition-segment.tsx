/**
 * Tradition segment (Pack 5) — labeled cultural layer only.
 */

import { useEffect, useId, useRef, useState } from "react";
import type { TraditionCardVM, TraditionSegmentVM } from "../../application/view-models/tradition-vm";
import { trackBirthSkyEvent } from "../../lib/analytics";
import { Button } from "@/components/ui/button";
import { BirthSkyTraditionIntroSheet } from "./tradition-intro-sheet";
import { cn } from "@/lib/utils";

type Props = {
  vm: TraditionSegmentVM;
  loading: boolean;
  needsIntro: boolean;
  reducedMotion: boolean;
  onAcceptIntro: () => void;
  onAstronomyOnly: () => void;
  onAddTime: () => void;
  onReflectOnCard: (cardId: string) => void;
  onAskAmyAboutCard: (cardId: string) => void;
};

export function BirthSkyTraditionSegment({
  vm,
  loading,
  needsIntro,
  reducedMotion,
  onAcceptIntro,
  onAstronomyOnly,
  onAddTime,
  onReflectOnCard,
  onAskAmyAboutCard,
}: Props) {
  const [showMore, setShowMore] = useState(false);
  const [openCard, setOpenCard] = useState<TraditionCardVM | null>(null);
  const viewed = useRef(false);
  const detailTitleId = useId();

  useEffect(() => {
    if (needsIntro || loading || vm.status !== "ready" || viewed.current) return;
    viewed.current = true;
    trackBirthSkyEvent("birth_sky.traditional_segment_viewed", {
      mode: vm.mode,
      tradition_limited: vm.traditionLimited,
      traditionalContentVersion: vm.traditionalContentVersion,
    });
  }, [needsIntro, loading, vm.status, vm.mode, vm.traditionLimited, vm.traditionalContentVersion]);

  if (loading) {
    return (
      <div
        data-testid="birth-sky-tradition-loading"
        className="space-y-3"
        role="status"
        aria-live="polite"
      >
        <p className="text-sm text-[hsl(40_20%_96%/0.72)]">Loading traditional stories…</p>
      </div>
    );
  }

  if (needsIntro) {
    return (
      <>
        <div
          data-testid="birth-sky-tradition-gated"
          className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-6 text-sm text-[hsl(40_20%_96%/0.72)]"
        >
          Traditional stories open after a short introduction.
        </div>
        <BirthSkyTraditionIntroSheet
          reducedMotion={reducedMotion}
          onAccept={onAcceptIntro}
          onAstronomyOnly={onAstronomyOnly}
        />
      </>
    );
  }

  if (vm.status === "error") {
    return (
      <div data-testid="birth-sky-tradition-error" role="alert" className="space-y-3">
        <p className="text-sm text-[hsl(40_20%_96%/0.82)]">
          {vm.errorMessage ?? "Traditional stories unavailable."}
        </p>
      </div>
    );
  }

  if (vm.status === "empty_hidden") {
    return (
      <div
        data-testid="birth-sky-tradition-hidden"
        className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-6 text-sm text-[hsl(40_20%_96%/0.78)]"
      >
        {vm.disclaimer}
      </div>
    );
  }

  const cards = showMore ? [...vm.visibleCards, ...vm.moreCards] : vm.visibleCards;

  return (
    <div data-testid="birth-sky-tradition-segment" className="space-y-4">
      <p
        tabIndex={-1}
        data-testid="birth-sky-tradition-disclaimer"
        className="rounded-xl border border-[hsl(12_40%_55%/0.35)] bg-[hsl(12_30%_18%/0.45)] px-3 py-2 text-sm leading-relaxed text-[hsl(40_20%_96%/0.88)]"
      >
        {vm.disclaimer}
      </p>

      {vm.daySkyNote ? (
        <p className="text-sm text-[hsl(40_20%_96%/0.72)]" data-testid="birth-sky-tradition-day-sky">
          {vm.daySkyNote}
        </p>
      ) : null}

      <p className="text-xs text-[hsl(40_20%_96%/0.5)]" data-testid="birth-sky-tradition-version">
        {vm.traditionalContentVersion}
        {" · "}
        snapshot {vm.snapshotVersion}
      </p>

      <div className="space-y-2">
        {cards.map((card) => (
          <button
            key={card.id}
            type="button"
            className={cn(
              "w-full rounded-xl border border-[hsl(12_40%_55%/0.28)] bg-[hsl(12_24%_16%/0.55)] px-4 py-3 text-left",
              card.locked && "opacity-70",
            )}
            aria-label={`Traditional lens: ${card.title}`}
            onClick={() => {
              trackBirthSkyEvent("birth_sky.traditional_card_opened", {
                card_id: card.id,
                card_category: card.category,
                mode: vm.mode,
              });
              setOpenCard(card);
            }}
            data-testid={`birth-sky-tradition-card-${card.id}`}
          >
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[hsl(12_45%_72%)]">
              {card.eyebrow}
              {card.locked ? " · Needs birth time" : ""}
            </p>
            <p className="mt-1 text-sm font-semibold text-[hsl(40_20%_96%)]">{card.title}</p>
            <p className="mt-1 text-sm text-[hsl(40_20%_96%/0.72)]">{card.summary}</p>
          </button>
        ))}
      </div>

      {!showMore && vm.moreCards.length > 0 ? (
        <Button
          type="button"
          variant="secondary"
          className="min-h-11 w-full rounded-xl"
          onClick={() => setShowMore(true)}
          data-testid="birth-sky-tradition-more"
        >
          More stories
        </Button>
      ) : null}

      {openCard ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={detailTitleId}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-4 sm:items-center"
          data-testid="birth-sky-tradition-detail"
        >
          <div
            className={cn(
              "max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-[hsl(12_40%_55%/0.35)] bg-[hsl(220_28%_12%)] p-5",
              !reducedMotion && "animate-in fade-in duration-200",
            )}
          >
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[hsl(12_45%_72%)]">
              In tradition
            </p>
            <h3 id={detailTitleId} className="mt-2 text-lg font-semibold">
              {openCard.title}
            </h3>
            {openCard.locked ? (
              <div className="mt-3 space-y-3 text-sm text-[hsl(40_20%_96%/0.78)]">
                <p>{openCard.lockHint}</p>
                <Button
                  type="button"
                  className="min-h-11 rounded-xl"
                  onClick={onAddTime}
                  data-testid="birth-sky-tradition-add-time"
                >
                  Add birth time
                </Button>
              </div>
            ) : (
              <div className="mt-3 space-y-3 text-sm leading-relaxed text-[hsl(40_20%_96%/0.82)]">
                <p>{openCard.story}</p>
                <p className="text-xs text-[hsl(40_20%_96%/0.5)]">{openCard.sourceTag}</p>
                <p className="text-xs text-[hsl(40_20%_96%/0.55)]">
                  Traditional interpretation — not science, and not a prediction.
                </p>
              </div>
            )}
            <div className="mt-5 flex flex-col gap-2">
              {!openCard.locked ? (
                <>
                  <Button
                    type="button"
                    variant="secondary"
                    className="min-h-11 rounded-xl"
                    onClick={() => {
                      onReflectOnCard(openCard.id);
                      setOpenCard(null);
                    }}
                    data-testid="birth-sky-tradition-reflect"
                  >
                    Reflect on this
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="min-h-11 rounded-xl"
                    onClick={() => {
                      onAskAmyAboutCard(openCard.id);
                      setOpenCard(null);
                    }}
                    data-testid="birth-sky-tradition-ask-amy"
                  >
                    Ask Amy about this
                  </Button>
                </>
              ) : null}
              <Button
                type="button"
                className="min-h-11 rounded-xl"
                onClick={() => setOpenCard(null)}
                data-testid="birth-sky-tradition-detail-close"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
