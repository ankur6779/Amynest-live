import { Sparkles } from "lucide-react";
import { HubModulePageShell } from "@/components/hub-module-page-shell";
import { AbacusZone } from "@/components/abacus-zone";

export default function AbacusPage() {
  return (
    <HubModulePageShell
      featureId="hub_abacus"
      gateMode="action"
      title="Abacus PRO Zone"
      subtitle={(child) => `${child.name} · Learn the soroban`}
      icon={<Sparkles className="h-5 w-5" />}
      filterChild={(_child, totalAgeMonths) => totalAgeMonths >= 24 && totalAgeMonths < 120}
      emptyMessage="Abacus PRO Zone is available from age 2+. Add or select an eligible child."
    >
      {({ child, gate }) => (
        <AbacusZone childId={child.id} childName={child.name} ageYears={child.age} gate={gate} />
      )}
    </HubModulePageShell>
  );
}
