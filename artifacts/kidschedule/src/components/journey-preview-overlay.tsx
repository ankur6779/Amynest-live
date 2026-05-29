import { useTranslation } from "react-i18next";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { openSubscriptionGate } from "@/lib/subscription-gate";

/** CTA banner shown inside soft-locked hub tiles. */
export function JourneyUnlockCta({
  childName,
  isInfant = false,
}: {
  childName: string;
  isInfant?: boolean;
}) {
  const { t } = useTranslation();
  const jk = (base: string) =>
    isInfant ? `parent_hub.journey.infant.${base}` : `parent_hub.journey.${base}`;

  return (
    <div
      className="mt-3 rounded-xl border border-primary/30 bg-gradient-to-br from-primary/10 to-violet-500/5 p-4 text-center space-y-2"
      data-testid="journey-unlock-cta"
    >
      <p className="text-sm font-semibold text-foreground leading-snug">
        {t(jk("soft_lock_cta"), { name: childName })}
      </p>
      <Button
        size="sm"
        className="rounded-full gap-1.5"
        onClick={() =>
          openSubscriptionGate({ reason: "hub_journey", source: "journey_unlock_cta" })
        }
      >
        <Sparkles className="h-3.5 w-3.5" />
        {t("parent_hub.journey.continue_tomorrow_path")}
      </Button>
    </div>
  );
}

/** Blurred preview wrapper for hub section content when journey is locked. */
export function JourneyPreviewContent({
  childName,
  isInfant = false,
  children,
}: {
  childName: string;
  isInfant?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="relative" data-testid="journey-preview-content">
      <div
        className="relative max-h-[min(320px,50vh)] overflow-hidden pointer-events-none select-none"
        aria-hidden
      >
        <div className="blur-[4px] opacity-80 saturate-50 scale-[0.99] origin-top">
          {children}
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/30 to-background/95" />
      </div>
      <JourneyUnlockCta childName={childName} isInfant={isInfant} />
    </div>
  );
}
