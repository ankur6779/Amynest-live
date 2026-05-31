import { AppLink } from "@/components/app-link";
import { TryFreeBadge } from "@/components/try-free-badge";
import { HubShadedCardBody } from "@/components/hub-sub-tile-shell";
import { cn } from "@/lib/utils";
import {
  getHubFeatureTileAccent,
  hubShadedSectionCardClasses,
  HUB_FEATURE_TILE_DESC,
  HUB_FEATURE_TILE_ICON,
  HUB_FEATURE_TILE_LAUNCH_ROW,
  HUB_FEATURE_TILE_TEXT,
  HUB_FEATURE_TILE_TITLE,
} from "@/lib/parent-hub-premium";

export function HubLaunchCard({
  href,
  title,
  description,
  icon,
  accentClass,
  cardClass,
  tryFree,
  testId,
  sectionId,
  onNavigate,
}: {
  href: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  accentClass: string;
  cardClass: string;
  tryFree?: boolean;
  testId: string;
  sectionId?: string;
  onNavigate?: () => void;
}) {
  const tileId = sectionId ?? testId.replace(/-launch-card$/, "");
  const theme = getHubFeatureTileAccent(tileId);

  return (
    <AppLink
      href={href}
      onClick={() => onNavigate?.()}
      className={cn(
        "group block h-full overflow-hidden p-0 pl-0",
        hubShadedSectionCardClasses(theme),
        cardClass,
      )}
      data-testid={testId}
      data-section-id={sectionId}
      source="hub-launch-card"
    >
      <HubShadedCardBody theme={theme} cardClass={cardClass}>
        <div className={cn(HUB_FEATURE_TILE_LAUNCH_ROW, "flex-1")}>
          <div className={cn(HUB_FEATURE_TILE_ICON, theme.emojiShell, accentClass)}>
            {icon}
          </div>
          <div className={HUB_FEATURE_TILE_TEXT}>
            <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
              <p className={cn(HUB_FEATURE_TILE_TITLE, "flex-1")}>{title}</p>
              {tryFree ? <TryFreeBadge /> : null}
            </div>
            <p className={HUB_FEATURE_TILE_DESC}>{description}</p>
          </div>
          <span className="inline-flex h-7 shrink-0 items-center self-center rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-2.5 text-[11px] font-black text-white shadow-[0_0_14px_rgba(251,146,60,0.35)] transition-transform group-active:scale-95">
            Open
          </span>
        </div>
      </HubShadedCardBody>
    </AppLink>
  );
}
