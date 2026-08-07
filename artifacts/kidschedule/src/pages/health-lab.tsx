import { FlaskConical, Heart } from "lucide-react";
import { useTranslation } from "react-i18next";
import { HubModulePageShell } from "@/components/hub-module-page-shell";
import { HealthLabZone } from "@/features/health-lab/components/health-lab-zone";
import { HEALTH_LAB_MAX_AGE_MONTHS, isHealthLabPreviewAge } from "@/lib/hub-visibility";
import { isHealthLabLivingV1Enabled } from "@/lib/health-lab/living-room";

export default function HealthLabPage() {
  const living = isHealthLabLivingV1Enabled();

  return (
    <HubModulePageShell
      featureId="hub_health_lab"
      title={living ? "Care" : "Amy Health Lab™"}
      subtitle={(child) => child.name}
      icon={living ? <Heart className="h-5 w-5" /> : <FlaskConical className="h-5 w-5" />}
      filterChild={(_child, totalAgeMonths) => totalAgeMonths < HEALTH_LAB_MAX_AGE_MONTHS}
      emptyMessage={
        living
          ? "Wellness care is available for children up to age 12. Add or select an eligible child."
          : "Amy Health Lab is for children up to age 12. Add or select an eligible child."
      }
    >
      {({ child, totalAgeMonths }) =>
        isHealthLabPreviewAge(totalAgeMonths) ? (
          <HealthLabPreviewOverview living={living} />
        ) : (
          <HealthLabZone childId={child.id} childName={child.name} />
        )
      }
    </HubModulePageShell>
  );
}

function HealthLabPreviewOverview({ living }: { living: boolean }) {
  const { t } = useTranslation();
  const items = ["movement", "breathing", "wellness"] as const;

  if (living) {
    return (
      <div className="space-y-4 px-1" data-testid="health-lab-preview-living">
        <div className="rounded-[1.25rem] border border-[rgba(232,212,184,0.18)] bg-[rgba(8,6,12,0.55)] p-5 shadow-[0_10px_28px_rgba(0,0,0,0.28)]">
          <p className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-[rgba(251,191,36,0.92)]">
            {t("health_lab.living.eyebrow", { defaultValue: "Today's Care" })}
          </p>
          <h2 className="mt-2 font-quicksand text-2xl font-bold text-[rgba(255,252,248,0.98)]">
            {t("parent_hub.web_tiles.health-lab.preview_title")}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[rgba(244,238,230,0.86)]">
            {t("parent_hub.web_tiles.health-lab.preview_body")}
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {items.map((item) => (
            <div
              key={item}
              className="rounded-[1.05rem] border border-[rgba(232,212,184,0.16)] bg-[rgba(8,6,12,0.55)] p-4 text-sm font-semibold text-[rgba(255,252,248,0.96)]"
            >
              {t(`parent_hub.web_tiles.health-lab.preview_items.${item}`)}
            </div>
          ))}
        </div>
      </div>
    );
  }

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
