import { FlaskConical } from "lucide-react";
import { useTranslation } from "react-i18next";
import { HubModulePageShell } from "@/components/hub-module-page-shell";
import { HealthLabZone } from "@/features/health-lab/components/health-lab-zone";
import { HEALTH_LAB_MAX_AGE_MONTHS, isHealthLabPreviewAge } from "@/lib/hub-visibility";

export default function HealthLabPage() {
  return (
    <HubModulePageShell
      featureId="hub_health_lab"
      title="Amy Health Lab™"
      subtitle={(child) => child.name}
      icon={<FlaskConical className="h-5 w-5" />}
      filterChild={(_child, totalAgeMonths) => totalAgeMonths < HEALTH_LAB_MAX_AGE_MONTHS}
      emptyMessage="Amy Health Lab is for children up to age 12. Add or select an eligible child."
    >
      {({ child, totalAgeMonths }) =>
        isHealthLabPreviewAge(totalAgeMonths) ? (
          <HealthLabPreviewOverview />
        ) : (
          <HealthLabZone childId={child.id} childName={child.name} />
        )
      }
    </HubModulePageShell>
  );
}

function HealthLabPreviewOverview() {
  const { t } = useTranslation();
  const items = ["movement", "breathing", "wellness"] as const;

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-primary/20 bg-card p-5 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">
          {t("parent_hub.explore_next.cta_preview")}
        </p>
        <h2 className="mt-2 font-quicksand text-2xl font-black text-foreground">
          {t("parent_hub.web_tiles.health-lab.preview_title")}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {t("parent_hub.web_tiles.health-lab.preview_body")}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {items.map((item) => (
          <div
            key={item}
            className="rounded-2xl border border-border bg-card/80 p-4 text-sm font-semibold text-foreground"
          >
            {t(`parent_hub.web_tiles.health-lab.preview_items.${item}`)}
          </div>
        ))}
      </div>
    </div>
  );
}
