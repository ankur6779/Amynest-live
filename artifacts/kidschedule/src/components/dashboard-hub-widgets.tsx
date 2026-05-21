import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { ArrowRight, BookOpen } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { DashboardSectionHeader } from "@/components/dashboard-section-header";
import {
  pickDashboardHubRecommendations,
  type DashboardHubPick,
} from "@/lib/hub-routine-links";

type ChildForHub = {
  id: number;
  name: string;
  age: number;
  ageMonths?: number;
};

function HubPickCard({ pick, childName }: { pick: DashboardHubPick; childName: string }) {
  const { t } = useTranslation();
  const title = t(`parent_hub.web_tiles.${pick.tileId}.title`, {
    defaultValue: pick.tileId,
  });
  const description = t(`parent_hub.web_tiles.${pick.tileId}.description`, {
    defaultValue: "",
  });
  return (
    <Link href={pick.href} className="block group">
      <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:bg-muted/60 hover:border-primary/30 transition-all">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 text-lg">
          <BookOpen className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-quicksand font-bold text-sm text-foreground truncate">{title}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{description}</p>
          <p className="text-[10px] text-primary/80 font-semibold mt-1">
            {t("dashboard.for_you_pick_sub", { name: childName })}
          </p>
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary shrink-0 transition-colors" />
      </div>
    </Link>
  );
}

export function ForYouTodaySection({
  child,
}: {
  child: ChildForHub | null | undefined;
}) {
  const { t } = useTranslation();
  if (!child) return null;

  const picks = pickDashboardHubRecommendations(child.age, child.ageMonths ?? 0);
  if (picks.length === 0) return null;

  return (
    <div className="space-y-2">
      <DashboardSectionHeader label={t("dashboard.for_you_today")} icon={BookOpen} />
      <Card className="rounded-2xl border border-border bg-card -mt-1">
        <CardContent className="p-3 space-y-2">
          <p className="text-[11px] text-muted-foreground px-1">
            {t("dashboard.for_you_today_sub", { name: child.name })}
          </p>
          {picks.map((pick) => (
            <HubPickCard key={pick.tileId} pick={pick} childName={child.name} />
          ))}
          <Link
            href="/parenting-hub"
            className="flex items-center justify-center gap-1.5 text-[11px] font-bold text-primary hover:underline pt-1"
          >
            {t("dashboard.for_you_view_hub")}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
