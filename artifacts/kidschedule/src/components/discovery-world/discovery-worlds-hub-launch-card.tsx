import { AppLink } from "@/components/app-link";
import { TryFreeBadge } from "@/components/try-free-badge";
import { HubShadedCardBody } from "@/components/hub-sub-tile-shell";
import { Progress } from "@/components/ui/progress";
import { buildDiscoveryHubTileStats } from "@/lib/discovery-worlds-unified-insights";
import {
  getHubFeatureTileAccent,
  hubShadedSectionCardClasses,
  HUB_FEATURE_TILE_DESC,
  HUB_FEATURE_TILE_ICON,
  HUB_FEATURE_TILE_LAUNCH_ROW,
  HUB_FEATURE_TILE_TEXT,
  HUB_FEATURE_TILE_TITLE,
} from "@/lib/parent-hub-premium";
import { cn } from "@/lib/utils";
import { Compass, Star, Sticker, Trophy } from "lucide-react";

type DiscoveryWorldsHubLaunchCardProps = {
  childId: number;
  title: string;
  description: string;
  tryFree?: boolean;
};

export function DiscoveryWorldsHubLaunchCard({
  childId,
  title,
  description,
  tryFree,
}: DiscoveryWorldsHubLaunchCardProps) {
  const stats = buildDiscoveryHubTileStats(childId);
  const theme = getHubFeatureTileAccent("discovery-worlds");
  const accentClass = "bg-gradient-to-br from-teal-400 via-cyan-500 to-emerald-500";
  const cardClass =
    "bg-gradient-to-br from-teal-400/25 via-cyan-500/15 to-emerald-500/10 hover:shadow-[0_10px_36px_-10px_rgba(20,184,166,0.45)]";

  return (
    <AppLink
      href="/discovery-worlds"
      className={cn(
        "group block h-full overflow-hidden p-0 pl-0",
        hubShadedSectionCardClasses(theme),
        cardClass,
      )}
      data-testid="discovery-worlds-launch-card"
      data-section-id="discovery-worlds"
      source="hub-launch-card"
    >
      <HubShadedCardBody theme={theme} cardClass={cardClass}>
        <div className={cn(HUB_FEATURE_TILE_LAUNCH_ROW, "flex-1 flex-col items-stretch gap-3")}>
          <div className="flex w-full gap-3">
            <div className={cn(HUB_FEATURE_TILE_ICON, theme.emojiShell, accentClass)}>
              <Compass className="h-5 w-5 text-white" />
            </div>
            <div className={cn(HUB_FEATURE_TILE_TEXT, "min-w-0 flex-1")}>
              <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
                <p className={cn(HUB_FEATURE_TILE_TITLE, "flex-1")}>{title}</p>
                {tryFree ? <TryFreeBadge /> : null}
              </div>
              <p className={HUB_FEATURE_TILE_DESC}>{description}</p>
            </div>
            <span className="inline-flex h-7 shrink-0 items-center self-start rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 px-2.5 text-[11px] font-black text-white shadow-[0_0_14px_rgba(20,184,166,0.35)] transition-transform group-active:scale-95">
              Open
            </span>
          </div>

          <div className="w-full space-y-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5">
            <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
              <span>Discovery progress</span>
              <span className="tabular-nums text-foreground">{stats.overallProgressPct}%</span>
            </div>
            <Progress value={stats.overallProgressPct} className="h-2" />
            <div className="grid grid-cols-3 gap-2 pt-1 text-center text-[10px]">
              <div className="rounded-lg bg-white/[0.04] px-1 py-1.5">
                <Star className="mx-auto h-3 w-3 text-amber-300" />
                <p className="mt-0.5 font-bold tabular-nums text-foreground">
                  {stats.worldsCompleted}/{stats.worldsTotal}
                </p>
                <p className="text-muted-foreground">Worlds</p>
              </div>
              <div className="rounded-lg bg-white/[0.04] px-1 py-1.5">
                <Sticker className="mx-auto h-3 w-3 text-primary" />
                <p className="mt-0.5 font-bold tabular-nums text-foreground">{stats.totalStickers}</p>
                <p className="text-muted-foreground">Stickers</p>
              </div>
              <div className="rounded-lg bg-white/[0.04] px-1 py-1.5">
                <Trophy className="mx-auto h-3 w-3 text-violet-300" />
                <p className="mt-0.5 font-bold tabular-nums text-foreground">{stats.totalAchievements}</p>
                <p className="text-muted-foreground">Stars</p>
              </div>
            </div>
            {stats.learningStreakDays > 0 && (
              <p className="text-center text-[10px] font-semibold text-amber-200">
                🔥 {stats.learningStreakDays} day learning streak
              </p>
            )}
          </div>
        </div>
      </HubShadedCardBody>
    </AppLink>
  );
}
