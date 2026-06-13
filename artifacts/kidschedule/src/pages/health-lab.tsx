import { FlaskConical } from "lucide-react";
import { HubModulePageShell } from "@/components/hub-module-page-shell";
import { HealthLabZone } from "@/features/health-lab/components/health-lab-zone";
import { HEALTH_LAB_MAX_AGE_MONTHS } from "@/lib/hub-visibility";

export default function HealthLabPage() {
  return (
    <HubModulePageShell
      featureId="hub_health_lab"
      title="Amy Health Lab™"
      subtitle={(child) => `${child.name} · Play, Move & Breathe`}
      icon={<FlaskConical className="h-5 w-5" />}
      filterChild={(_child, totalAgeMonths) => totalAgeMonths < HEALTH_LAB_MAX_AGE_MONTHS}
      emptyMessage="Amy Health Lab is for children up to age 12. Add or select an eligible child."
    >
      {({ child }) => (
        <HealthLabZone childId={child.id} childName={child.name} />
      )}
    </HubModulePageShell>
  );
}
