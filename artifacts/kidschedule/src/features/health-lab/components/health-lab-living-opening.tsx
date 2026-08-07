/**
 * Health Lab Phase 2 — living opening surface.
 * Care FE photography + one recommend + quiet wellness paths.
 * Presentation only — does not change game engines or medical content.
 */
import { useTranslation } from "react-i18next";
import { ROOM_HEROES } from "@/lib/parent-hub/room-heroes";
import {
  HEALTH_LAB_QUIET_PATHS,
  recommendHealthLabAction,
} from "@/lib/health-lab/living-room";
import type { HealthGameId } from "@/features/health-lab/types";

const CARE_MEMORY = ROOM_HEROES.care;

type Props = {
  childName: string;
  recommendedGameId: HealthGameId;
  onRecommend: () => void;
  onSelectGame: (gameId: HealthGameId) => void;
};

export function HealthLabLivingOpening({
  childName,
  recommendedGameId,
  onRecommend,
  onSelectGame,
}: Props) {
  const { t } = useTranslation();
  const recommend = recommendHealthLabAction(recommendedGameId);

  return (
    <div className="hl-living-surface" data-testid="health-lab-living-surface">
      <header className="hl-today-hero" data-testid="health-lab-today-hero">
        <div
          className="fe-memory-mount hl-today-memory"
          data-testid="health-lab-visual-memory"
          data-fe-shot={CARE_MEMORY.shot}
        >
          <div className="fe-memory-spill" aria-hidden="true" />
          <div className="fe-memory">
            <img
              src={CARE_MEMORY.src}
              alt={CARE_MEMORY.alt}
              draggable={false}
              decoding="async"
              fetchPriority="high"
            />
            <div className="fe-memory-veil" aria-hidden="true" />
            <div className="fe-memory-glass" aria-hidden="true" />
            <div className="fe-memory-grain" aria-hidden="true" />
            <div className="hl-today-readability" aria-hidden="true" />
            <div className="hl-today-copy">
              <p className="hl-today-eyebrow">
                {t("health_lab.living.eyebrow", { defaultValue: "Today's Care" })}
              </p>
              <h1 className="hl-today-title" id="mission-heading">
                {t("health_lab.living.title", {
                  name: childName,
                  defaultValue: `How can we care for ${childName}'s body today?`,
                })}
              </h1>
              <p className="hl-today-purpose">
                {t("health_lab.living.purpose", {
                  defaultValue: "One calm wellness step — no pressure.",
                })}
              </p>
            </div>
          </div>
        </div>
        <button
          type="button"
          className="hl-recommend-btn"
          data-testid="health-lab-recommend"
          onClick={onRecommend}
        >
          <span className="hl-recommend-cue">{recommend.label}</span>
          <span className="hl-recommend-title">{recommend.title}</span>
          <span className="hl-recommend-purpose">{recommend.purpose}</span>
        </button>
      </header>

      <div className="hl-quiet-band">
        <p className="hl-quiet-label">
          {t("health_lab.living.quiet_paths", {
            defaultValue: "Quiet wellness paths",
          })}
        </p>
        <div className="hl-quiet-list" data-testid="health-lab-quiet-paths">
          {HEALTH_LAB_QUIET_PATHS.map((path) => (
            <button
              key={path.gameId}
              type="button"
              className="hl-quiet-path"
              data-testid={`health-lab-quiet-${path.gameId}`}
              onClick={() => onSelectGame(path.gameId)}
            >
              <span className="hl-quiet-path-title">{path.title}</span>
              <span className="hl-quiet-path-purpose">{path.purpose}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
