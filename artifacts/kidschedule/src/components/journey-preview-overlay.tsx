import { useTranslation } from "react-i18next";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { openSubscriptionGate } from "@/lib/subscription-gate";
import { PREMIUM_VOICE } from "@/lib/amynest-philosophy";
import { useParentHubQuietModule } from "@/lib/parent-hub/quiet-module-context";

/** CTA banner shown inside soft-locked hub tiles. */
export function JourneyUnlockCta({
  childName,
  isInfant = false,
}: {
  childName: string;
  isInfant?: boolean;
}) {
  const { t } = useTranslation();
  const quietRoom = useParentHubQuietModule();
  const jk = (base: string) =>
    isInfant ? `parent_hub.journey.infant.${base}` : `parent_hub.journey.${base}`;

  // Pack 5 — room destinations invite continuity, never "unlock journey" theatre.
  if (quietRoom) {
    return (
      <div
        className="ph-continuity-invite mt-3 rounded-xl border border-[rgba(232,212,184,0.22)] bg-[rgba(8,6,12,0.42)] p-4 text-center space-y-2"
        data-testid="journey-unlock-cta"
        data-ph-continuity="true"
      >
        <p className="text-sm font-semibold text-[rgba(244,238,230,0.92)] leading-snug">
          {PREMIUM_VOICE.invitation}
        </p>
        <Button
          size="sm"
          className="rounded-full gap-1.5 bg-[rgba(232,212,184,0.16)] text-[rgba(244,238,230,0.95)] border border-[rgba(232,212,184,0.28)] hover:bg-[rgba(232,212,184,0.24)]"
          onClick={() =>
            openSubscriptionGate({
              reason: "hub_journey",
              source: "journey_continuity_quiet_room",
            })
          }
        >
          {PREMIUM_VOICE.continueCta}
        </Button>
      </div>
    );
  }

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
