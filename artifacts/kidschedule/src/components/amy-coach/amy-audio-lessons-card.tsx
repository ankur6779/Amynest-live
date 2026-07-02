import { HubPremiumFeatureCard } from "@/components/hub-premium-feature-card";
import { AMY_AUDIO_LESSONS_CARD_VISUAL } from "@/lib/audio-lessons-card-config";
import { motion, useReducedMotion } from "framer-motion";
import { useTranslation } from "react-i18next";

type AmyAudioLessonsCardProps = {
  onClick: () => void;
};

/** Premium Parent Hub–style promo card for Amy Audio Lessons on the coach goals screen. */
export function AmyAudioLessonsCard({ onClick }: AmyAudioLessonsCardProps) {
  const { t } = useTranslation();
  const reducedMotion = useReducedMotion();

  return (
    <motion.button
      type="button"
      data-on-dark
      data-testid="amy-audio-lessons-card"
      onClick={onClick}
      initial={reducedMotion ? false : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      whileTap={{ scale: 0.985 }}
      className="block w-full overflow-visible p-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50"
    >
      <HubPremiumFeatureCard
        visual={AMY_AUDIO_LESSONS_CARD_VISUAL}
        title={t("pages.ai_coach.amy_audio_lessons")}
        description={t("pages.ai_coach.hands_full_listen_to_age_curated_parenting_lessons_3_5_min_e")}
        actionMode="open"
        iconOnlyAction
        className="pointer-events-none rounded-[32px] [&>div]:rounded-[32px]"
      />
    </motion.button>
  );
}
