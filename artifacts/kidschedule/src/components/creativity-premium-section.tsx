import type { ReactNode } from "react";
import { useState } from "react";
import { Sparkles } from "lucide-react";
import { HubExpandedChildren } from "@/components/hub-expanded-children";
import { HubTileButton, hubTileAriaLabel } from "@/components/hub-tile-button";
import { HubPremiumFeatureCard } from "@/components/hub-premium-feature-card";
import { InfantExplorePreviewBanner } from "@/components/infant-explore-preview-banner";
import { JourneyPreviewContent } from "@/components/journey-preview-overlay";
import { useHubSectionPoints, useInfantDiscoveryPreview } from "@/lib/hub-render-context";
import {
  CREATIVITY_CARD_VISUALS,
  CREATIVITY_HUB_SECTION_MAP,
  type CreativityCardId,
} from "@/lib/creativity-card-config";
import { HUB_EXPANDED_CONTENT, HUB_FEATURE_TILE_PREVIEW } from "@/lib/parent-hub-premium";
import { cn } from "@/lib/utils";

type CreativityPremiumSectionProps = {
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

/** Premium expandable hub section for Creativity & Activities tiles. */
export function CreativityPremiumSection({
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
}: CreativityPremiumSectionProps) {
  const discoveryPreview = useInfantDiscoveryPreview();
  const awardSectionPoints = useHubSectionPoints();
  const [open, setOpen] = useState(defaultOpen);
  const cardKey = CREATIVITY_HUB_SECTION_MAP[id] as Exclude<CreativityCardId, "section-header"> | undefined;
  const visual = cardKey ? CREATIVITY_CARD_VISUALS[cardKey] : undefined;

  if (!visual) return null;

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
      <HubTileButton
        onClick={toggle}
        ariaLabel={hubTileAriaLabel(title, description, open)}
        ariaExpanded={open}
      >
        <HubPremiumFeatureCard
          visual={visual}
          title={title}
          description={description}
          tryFree={tryFree}
          showTryFreeBadge={!discoveryPreview}
          expanded={open}
          footer={
            !open && preview ? (
              <div className={cn(HUB_FEATURE_TILE_PREVIEW, "mt-2 px-0")}>
                <p className="text-[11px] font-medium text-amber-200/80 line-clamp-1 flex items-center gap-1 min-w-0">
                  <Sparkles className="h-3 w-3 shrink-0 opacity-80 hub-sparkle-glow" />
                  {preview}
                </p>
              </div>
            ) : !open ? (
              <span className="invisible mt-2 block text-[11px]" aria-hidden>
                .
              </span>
            ) : null
          }
        />
      </HubTileButton>
      <HubExpandedChildren
        open={open}
        className={cn(
          HUB_EXPANDED_CONTENT,
          "mt-3 rounded-[24px] border border-white/[0.08] bg-[rgba(12,18,40,0.55)] backdrop-blur-md",
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
      </HubExpandedChildren>
    </div>
  );
}
