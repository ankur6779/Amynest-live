import { hubTileAriaLabel } from "@/components/hub-tile-button";
import { AMY_AUDIO_LESSONS_CARD_VISUAL } from "@/lib/audio-lessons-card-config";
import { HUB_TILE_TRIGGER } from "@/lib/parent-hub-premium";
import { cn } from "@/lib/utils";
import { ChevronRight, Headphones, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";

type AmyAudioLessonsCardProps = {
  onClick: () => void;
};

function AudioLessonsChip({
  icon: Icon,
  label,
}: {
  icon: typeof Headphones;
  label: string;
}) {
  return (
    <span className="amy-audio-lessons-tile__chip">
      <Icon className="h-3 w-3 shrink-0 opacity-90" strokeWidth={2.25} aria-hidden />
      <span className="truncate">{label}</span>
    </span>
  );
}

/** Premium Amy Audio Lessons promo tile — mockup-aligned 3-column glass card. */
export function AmyAudioLessonsCard({ onClick }: AmyAudioLessonsCardProps) {
  const { t } = useTranslation();
  const visual = AMY_AUDIO_LESSONS_CARD_VISUAL;
  const title = t("pages.ai_coach.amy_audio_lessons");
  const description = t("pages.ai_coach.hands_full_listen_to_age_curated_parenting_lessons_3_5_min_e");

  return (
    <button
      type="button"
      data-on-dark
      data-testid="amy-audio-lessons-card"
      onClick={onClick}
      aria-label={hubTileAriaLabel(title, description)}
      className={cn(
        HUB_TILE_TRIGGER,
        "amy-audio-lessons-tile-trigger block w-full overflow-visible p-0 text-left",
      )}
    >
      <div className="amy-audio-lessons-tile">
        <div
          className="amy-audio-lessons-tile__shell"
          style={{ background: visual.surfaceGradient }}
        >
          <div
            aria-hidden
            className="amy-audio-lessons-tile__ambient"
            style={{ background: visual.ambientGlow }}
          />
          <div aria-hidden className="amy-audio-lessons-tile__sheen" />

          <div className="amy-audio-lessons-tile__grid">
            <div className="amy-audio-lessons-tile__icon-wrap" aria-hidden>
              <img
                src={visual.iconSrc}
                alt=""
                className="amy-audio-lessons-tile__icon"
                loading="lazy"
                decoding="async"
                width={48}
                height={48}
              />
            </div>

            <div className="amy-audio-lessons-tile__body">
              <p className="amy-audio-lessons-tile__title">{title}</p>
              <p className="amy-audio-lessons-tile__desc">{description}</p>
              <div className="amy-audio-lessons-tile__chips">
                <AudioLessonsChip
                  icon={Headphones}
                  label={t("pages.ai_coach.audio_lessons_tag_audio", "Audio")}
                />
                <AudioLessonsChip
                  icon={Sparkles}
                  label={t("pages.ai_coach.audio_lessons_tag_age_curated", "Age-based")}
                />
              </div>
            </div>

            <div className="amy-audio-lessons-tile__media" aria-hidden>
              <span className="amy-audio-lessons-tile__media-glow" />
              <img
                src={visual.heroSrc}
                alt=""
                width={440}
                height={448}
                className="amy-audio-lessons-tile__hero"
                loading="lazy"
                decoding="async"
              />
            </div>
          </div>

          <span className="amy-audio-lessons-tile__chevron" aria-hidden>
            <ChevronRight className="h-4 w-4" strokeWidth={2.5} />
          </span>
        </div>
      </div>
    </button>
  );
}
