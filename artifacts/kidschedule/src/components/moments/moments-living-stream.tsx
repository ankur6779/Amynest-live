/**
 * Moments Phase 2 — one emotional room.
 * Moments FE photography + one recommend + quiet continuous paths.
 * Never four peer products. Presentation only.
 */
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { ROOM_HEROES } from "@/lib/parent-hub/room-heroes";
import { PREMIUM_VOICE } from "@/lib/amynest-philosophy";
import {
  MOMENTS_MAKE_SOFT,
  MOMENTS_PRESENCE_SOFT,
  MOMENTS_QUIET_PATHS,
  momentsPathForTile,
  recommendMomentsAction,
  type MomentsPathId,
} from "@/lib/moments/living-room";
import "@/pages/first-experience-material.css";
import "./moments-living-room.css";

const MOMENTS_MEMORY = ROOM_HEROES.moments;

export type MomentsLivingStreamProps = {
  childName: string;
  /** Currently deepened legacy tile (if any) */
  activeTileId?: string | null;
  onSelectTile: (tileId: string) => void;
};

export function MomentsLivingStream({
  childName,
  activeTileId = null,
  onSelectTile,
}: MomentsLivingStreamProps) {
  const { t } = useTranslation();
  const recommend = useMemo(
    () => recommendMomentsAction(childName),
    [childName],
  );
  const activePath: MomentsPathId | null = activeTileId
    ? momentsPathForTile(activeTileId)
    : null;
  const recommendActive = activeTileId === recommend.tileId;

  return (
    <div
      className="mo-living-surface"
      data-testid="moments-living-stream"
      data-mo-living="1"
    >
      <header className="mo-today-hero" data-testid="moments-today-hero">
        <div
          className="fe-memory-mount mo-today-memory"
          data-testid="moments-visual-memory"
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
            <div className="mo-today-readability" aria-hidden="true" />
            <div className="mo-today-copy">
              <p className="mo-today-eyebrow">
                {t("moments.living.eyebrow", {
                  defaultValue: "Today's Moment",
                })}
              </p>
              <h1 className="mo-today-title">
                {t("moments.living.title", {
                  name: childName,
                  defaultValue: `One beautiful moment with ${childName}`,
                })}
              </h1>
              <p className="mo-today-purpose">
                {t("moments.living.purpose", {
                  defaultValue: "One emotional room — never four products.",
                })}
              </p>
            </div>
          </div>
        </div>
      </header>

      <button
        type="button"
        className="mo-recommend-btn"
        data-testid="moments-recommend"
        data-active={recommendActive ? "true" : "false"}
        onClick={() => onSelectTile(recommend.tileId)}
      >
        <span className="mo-recommend-cue">{recommend.label}</span>
        <span className="mo-recommend-title">{recommend.title}</span>
        <span className="mo-recommend-purpose">{recommend.purpose}</span>
      </button>

      <div className="mo-quiet-band">
        <p className="mo-quiet-label">
          {t("moments.living.quiet_paths", {
            defaultValue: "Quiet ways to be together",
          })}
        </p>
        <div className="mo-quiet-list" data-testid="moments-quiet-paths">
          {MOMENTS_QUIET_PATHS.map((path) => {
            const active = activePath === path.id;
            const demoted = path.id === "talking-amy";
            return (
              <button
                key={path.id}
                type="button"
                className="mo-quiet-path"
                data-testid={`moments-quiet-${path.id}`}
                data-active={active ? "true" : "false"}
                data-demoted={demoted ? "true" : "false"}
                onClick={() => onSelectTile(path.tileId)}
              >
                <span className="mo-quiet-path-title">{path.title}</span>
                <span className="mo-quiet-path-purpose">{path.purpose}</span>
              </button>
            );
          })}
        </div>
      </div>

      {activePath === "presence" ? (
        <div className="mo-soft-band" data-testid="moments-presence-soft">
          <p className="mo-soft-label">
            {t("moments.living.also_together", {
              defaultValue: "Also together",
            })}
          </p>
          <div className="mo-soft-list">
            {MOMENTS_PRESENCE_SOFT.map((soft) => (
              <button
                key={soft.tileId}
                type="button"
                className="mo-soft-link"
                data-testid={`moments-soft-${soft.tileId}`}
                data-active={activeTileId === soft.tileId ? "true" : "false"}
                onClick={() => onSelectTile(soft.tileId)}
              >
                <span className="mo-soft-title">{soft.title}</span>
                <span className="mo-soft-purpose">{soft.purpose}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {activePath === "make" ? (
        <div className="mo-soft-band" data-testid="moments-make-soft">
          <p className="mo-soft-label">
            {t("moments.living.also_make", {
              defaultValue: "Also make",
            })}
          </p>
          <div className="mo-soft-list">
            {MOMENTS_MAKE_SOFT.map((soft) => (
              <button
                key={soft.tileId}
                type="button"
                className="mo-soft-link"
                data-testid={`moments-soft-${soft.tileId}`}
                data-active={activeTileId === soft.tileId ? "true" : "false"}
                onClick={() => onSelectTile(soft.tileId)}
              >
                <span className="mo-soft-title">{soft.title}</span>
                <span className="mo-soft-purpose">{soft.purpose}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <p className="mo-support-note">{PREMIUM_VOICE.invitation}</p>
    </div>
  );
}
