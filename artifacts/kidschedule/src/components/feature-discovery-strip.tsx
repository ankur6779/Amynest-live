import { useMemo } from "react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import {
  BookOpen,
  Gamepad2,
  GraduationCap,
  LayoutGrid,
  MoonStar,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { useFeatureUsage } from "@/hooks/use-feature-usage";
import { DashboardGlassCard } from "@/components/dashboard-glass-card";
import { DASHBOARD_TINTS } from "@/lib/dashboard-premium";
import { getAnalyticsService } from "@/lib/analytics/analytics-service";
import { isBirthSkyEnabled } from "@/features/birth-sky/lib/feature-flags";
import { useUser } from "@/lib/firebase-auth-hooks";
import { getUserEmail } from "@/lib/safe-user-display";

type DiscoveryItem = {
  id: string;
  href: string;
  label: string;
  sub: string;
  icon: LucideIcon;
  minAgeYears?: number;
  maxAgeYears?: number;
};

const DISCOVERY_POOL: DiscoveryItem[] = [
  {
    id: "amy_astro_intelligence",
    href: "/birth-sky",
    label: "Amy Astro Intelligence",
    sub: "Cosmic portrait & Birth Sky",
    icon: MoonStar,
  },
  {
    id: "hub_phonics",
    href: "/phonics",
    label: "Phonics",
    sub: "Letter sounds & reading",
    icon: BookOpen,
    minAgeYears: 3,
  },
  {
    id: "hub_story_hub",
    href: "/parenting-hub#story-hub",
    label: "Story Hub",
    sub: "Stories for bedtime",
    icon: BookOpen,
  },
  {
    id: "hub_smart_study",
    href: "/study",
    label: "Smart Study",
    sub: "Practice by grade",
    icon: GraduationCap,
    minAgeYears: 4,
  },
  {
    id: "hub_gaming_rewards",
    href: "/parenting-hub#gaming-rewards",
    label: "Gaming Rewards",
    sub: "Earn from routines",
    icon: Gamepad2,
  },
  {
    id: "parent_hub",
    href: "/parenting-hub",
    label: "Parent Hub",
    sub: "Age-right activities",
    icon: LayoutGrid,
  },
];

type Props = {
  childAgeYears?: number;
  hasRoutines: boolean;
  maxItems?: number;
};

export function FeatureDiscoveryStrip({
  childAgeYears,
  hasRoutines,
  maxItems = 3,
}: Props) {
  const { t } = useTranslation();
  const usage = useFeatureUsage();
  const { user } = useUser();
  const amyAstroEnabled = isBirthSkyEnabled(getUserEmail(user));

  const items = useMemo(() => {
    const age = childAgeYears ?? 5;
    return DISCOVERY_POOL.filter((item) => {
      if (item.id === "amy_astro_intelligence" && !amyAstroEnabled) return false;
      if (item.minAgeYears != null && age < item.minAgeYears) return false;
      if (item.maxAgeYears != null && age > item.maxAgeYears) return false;
      const count = usage.getUseCount(item.id);
      if (count > 0) return false;
      if (item.id === "hub_gaming_rewards" && !hasRoutines) return false;
      return true;
    }).slice(0, maxItems);
  }, [amyAstroEnabled, childAgeYears, hasRoutines, maxItems, usage]);

  if (items.length === 0) return null;

  return (
    <DashboardGlassCard tintRgb={DASHBOARD_TINTS.insights}>
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-violet-300 shrink-0" />
          <p className="font-quicksand font-bold text-sm text-white">
            {t("dashboard.discovery_title", "Try next")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.id}
                href={item.href}
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-3 py-2 text-left hover:bg-white/12 transition-colors min-w-0 max-w-full"
                data-testid={`feature-discovery-${item.id}`}
                onClick={() => {
                  getAnalyticsService().track("feature_open", {
                    feature_id: item.id,
                    source: "dashboard_discovery",
                  });
                }}
              >
                <Icon className="h-4 w-4 text-violet-300 shrink-0" />
                <span className="min-w-0">
                  <span className="block text-xs font-bold text-white truncate">
                    {t(`dashboard.discovery.${item.id}`, item.label)}
                  </span>
                  <span className="block text-[10px] text-white/55 truncate">
                    {t(`dashboard.discovery.${item.id}_sub`, item.sub)}
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </DashboardGlassCard>
  );
}
