import { HubPremiumFeatureCard } from "@/components/hub-premium-feature-card";
import { hubTileAriaLabel } from "@/components/hub-tile-button";
import { AMY_AUDIO_LESSONS_CARD_VISUAL } from "@/lib/audio-lessons-card-config";
import { HUB_TILE_TRIGGER } from "@/lib/parent-hub-premium";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

type AmyAudioLessonsCardProps = {
  onClick: () => void;
};

/** Premium Parent Hub–style promo card for Amy Audio Lessons on the coach goals screen. */
export function AmyAudioLessonsCard({ onClick }: AmyAudioLessonsCardProps) {
  const { t } = useTranslation();

  return (
    <button
      type="button"
      data-on-dark
      data-testid="amy-audio-lessons-card"
      onClick={onClick}
      aria-label={hubTileAriaLabel(
        t("pages.ai_coach.amy_audio_lessons"),
        t("pages.ai_coach.hands_full_listen_to_age_curated_parenting_lessons_3_5_min_e"),
      )}
      className={cn(
        HUB_TILE_TRIGGER,
        "block w-full overflow-visible p-0 text-left rounded-[32px]",
      )}
    >
      <HubPremiumFeatureCard
        visual={AMY_AUDIO_LESSONS_CARD_VISUAL}
        title={t("pages.ai_coach.amy_audio_lessons")}
        description={t("pages.ai_coach.hands_full_listen_to_age_curated_parenting_lessons_3_5_min_e")}
        className="pointer-events-none rounded-[32px] [&>div]:rounded-[32px]"
      />
    </button>
  );
}
