import { Sparkles } from "lucide-react";
import { HubModulePageShell } from "@/components/hub-module-page-shell";
import { AbacusZone } from "@/components/abacus-zone";
import {
  isGrowLivingV1Enabled,
  livingGrowEmptyAbacus,
  livingGrowPageTitle,
} from "@/lib/grow/living-room";

export default function AbacusPage() {
  const living = isGrowLivingV1Enabled();

  return (
    <HubModulePageShell
      featureId="hub_abacus"
      gateMode="action"
      title={living ? livingGrowPageTitle("beads") : "Abacus PRO Zone"}
      subtitle={(child) =>
        living
          ? `${child.name} · One calm counting moment`
          : `${child.name} · Learn the soroban`
      }
      icon={<Sparkles className="h-5 w-5" />}
      filterChild={(_child, totalAgeMonths) => totalAgeMonths >= 24 && totalAgeMonths < 120}
      emptyMessage={
        living
          ? livingGrowEmptyAbacus()
          : "Abacus PRO Zone is available from age 2+. Add or select an eligible child."
      }
    >
      {({ child, gate }) => (
        <AbacusZone childId={child.id} childName={child.name} ageYears={child.age} gate={gate} />
      )}
    </HubModulePageShell>
  );
}
