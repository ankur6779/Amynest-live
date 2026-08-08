/**
 * Amy Coach Phase 2 — living opening surface.
 * Help FE photography + one recommend + quiet paths.
 * Presentation only — coach engines / APIs untouched.
 */
import { useTranslation } from "react-i18next";
import { ROOM_HEROES } from "@/lib/parent-hub/room-heroes";
import {
  AMY_COACH_QUIET_PATHS,
  amyCoachLivingOpen,
  recommendAmyCoachAction,
  type AmyCoachQuietPath,
} from "@/lib/amy-coach/living-room";
import "@/pages/first-experience-material.css";
import "./amy-coach-living-room.css";

const HELP_MEMORY = ROOM_HEROES.help;

type Props = {
  childName: string;
  onRecommend: () => void;
  onSelectQuietPath: (pathId: AmyCoachQuietPath["id"]) => void;
};

export function AmyCoachLivingOpening({
  childName,
  onRecommend,
  onSelectQuietPath,
}: Props) {
  const { t } = useTranslation();
  const recommend = recommendAmyCoachAction(childName);
  const open = amyCoachLivingOpen(childName);

  return (
    <div className="ac-living-surface" data-testid="amy-coach-living-surface">
      <header className="ac-today-hero" data-testid="amy-coach-today-hero">
        <div
          className="fe-memory-mount ac-today-memory"
          data-testid="amy-coach-visual-memory"
          data-fe-shot={HELP_MEMORY.shot}
        >
          <div className="fe-memory-spill" aria-hidden="true" />
          <div className="fe-memory">
            <img
              src={HELP_MEMORY.src}
              alt={HELP_MEMORY.alt}
              draggable={false}
              decoding="async"
              fetchPriority="high"
            />
            <div className="fe-memory-veil" aria-hidden="true" />
            <div className="fe-memory-glass" aria-hidden="true" />
            <div className="fe-memory-grain" aria-hidden="true" />
            <div className="ac-today-readability" aria-hidden="true" />
            <div className="ac-today-copy">
              <p className="ac-today-eyebrow">
                {t("amy_coach.living.eyebrow", { defaultValue: open.eyebrow })}
              </p>
              <h1 className="ac-today-title">
                {t("amy_coach.living.title", {
                  name: childName,
                  defaultValue: open.title,
                })}
              </h1>
              <p className="ac-today-purpose">
                {t("amy_coach.living.companionship", {
                  name: childName,
                  defaultValue: open.companionship,
                })}
              </p>
              <p className="ac-today-purpose ac-today-purpose-soft">
                {t("amy_coach.living.purpose", {
                  defaultValue: open.purpose,
                })}
              </p>
            </div>
          </div>
        </div>
        <button
          type="button"
          className="ac-recommend-btn"
          data-testid="amy-coach-recommend"
          onClick={onRecommend}
        >
          <span className="ac-recommend-cue">{recommend.label}</span>
          <span className="ac-recommend-title">{recommend.title}</span>
          <span className="ac-recommend-purpose">{recommend.purpose}</span>
        </button>
      </header>

      <div className="ac-quiet-band">
        <p className="ac-quiet-label">
          {t("amy_coach.living.quiet_paths", {
            defaultValue: "Quiet ways to begin",
          })}
        </p>
        <div className="ac-quiet-list" data-testid="amy-coach-quiet-paths">
          {AMY_COACH_QUIET_PATHS.map((path) => (
            <button
              key={path.id}
              type="button"
              className="ac-quiet-path"
              data-testid={`amy-coach-quiet-${path.id}`}
              onClick={() => onSelectQuietPath(path.id)}
            >
              <span className="ac-quiet-path-title">{path.title}</span>
              <span className="ac-quiet-path-purpose">{path.purpose}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
