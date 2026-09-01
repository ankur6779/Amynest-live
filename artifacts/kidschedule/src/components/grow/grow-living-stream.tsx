/**
 * Grow Phase 2 — one calm educational room.
 * Understand FE photography + one practice recommend + quiet learning paths.
 * No course marketplace. No learning catalogue. No unlock theatre.
 * Presentation only — engines / routes / entitlements reused.
 */
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { ROOM_HEROES } from "@/lib/parent-hub/room-heroes";
import { PREMIUM_VOICE } from "@/lib/amynest-philosophy";
import {
  growPathForTile,
  growPathsForAge,
  isGrowRecommendEnabled,
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
  const recommendEnabled = isGrowRecommendEnabled(ageMonths);
  const recommendActive = activeTileId === recommend.tileId && recommendEnabled;

  return (
    <div
      className="gw-living-surface"
      data-testid="grow-living-stream"
      data-gw-living="1"
      data-gw-hierarchy="deepen"
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
                  defaultValue: `I'm here with you and ${childName}.`,
                })}
              </h1>
              <p className="gw-today-purpose">
                {t("grow.living.purpose", {
                  defaultValue:
                    "One calm educational room — never a course marketplace.",
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
        data-enabled={recommendEnabled ? "true" : "false"}
        aria-label={`${recommend.title}. ${recommend.purpose}`}
        aria-disabled={recommendEnabled ? undefined : "true"}
        disabled={!recommendEnabled}
        onClick={() => {
          if (!recommendEnabled) return;
          onSelectTile(recommend.tileId);
        }}
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
          {paths.map((path) => {
            const enabled = path.enabled !== false;
            const active = activePath === path.id;
            return (
              <button
                key={path.id}
                type="button"
                className="gw-quiet-path"
                data-testid={`grow-quiet-${path.id}`}
                data-active={active ? "true" : "false"}
                data-demoted={path.demoted ? "true" : "false"}
                data-enabled={enabled ? "true" : "false"}
                aria-label={`${path.title}. ${enabled ? path.purpose : path.disabledReason ?? path.purpose}`}
                aria-current={active ? "true" : undefined}
                aria-disabled={enabled ? undefined : "true"}
                disabled={!enabled}
                onClick={() => {
                  if (!enabled) return;
                  onSelectTile(path.tileId);
                }}
              >
                <span className="gw-quiet-path-title">{path.title}</span>
                <span className="gw-quiet-path-purpose">
                  {enabled ? path.purpose : path.disabledReason ?? path.purpose}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <p className="gw-support-note">
        {t("grow.living.continuity", {
          defaultValue: "We'll continue helping as your child grows.",
        })}
      </p>
      <p className="gw-support-note gw-support-invite">{PREMIUM_VOICE.invitation}</p>
      <p className="gw-support-note gw-support-continue">
        {t("grow.living.continue_support", {
          defaultValue: PREMIUM_VOICE.continueCta,
        })}
      </p>
    </div>
  );
}
