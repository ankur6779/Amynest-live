import type { ReactNode } from "react";
import { useState } from "react";
import { HubPremiumFeatureCard } from "@/components/hub-premium-feature-card";
import { HubExpandedChildren } from "@/components/hub-expanded-children";
import { InfantExplorePreviewBanner } from "@/components/infant-explore-preview-banner";
import { JourneyPreviewContent } from "@/components/journey-preview-overlay";
import { useHubSectionPoints, useInfantDiscoveryPreview } from "@/lib/hub-render-context";
import { HUB_EXPANDED_CONTENT_STACK } from "@/lib/parent-hub-premium";
import {
  TODAY_FOR_YOU_CARD_BADGES,
  TODAY_FOR_YOU_CARD_VISUALS,
  TODAY_FOR_YOU_HUB_SECTION_MAP,
  type TodayForYouCardId,
} from "@/lib/today-for-you-card-config";
import { cn } from "@/lib/utils";

type TodayForYouPremiumSectionProps = {
  id: string;
  title: string;
  description: string;
  defaultOpen?: boolean;
  tryFree?: boolean;
  highlighted?: boolean;
  previewLocked?: boolean;
  childName?: string;
  isInfant?: boolean;
  footer?: ReactNode;
  onOpen?: () => void;
  children: ReactNode;
};

/** Premium expandable hub section for Today For You tiles. */
export function TodayForYouPremiumSection({
  id,
  title,
  description,
  defaultOpen = false,
  tryFree = false,
  highlighted = false,
  previewLocked = false,
  childName,
  isInfant = false,
  footer,
  onOpen,
  children,
}: TodayForYouPremiumSectionProps) {
  const discoveryPreview = useInfantDiscoveryPreview();
  const awardSectionPoints = useHubSectionPoints();
  const [open, setOpen] = useState(defaultOpen);
  const cardKey = TODAY_FOR_YOU_HUB_SECTION_MAP[id] as
    | Exclude<TodayForYouCardId, "section-header">
    | undefined;
  const visual = cardKey ? TODAY_FOR_YOU_CARD_VISUALS[cardKey] : undefined;
  const badge = cardKey ? TODAY_FOR_YOU_CARD_BADGES[cardKey] : undefined;

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

  const highlightGlow =
    id === "amy-ai"
      ? "rounded-[32px] shadow-[0_0_32px_rgba(168,85,247,0.38)]"
      : "rounded-[32px] shadow-[0_0_28px_rgba(251,191,36,0.22)]";

  return (
    <div data-section-id={id} className="h-full" data-testid={id === "command-center" ? "hub-family-pulse" : undefined}>
      <button
        type="button"
        onClick={toggle}
        className="block w-full text-left active:scale-[0.985] transition-transform"
        aria-expanded={open}
      >
        <div className={cn(highlighted && !open && highlightGlow)}>
          <HubPremiumFeatureCard
            visual={visual}
            title={title}
            description={description}
            tryFree={tryFree}
            showTryFreeBadge={!discoveryPreview}
            previewBadge={badge}
            actionMode="expand"
            expanded={open}
            className="rounded-[32px] [&>div]:rounded-[32px]"
            footer={
              !open && footer ? (
                footer
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
          HUB_EXPANDED_CONTENT_STACK,
          "mt-3 rounded-[24px] border border-white/[0.08] bg-[rgba(12,18,40,0.55)] backdrop-blur-md hub-today-stack",
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
