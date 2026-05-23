import { Trophy } from "lucide-react";
import { useTranslation } from "react-i18next";
import { HubModulePageShell } from "@/components/hub-module-page-shell";
import { OlympiadZone } from "@/components/olympiad-zone";

export default function OlympiadPage() {
  const { t } = useTranslation();

  return (
    <HubModulePageShell
      featureId="hub_olympiad"
      title={t("parent_hub.web_tiles.olympiad.title")}
      subtitle={(child) => child.name}
      icon={<Trophy className="h-5 w-5" />}
      filterChild={(_child, totalAgeMonths) => totalAgeMonths >= 48}
      emptyMessage="Smart Olympiad Zone is designed for ages 4+. Add or select an eligible child."
    >
      {({ child }) => (
        <OlympiadZone
          child={{
            id: child.id,
            name: child.name,
            age: child.age,
          }}
        />
      )}
    </HubModulePageShell>
  );
}
