import { AppLink } from "@/components/app-link";
import { TryFreeBadge } from "@/components/try-free-badge";
import { cn } from "@/lib/utils";
import {
  getHubFeatureTileAccent,
  hubAccentBarClasses,
  hubSectionCardClasses,
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
        "group block overflow-hidden p-0 pl-0",
        hubSectionCardClasses(theme),
        cardClass,
      )}
      data-testid={testId}
      data-section-id={sectionId}
      source="hub-launch-card"
    >
      <div className="flex min-w-0">
        <div className={hubAccentBarClasses(theme)} aria-hidden />
        <div className="flex min-w-0 flex-1 items-center gap-3 p-4">
          <div
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
              theme.emojiShell,
              accentClass,
            )}
          >
            {icon}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="line-clamp-2 font-quicksand text-[15px] font-bold leading-tight text-foreground">
                {title}
              </p>
              {tryFree ? <TryFreeBadge /> : null}
            </div>
            <p className="mt-0.5 line-clamp-2 text-[11.5px] text-muted-foreground/80 leading-relaxed">
              {description}
            </p>
          </div>
          <span className="inline-flex h-8 shrink-0 items-center rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-3 text-xs font-black text-white shadow-[0_0_14px_rgba(251,146,60,0.35)] transition-transform group-active:scale-95">
            Open
          </span>
        </div>
      </div>
    </AppLink>
  );
}
