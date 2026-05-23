import { Sparkles } from "lucide-react";
import { HubModulePageShell } from "@/components/hub-module-page-shell";
import { AbacusZone } from "@/components/abacus-zone";

export default function AbacusPage() {
  return (
    <HubModulePageShell
      featureId="hub_abacus"
      title="Abacus PRO Zone"
      subtitle={(child) => `${child.name} · Learn the soroban`}
      icon={<Sparkles className="h-5 w-5" />}
      filterChild={(_child, totalAgeMonths) => totalAgeMonths >= 48 && totalAgeMonths < 120}
      emptyMessage="Abacus PRO Zone is designed for ages 4–10. Add or select a child in that range."
    >
      {({ child }) => (
        <AbacusZone childId={child.id} childName={child.name} ageYears={child.age} />
      )}
    </HubModulePageShell>
  );
}
