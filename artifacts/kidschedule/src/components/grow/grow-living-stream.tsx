/**
 * Grow Phase 2 — one calm educational room.
 * Understand FE photography + one practice recommend + quiet learning paths.
 * No SaaS catalogue. No unlock theatre. Presentation only.
 */
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { ROOM_HEROES } from "@/lib/parent-hub/room-heroes";
import { PREMIUM_VOICE } from "@/lib/amynest-philosophy";
import {
  growPathForTile,
  growPathsForAge,
  recommendGrowAction,
} from "@/lib/grow/living-room";
import "@/pages/first-experience-material.css";
import "./grow-living-room.css";

const UNDERSTAND_MEMORY = ROOM_HEROES.understand;

export type GrowLivingStreamProps = {
  childName: string;
  ageMonths?: number;
  activeTileId?: string | null;
  onSelectTile: (tileId: string) => void;
};

export function GrowLivingStream({
  childName,
  ageMonths = 60,
  activeTileId = null,
  onSelectTile,
}: GrowLivingStreamProps) {
  const { t } = useTranslation();
  const recommend = useMemo(
    () => recommendGrowAction(childName, ageMonths),
    [childName, ageMonths],
  );
  const paths = useMemo(() => growPathsForAge(ageMonths), [ageMonths]);
  const activePath = activeTileId ? growPathForTile(activeTileId) : null;
  const recommendActive = activeTileId === recommend.tileId;

  return (
    <div
      className="gw-living-surface"
      data-testid="grow-living-stream"
      data-gw-living="1"
    >
      <header className="gw-today-hero" data-testid="grow-today-hero">
        <div
          className="fe-memory-mount gw-today-memory"
          data-testid="grow-visual-memory"
          data-fe-shot={UNDERSTAND_MEMORY.shot}
        >
          <div className="fe-memory-spill" aria-hidden="true" />
          <div className="fe-memory">
            <img
              src={UNDERSTAND_MEMORY.src}
              alt={UNDERSTAND_MEMORY.alt}
              draggable={false}
              decoding="async"
              fetchPriority="high"
            />
            <div className="fe-memory-veil" aria-hidden="true" />
            <div className="fe-memory-glass" aria-hidden="true" />
            <div className="fe-memory-grain" aria-hidden="true" />
            <div className="gw-today-readability" aria-hidden="true" />
            <div className="gw-today-copy">
              <p className="gw-today-eyebrow">
                {t("grow.living.eyebrow", {
                  defaultValue: "Today's Growth",
                })}
              </p>
              <h1 className="gw-today-title">
                {t("grow.living.title", {
                  name: childName,
                  defaultValue: `Skills growing quietly with ${childName}`,
                })}
              </h1>
              <p className="gw-today-purpose">
                {t("grow.living.purpose", {
                  defaultValue: "One calm educational room — never a learning mall.",
                })}
              </p>
            </div>
          </div>
        </div>
      </header>

      <button
        type="button"
        className="gw-recommend-btn"
        data-testid="grow-recommend"
        data-active={recommendActive ? "true" : "false"}
        onClick={() => onSelectTile(recommend.tileId)}
      >
        <span className="gw-recommend-cue">{recommend.label}</span>
        <span className="gw-recommend-title">{recommend.title}</span>
        <span className="gw-recommend-purpose">{recommend.purpose}</span>
      </button>

      <div className="gw-quiet-band">
        <p className="gw-quiet-label">
          {t("grow.living.quiet_paths", {
            defaultValue: "Quiet ways to grow",
          })}
        </p>
        <div className="gw-quiet-list" data-testid="grow-quiet-paths">
          {paths.map((path) => (
            <button
              key={path.id}
              type="button"
              className="gw-quiet-path"
              data-testid={`grow-quiet-${path.id}`}
              data-active={activePath === path.id ? "true" : "false"}
              data-demoted={path.demoted ? "true" : "false"}
              onClick={() => onSelectTile(path.tileId)}
            >
              <span className="gw-quiet-path-title">{path.title}</span>
              <span className="gw-quiet-path-purpose">{path.purpose}</span>
            </button>
          ))}
        </div>
      </div>

      <p className="gw-support-note">{PREMIUM_VOICE.invitation}</p>
    </div>
  );
}
