import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  buildMilestoneShareCardData,
} from "@/lib/infant-share-cards";
import { InfantShareSheet } from "@/components/infant/infant-share-sheet";

type MilestoneCelebrationSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  childId: number;
  childName: string;
  ageMonths: number;
  milestoneTitle: string;
  milestoneEmoji: string;
  shareOpen: boolean;
  onShareOpenChange: (open: boolean) => void;
};

export function MilestoneCelebrationSheet({
  open,
  onOpenChange,
  childId,
  childName,
  ageMonths,
  milestoneTitle,
  milestoneEmoji,
  shareOpen,
  onShareOpenChange,
}: MilestoneCelebrationSheetProps) {
  const { t } = useTranslation();
  const firstName = childName.trim().split(/\s+/)[0] ?? childName;

  const cardData = useMemo(
    () =>
      buildMilestoneShareCardData(
        firstName,
        milestoneTitle,
        milestoneEmoji,
        Date.now(),
      ),
    [firstName, milestoneTitle, milestoneEmoji],
  );

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-[9998] flex items-end sm:items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-label={t("components.infant_share.celebration_aria", "Milestone celebration")}
        >
          <div
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            onClick={() => onOpenChange(false)}
          />
          <div
            className="relative z-10 w-full sm:max-w-md mx-4 mb-4 sm:mb-0 rounded-3xl overflow-hidden shadow-2xl border border-amber-400/20"
            style={{
              background: "linear-gradient(165deg, #1a0f2e 0%, #3d2463 55%, #5b3a8c 100%)",
            }}
          >
            <div className="p-6 text-center space-y-4 text-white">
              <div className="text-6xl leading-none">{milestoneEmoji}</div>
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-widest text-amber-300/90">
                  {t("components.infant_share.new_milestone", "New Milestone")}
                </p>
                <h2 className="text-2xl font-extrabold leading-tight">
                  {firstName}{" "}
                  {t("components.infant_share.just_learned", "Just Learned To")}
                </h2>
                <p className="text-xl font-bold text-amber-200">{milestoneTitle} 🎉</p>
              </div>
              <p className="text-sm text-white/70 leading-snug px-2">
                {t(
                  "components.infant_share.celebration_body",
                  "Capture this moment and share it with grandparents, aunts, and uncles.",
                )}
              </p>
              <div className="flex flex-col gap-2 pt-2">
                <Button
                  type="button"
                  className="w-full rounded-xl font-bold gap-2 bg-amber-500 hover:bg-amber-400 text-amber-950"
                  onClick={() => {
                    onOpenChange(false);
                    onShareOpenChange(true);
                  }}
                >
                  <Sparkles className="h-4 w-4" />
                  {t("components.infant_share.share_with_family", "Share with Family")}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full rounded-xl text-white/80 hover:text-white hover:bg-white/10"
                  onClick={() => onOpenChange(false)}
                >
                  {t("components.infant_share.not_now", "Not now")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <InfantShareSheet
        open={shareOpen}
        onOpenChange={onShareOpenChange}
        variant="milestone"
        milestoneData={cardData}
        childId={childId}
        ageMonths={ageMonths}
      />
    </>
  );
}
