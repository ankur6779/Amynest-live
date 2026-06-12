import { FlaskConical } from "lucide-react";
import { HubModulePageShell } from "@/components/hub-module-page-shell";
import { HealthLabZone } from "@/features/health-lab/components/health-lab-zone";

export default function HealthLabPage() {
  return (
    <HubModulePageShell
      featureId="hub_health_lab"
      title="Amy Health Lab™"
      subtitle={(child) => `${child.name} · Play, Move & Breathe`}
      icon={<FlaskConical className="h-5 w-5" />}
      filterChild={(_child, totalAgeMonths) => totalAgeMonths >= 36 && totalAgeMonths < 156}
      emptyMessage="Amy Health Lab is available from age 3+. Add or select an eligible child."
    >
      {({ child }) => (
        <HealthLabZone childId={child.id} childName={child.name} />
      )}
    </HubModulePageShell>
  );
}
