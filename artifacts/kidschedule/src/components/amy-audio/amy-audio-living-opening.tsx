/**
 * Amy Audio Phase 2 — living opening surface.
 * Moments FE photography + one recommend + quiet paths.
 * Presentation only — playback engines untouched.
 */
import { useTranslation } from "react-i18next";
import { ROOM_HEROES } from "@/lib/parent-hub/room-heroes";
import {
  AMY_AUDIO_QUIET_PATHS,
  amyAudioLivingOpen,
  recommendAmyAudioAction,
  type AmyAudioQuietPath,
} from "@/lib/amy-audio/living-room";
import "@/pages/first-experience-material.css";
import "./amy-audio-living-room.css";

const MOMENTS_MEMORY = ROOM_HEROES.moments;

type Props = {
  childName?: string;
  onRecommend: () => void;
  onSelectQuietPath: (pathId: AmyAudioQuietPath["id"]) => void;
};

export function AmyAudioLivingOpening({
  childName = "your child",
  onRecommend,
  onSelectQuietPath,
}: Props) {
  const { t } = useTranslation();
  const recommend = recommendAmyAudioAction(childName);
  const open = amyAudioLivingOpen(childName);

  return (
    <div className="aaudio-living-surface" data-testid="amy-audio-living-surface">
      <header className="aaudio-today-hero" data-testid="amy-audio-today-hero">
        <div
          className="fe-memory-mount aaudio-today-memory"
          data-testid="amy-audio-visual-memory"
          data-fe-shot={MOMENTS_MEMORY.shot}
        >
          <div className="fe-memory-spill" aria-hidden="true" />
          <div className="fe-memory">
            <img
              src={MOMENTS_MEMORY.src}
              alt={MOMENTS_MEMORY.alt}
              draggable={false}
              decoding="async"
              fetchPriority="high"
            />
            <div className="fe-memory-veil" aria-hidden="true" />
            <div className="fe-memory-glass" aria-hidden="true" />
            <div className="fe-memory-grain" aria-hidden="true" />
            <div className="aaudio-today-readability" aria-hidden="true" />
            <div className="aaudio-today-copy">
              <p className="aaudio-today-eyebrow">
                {t("amy_audio.living.eyebrow", { defaultValue: open.eyebrow })}
              </p>
              <h1 className="aaudio-today-title">
                {t("amy_audio.living.title", {
                  name: childName,
                  defaultValue: open.title,
                })}
              </h1>
              <p className="aaudio-today-purpose">
                {t("amy_audio.living.companionship", {
                  name: childName,
                  defaultValue: open.companionship,
                })}
              </p>
              <p className="aaudio-today-purpose aaudio-today-purpose-soft">
                {t("amy_audio.living.purpose", {
                  defaultValue: open.purpose,
                })}
              </p>
            </div>
          </div>
        </div>
        <button
          type="button"
          className="aaudio-recommend-btn"
          data-testid="amy-audio-recommend"
          onClick={onRecommend}
        >
          <span className="aaudio-recommend-cue">{recommend.label}</span>
          <span className="aaudio-recommend-title">{recommend.title}</span>
          <span className="aaudio-recommend-purpose">{recommend.purpose}</span>
        </button>
      </header>

      <div className="aaudio-quiet-band">
        <p className="aaudio-quiet-label">
          {t("amy_audio.living.quiet_paths", {
            defaultValue: "Quiet ways to begin",
          })}
        </p>
        <div className="aaudio-quiet-list" data-testid="amy-audio-quiet-paths">
          {AMY_AUDIO_QUIET_PATHS.map((path) => (
            <button
              key={path.id}
              type="button"
              className="aaudio-quiet-path"
              data-testid={`amy-audio-quiet-${path.id}`}
              onClick={() => onSelectQuietPath(path.id)}
            >
              <span className="aaudio-quiet-path-title">{path.title}</span>
              <span className="aaudio-quiet-path-purpose">{path.purpose}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
