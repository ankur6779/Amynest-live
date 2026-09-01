/**
 * P0-6 — Help / Understand / Care one-room living stream.
 * Same house materials as Moments (reuses Moments sanctuary CSS).
 * Presentation only — no peer product doors.
 */
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { ROOM_HEROES } from "@/lib/parent-hub/room-heroes";
import { PREMIUM_VOICE } from "@/lib/amynest-philosophy";
import {
  recommendPathForRoom,
  roomLivingEyebrow,
  roomLivingPurpose,
  roomLivingQuietLabel,
  roomLivingTitle,
  type RoomLivingPeerRoom,
} from "@/lib/parent-hub/room-living";
import { resolveQuietPathsForRoom } from "@/lib/parent-hub/eligibility";
import "@/pages/first-experience-material.css";
import "@/components/moments/moments-living-room.css";

export type RoomLivingStreamProps = {
  room: RoomLivingPeerRoom;
  childName: string;
  isInfant: boolean;
  /** Hub-visible tile ids — filters age-gated quiet paths without hiding Nutrition. */
  visibleTileIds?: readonly string[];
  activeTileId?: string | null;
  onSelectTile: (tileId: string) => void;
};

export function RoomLivingStream({
  room,
  childName,
  isInfant,
  visibleTileIds,
  activeTileId = null,
  onSelectTile,
}: RoomLivingStreamProps) {
  const { t } = useTranslation();
  const hero = ROOM_HEROES[room];
  const recommend = useMemo(
    () => recommendPathForRoom(room, { isInfant, childName }),
    [room, isInfant, childName],
  );
  const quietPaths = useMemo(
    () => resolveQuietPathsForRoom(room, { isInfant, visibleTileIds }),
    [room, isInfant, visibleTileIds],
  );
  const recommendActive = activeTileId === recommend.tileId;

  return (
    <div
      className="mo-living-surface"
      data-testid={`${room}-living-stream`}
      data-ph-room-living="1"
      data-hub-room={room}
      data-ph-hierarchy="deepen"
    >
      <header className="mo-today-hero" data-testid={`${room}-today-hero`}>
        <div
          className="fe-memory-mount mo-today-memory"
          data-testid={`${room}-visual-memory`}
          data-fe-shot={hero.shot}
        >
          <div className="fe-memory-spill" aria-hidden="true" />
          <div className="fe-memory">
            <img
              src={hero.src}
              alt={hero.alt}
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
                {t(`parent_hub.room_living.${room}.eyebrow`, {
                  defaultValue: roomLivingEyebrow(room),
                })}
              </p>
              <h1 className="mo-today-title">
                {t(`parent_hub.room_living.${room}.title`, {
                  name: childName,
                  defaultValue: roomLivingTitle(room, childName),
                })}
              </h1>
              <p className="mo-today-purpose">
                {t(`parent_hub.room_living.${room}.purpose`, {
                  defaultValue: roomLivingPurpose(room),
                })}
              </p>
            </div>
          </div>
        </div>
      </header>

      <button
        type="button"
        className="mo-recommend-btn"
        data-testid={`${room}-recommend`}
        data-active={recommendActive ? "true" : "false"}
        onClick={() => onSelectTile(recommend.tileId)}
      >
        <span className="mo-recommend-cue">{recommend.label}</span>
        <span className="mo-recommend-title">{recommend.title}</span>
        <span className="mo-recommend-purpose">{recommend.purpose}</span>
      </button>

      <div className="mo-quiet-band">
        <p className="mo-quiet-label">
          {t(`parent_hub.room_living.${room}.quiet_paths`, {
            defaultValue: roomLivingQuietLabel(room),
          })}
        </p>
        <div className="mo-quiet-list" data-testid={`${room}-quiet-paths`}>
          {quietPaths.map((path) => {
            const active = activeTileId === path.tileId;
            return (
              <button
                key={path.id}
                type="button"
                className="mo-quiet-path"
                data-testid={`${room}-quiet-${path.id}`}
                data-active={active ? "true" : "false"}
                data-demoted={path.demoted ? "true" : "false"}
                aria-current={active ? "true" : undefined}
                onClick={() => onSelectTile(path.tileId)}
              >
                <span className="mo-quiet-path-title">{path.title}</span>
                <span className="mo-quiet-path-purpose">{path.purpose}</span>
              </button>
            );
          })}
        </div>
      </div>

      <p className="mo-support-note">
        {t("parent_hub.room_living.continuity", {
          defaultValue: "We'll continue helping as your child grows.",
        })}
      </p>
      <p className="mo-support-note mo-support-invite">{PREMIUM_VOICE.invitation}</p>
      <p className="mo-support-note mo-support-continue">
        {t("parent_hub.room_living.continue_support", {
          defaultValue: PREMIUM_VOICE.continueCta,
        })}
      </p>
    </div>
  );
}
