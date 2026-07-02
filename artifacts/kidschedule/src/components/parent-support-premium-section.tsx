import type { ReactNode } from "react";
import { useState } from "react";
import { Star } from "lucide-react";
import { HubPremiumFeatureCard } from "@/components/hub-premium-feature-card";
import { HubExpandedChildren } from "@/components/hub-expanded-children";
import { InfantExplorePreviewBanner } from "@/components/infant-explore-preview-banner";
import { JourneyPreviewContent } from "@/components/journey-preview-overlay";
import { useHubSectionPoints, useInfantDiscoveryPreview } from "@/lib/hub-render-context";
import {
  PARENT_SUPPORT_CARD_BADGES,
  PARENT_SUPPORT_CARD_VISUALS,
  PARENT_SUPPORT_HUB_SECTION_MAP,
  type ParentSupportCardId,
} from "@/lib/parent-support-card-config";
import { HUB_EXPANDED_CONTENT, HUB_FEATURE_TILE_PREVIEW } from "@/lib/parent-hub-premium";
import { cn } from "@/lib/utils";

type ParentSupportPremiumSectionProps = {
  id: string;
  title: string;
  description: string;
  defaultOpen?: boolean;
  tryFree?: boolean;
  preview?: string;
  previewLocked?: boolean;
  highlighted?: boolean;
  childName?: string;
  isInfant?: boolean;
  onOpen?: () => void;
  children: ReactNode;
};

/** Premium expandable hub section for Parent Support tiles. */
export function ParentSupportPremiumSection({
  id,
  title,
  description,
  defaultOpen = false,
  tryFree = false,
  preview,
  previewLocked = false,
  highlighted = false,
  childName,
  isInfant = false,
  onOpen,
  children,
}: ParentSupportPremiumSectionProps) {
  const discoveryPreview = useInfantDiscoveryPreview();
  const awardSectionPoints = useHubSectionPoints();
  const [open, setOpen] = useState(defaultOpen);
  const cardKey = PARENT_SUPPORT_HUB_SECTION_MAP[id] as
    | Exclude<ParentSupportCardId, "section-header">
    | undefined;
  const visual = cardKey ? PARENT_SUPPORT_CARD_VISUALS[cardKey] : undefined;
  const badge = cardKey ? PARENT_SUPPORT_CARD_BADGES[cardKey] : undefined;

  if (!visual || !cardKey) return null;

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
        <div
          className={cn(
            highlighted && !open && "rounded-[32px] shadow-[0_0_28px_rgba(251,191,36,0.22)]",
          )}
        >
          <HubPremiumFeatureCard
            visual={visual}
            title={title}
            description={description}
            tryFree={tryFree}
            showTryFreeBadge={!discoveryPreview}
            previewBadge={badge}
            actionMode="expand"
            expanded={open}
            footer={
              !open && preview ? (
                <div className={cn(HUB_FEATURE_TILE_PREVIEW, "mt-2 px-0")}>
                  <p className="text-[11px] font-semibold text-amber-200/90 line-clamp-2 flex items-start gap-1.5 min-w-0 leading-snug">
                    <Star className="mt-0.5 h-3 w-3 shrink-0 fill-amber-300 text-amber-300" />
                    <span>{preview}</span>
                  </p>
                </div>
              ) : !open ? (
                <span className="invisible mt-2 block text-[11px]" aria-hidden>
                  .
                </span>
              ) : null
            }
          />
        </div>
      </button>
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
