import { Link } from "wouter";
import { Palette, ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  buildParentingHubDeepLink,
  isHubPlayActivity,
  suggestHubTileForRoutineItem,
} from "@/lib/hub-activity-cross-link";

type RoutineItemLike = {
  activity: string;
  category: string;
  status?: string;
};

export function RoutineHubActivityBanner({
  items,
  childName,
  dateMode,
}: {
  items: RoutineItemLike[];
  childName?: string;
  dateMode: "today" | "past" | "future";
}) {
  const { t } = useTranslation();

  if (dateMode !== "today" || !items?.length) return null;

  const playItems = items.filter(
    (i) =>
      isHubPlayActivity(i.category, i.activity) &&
      (i.status ?? "pending") !== "completed" &&
      (i.status ?? "pending") !== "skipped",
  );
  if (playItems.length === 0) return null;

  const highlight = playItems[0]!;
  const target = suggestHubTileForRoutineItem(
    highlight.category,
    highlight.activity,
  );
  const href = buildParentingHubDeepLink(target.tileId);

  return (
    <div
      className="rounded-2xl border-2 border-emerald-400/35 bg-gradient-to-r from-emerald-500/10 via-teal-500/8 to-primary/10 p-4 flex flex-col sm:flex-row sm:items-center gap-3"
      data-testid="routine-hub-activity-banner"
    >
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shrink-0 shadow-sm">
          <Palette className="h-5 w-5 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wide mb-0.5">
            {t("components.routine_hub_banner.eyebrow")}
          </p>
          <p className="text-sm font-semibold text-foreground leading-snug">
            {t("components.routine_hub_banner.title", {
              activity: highlight.activity,
              name: childName ?? t("components.routine_hub_banner.your_child"),
            })}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {t("components.routine_hub_banner.subtitle", {
              count: playItems.length,
            })}
          </p>
        </div>
      </div>
      <Link href={href}>
        <span className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-sm hover:opacity-95 transition-opacity">
          {t("components.routine_hub_banner.cta")}
          <ArrowRight className="h-4 w-4" />
        </span>
      </Link>
    </div>
  );
}
