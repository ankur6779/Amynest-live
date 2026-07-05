import { AppLink } from "@/components/app-link";
import { HubPremiumFeatureCard } from "@/components/hub-premium-feature-card";
import { Progress } from "@/components/ui/progress";
import { hubTileAriaLabel } from "@/components/hub-tile-button";
import { useHubSectionPoints, useInfantDiscoveryPreview } from "@/lib/hub-render-context";
import { buildDiscoveryHubTileStats } from "@/lib/discovery-worlds-unified-insights";
import {
  STORIES_CARD_BADGES,
  STORIES_CARD_VISUALS,
} from "@/lib/stories-card-config";
import { HUB_TILE_TRIGGER } from "@/lib/parent-hub-premium";
import { cn } from "@/lib/utils";
import { motion, useReducedMotion } from "framer-motion";
import { Star, Sticker, Trophy } from "lucide-react";
import { useTranslation } from "react-i18next";

type StoriesDiscoveryLaunchCardProps = {
  childId: number;
  title: string;
  description: string;
  tryFree?: boolean;
};

/** Premium Amy Sound World launch tile with discovery progress stats. */
export function StoriesDiscoveryLaunchCard({
  childId,
  title,
  description,
  tryFree,
}: StoriesDiscoveryLaunchCardProps) {
  const { t } = useTranslation();
  const discoveryPreview = useInfantDiscoveryPreview();
  const awardSectionPoints = useHubSectionPoints();
  const reducedMotion = useReducedMotion();
  const stats = buildDiscoveryHubTileStats(childId);

  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="w-full"
    >
      <AppLink
        href="/discovery-worlds"
        onClick={() => awardSectionPoints("discovery-worlds")}
        className={cn(HUB_TILE_TRIGGER, "block w-full overflow-visible p-0 rounded-[30px]")}
        aria-label={hubTileAriaLabel(title, description)}
        data-testid="discovery-worlds-launch-card"
        data-section-id="discovery-worlds"
        source="hub-launch-card"
      >
        <HubPremiumFeatureCard
          visual={STORIES_CARD_VISUALS["discovery-worlds"]}
          title={title}
          description={description}
          previewBadge={STORIES_CARD_BADGES["discovery-worlds"]}
          tryFree={tryFree}
          showTryFreeBadge={!discoveryPreview}
        />
        <div
          className={cn(
            "mt-3 space-y-2 rounded-[24px] border border-white/[0.1] bg-[rgba(12,18,40,0.55)] px-3 py-2.5 backdrop-blur-md",
          )}
        >
          <div className="flex items-center justify-between text-[11px] font-semibold text-white/70">
            <span>{t("parent_hub.stories_cards.discovery_worlds.progress_label", "Discovery progress")}</span>
            <span className="tabular-nums text-white">{stats.overallProgressPct}%</span>
          </div>
          <Progress value={stats.overallProgressPct} className="h-2" />
          <div className="grid grid-cols-3 gap-2 pt-1 text-center text-[10px]">
            <div className="rounded-lg bg-white/[0.06] px-1 py-1.5">
              <Star className="mx-auto h-3 w-3 text-amber-300" />
              <p className="mt-0.5 font-bold tabular-nums text-white">
                {stats.worldsCompleted}/{stats.worldsTotal}
              </p>
              <p className="text-white/60">{t("parent_hub.stories_cards.discovery_worlds.worlds", "Worlds")}</p>
            </div>
            <div className="rounded-lg bg-white/[0.06] px-1 py-1.5">
              <Sticker className="mx-auto h-3 w-3 text-primary" />
              <p className="mt-0.5 font-bold tabular-nums text-white">{stats.totalStickers}</p>
              <p className="text-white/60">{t("parent_hub.stories_cards.discovery_worlds.stickers", "Stickers")}</p>
            </div>
            <div className="rounded-lg bg-white/[0.06] px-1 py-1.5">
              <Trophy className="mx-auto h-3 w-3 text-violet-300" />
              <p className="mt-0.5 font-bold tabular-nums text-white">{stats.totalAchievements}</p>
              <p className="text-white/60">{t("parent_hub.stories_cards.discovery_worlds.stars", "Stars")}</p>
            </div>
          </div>
          {stats.learningStreakDays > 0 ? (
            <p className="text-center text-[10px] font-semibold text-amber-200">
              {t("parent_hub.stories_cards.discovery_worlds.streak", {
                count: stats.learningStreakDays,
                defaultValue: "{{count}} day learning streak",
              })}
            </p>
          ) : null}
        </div>
      </AppLink>
    </motion.div>
  );
}
