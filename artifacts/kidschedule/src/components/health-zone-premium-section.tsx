import type { ReactNode } from "react";
import { useState } from "react";
import { Shield, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { HubPremiumFeatureCard } from "@/components/hub-premium-feature-card";
import { InfantExplorePreviewBanner } from "@/components/infant-explore-preview-banner";
import { JourneyPreviewContent } from "@/components/journey-preview-overlay";
import { useHubSectionPoints, useInfantDiscoveryPreview } from "@/lib/hub-render-context";
import {
  HEALTH_ZONE_CARD_VISUALS,
  HEALTH_ZONE_HUB_SECTION_MAP,
  type HealthZoneCardId,
} from "@/lib/health-zone-card-config";
import { HUB_EXPANDED_CONTENT, HUB_FEATURE_TILE_PREVIEW } from "@/lib/parent-hub-premium";
import { cn } from "@/lib/utils";

type HealthZonePremiumSectionProps = {
  id: string;
  title: string;
  description: string;
  defaultOpen?: boolean;
  tryFree?: boolean;
  preview?: string;
  previewLocked?: boolean;
  childName?: string;
  isInfant?: boolean;
  onOpen?: () => void;
  children: ReactNode;
};

function WhoBackedBadge() {
  const { t } = useTranslation();
  return (
    <span
      className={cn(
        "mt-2 inline-flex max-w-full items-center gap-1.5 rounded-full border border-amber-300/30",
        "bg-gradient-to-r from-amber-500/25 via-yellow-500/20 to-amber-600/25 px-2.5 py-1",
        "text-[9px] font-bold text-amber-100/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] backdrop-blur-md sm:text-[10px]",
      )}
    >
      <Shield className="h-3 w-3 shrink-0 text-amber-200" strokeWidth={2.25} />
      <span className="truncate">{t("parent_hub.health_zone_cards.nutrition.who_badge")}</span>
    </span>
  );
}

/** Premium expandable hub section for Health Zone tiles. */
export function HealthZonePremiumSection({
  id,
  title,
  description,
  defaultOpen = false,
  tryFree = false,
  preview,
  previewLocked = false,
  childName,
  isInfant = false,
  onOpen,
  children,
}: HealthZonePremiumSectionProps) {
  const discoveryPreview = useInfantDiscoveryPreview();
  const awardSectionPoints = useHubSectionPoints();
  const [open, setOpen] = useState(defaultOpen);
  const cardKey = HEALTH_ZONE_HUB_SECTION_MAP[id] as Exclude<HealthZoneCardId, "section-header"> | undefined;
  const visual = cardKey ? HEALTH_ZONE_CARD_VISUALS[cardKey] : undefined;

  if (!visual) return null;

  const showWhoBadge = id === "nutrition";
  const toggle = () => {
    setOpen((v) => {
      const next = !v;
      if (next) {
        onOpen?.();
        awardSectionPoints(id);
      }
      return next;
    });
  };

  return (
    <div data-section-id={id} className="h-full">
      <button
        type="button"
        onClick={toggle}
        className="block w-full text-left active:scale-[0.985] transition-transform"
        aria-expanded={open}
      >
        <HubPremiumFeatureCard
          visual={visual}
          title={title}
          description={description}
          tryFree={tryFree}
          showTryFreeBadge={!discoveryPreview}
          actionMode="expand"
          expanded={open}
          footer={
            <>
              {showWhoBadge ? <WhoBackedBadge /> : null}
              {!open && preview ? (
                <div className={cn(HUB_FEATURE_TILE_PREVIEW, "mt-2 px-0")}>
                  <p className="text-[11px] font-medium text-amber-200/80 line-clamp-1 flex items-center gap-1 min-w-0">
                    <Sparkles className="h-3 w-3 shrink-0 opacity-80 hub-sparkle-glow" />
                    {preview}
                  </p>
                </div>
              ) : !open && !showWhoBadge ? (
                <span className="invisible mt-2 block text-[11px]" aria-hidden>
                  .
                </span>
              ) : null}
            </>
          }
        />
      </button>
      {open ? (
        <div
          className={cn(
            HUB_EXPANDED_CONTENT,
            "mt-3 rounded-[24px] border border-white/[0.08] bg-[rgba(12,18,40,0.55)] backdrop-blur-md",
            "animate-in fade-in slide-in-from-top-1 duration-200",
          )}
        >
          {discoveryPreview ? <InfantExplorePreviewBanner className="mb-3" /> : null}
          {previewLocked && !discoveryPreview && childName ? (
            <JourneyPreviewContent childName={childName} isInfant={isInfant}>
              {children}
            </JourneyPreviewContent>
          ) : (
            children
          )}
        </div>
      ) : null}
    </div>
  );
}
