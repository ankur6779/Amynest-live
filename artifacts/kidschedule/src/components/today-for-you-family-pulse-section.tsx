import { Flame } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ContinueJourneyCard } from "@/components/continue-journey-card";
import { RealityDashboardPanel } from "@/components/reality-dashboard/reality-dashboard-panel";
import { FamilyExecutiveDashboard } from "@/components/family-executive-dashboard";
import { TodayForYouPremiumSection } from "@/components/today-for-you-premium-section";

type TodayForYouFamilyPulseSectionProps = {
  childId: number;
  childName: string;
  streakDays?: number;
};

/** Family Pulse tile — premium shell with executive dashboard content. */
export function TodayForYouFamilyPulseSection({
  childId,
  childName,
  streakDays,
}: TodayForYouFamilyPulseSectionProps) {
  const { t } = useTranslation();

  const streakFooter =
    streakDays != null && streakDays > 0 ? (
      <div className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-amber-200/90">
        <Flame className="h-3.5 w-3.5 shrink-0 fill-orange-400 text-orange-400" />
        <span>
          {t("parent_hub.today_for_you_cards.command_center.streak", { count: streakDays })}
        </span>
      </div>
    ) : null;

  return (
    <TodayForYouPremiumSection
      id="command-center"
      title={t("parent_hub.family_pulse.title")}
      description={t("parent_hub.family_pulse.preview")}
      footer={streakFooter}
    >
      <ContinueJourneyCard />
      <RealityDashboardPanel />
      <FamilyExecutiveDashboard childId={childId} childName={childName} />
    </TodayForYouPremiumSection>
  );
}
