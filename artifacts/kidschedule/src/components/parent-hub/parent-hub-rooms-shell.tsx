import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { ReactNode } from "react";
import {
  PARENT_HUB_ROOM_IDS,
  type ParentHubRoomId,
  tileIdsForRoom,
} from "@/lib/parent-hub/rooms";
import { heroForRoom } from "@/lib/parent-hub/room-heroes";
import { ParentHubRoomHero } from "@/components/parent-hub/parent-hub-room-hero";
import { ParentHubDestinationRow } from "@/components/parent-hub/parent-hub-destination-row";
import "@/pages/first-experience-material.css";
import "./parent-hub-living-room.css";

export type ParentHubRoomsShellProps = {
  childName: string;
  isInfant: boolean;
  /** Entered living room — null = room doors overview */
  activeRoom: ParentHubRoomId | null;
  onEnterRoom: (roomId: ParentHubRoomId) => void;
  onExitRoom: () => void;
  /** Deep-link focus — opens quiet module path inside the entered room */
  focusTileId?: string | null;
  visibleTileIds: string[];
  /** Existing module render — shown quietly after a list row is chosen */
  renderDestination: (tileId: string) => ReactNode;
};

function tileTitle(
  t: (key: string, opts?: Record<string, string>) => string,
  tileId: string,
): string {
  if (tileId === "infant-hub") {
    return t("parent_hub.infant_hub.infant_parenting", {
      defaultValue: "Infant Care",
    });
  }
  return t(`parent_hub.web_tiles.${tileId}.title`, {
    defaultValue: tileId.replace(/-/g, " "),
  });
}

function tileHint(
  t: (key: string, opts?: Record<string, string>) => string,
  tileId: string,
): string {
  return t(`parent_hub.web_tiles.${tileId}.description`, { defaultValue: "" });
}

/**
 * Pack 2 — living rooms.
 * Overview: photographic doors. Entered: one cinematic hero + quiet paths.
 * Modules are list rows, not marketing cards.
 */
export function ParentHubRoomsShell({
  childName,
  isInfant,
  activeRoom,
  onEnterRoom,
  onExitRoom,
  focusTileId = null,
  visibleTileIds,
  renderDestination,
}: ParentHubRoomsShellProps) {
  const { t } = useTranslation();
  const [selectedTileId, setSelectedTileId] = useState<string | null>(null);

  useEffect(() => {
    setSelectedTileId(focusTileId ?? null);
  }, [activeRoom, focusTileId]);

  if (activeRoom) {
    const hero = heroForRoom(activeRoom);
    const feeling = t(hero.feelingKey, { defaultValue: hero.feelingFallback });
    const title = t(hero.titleKey, { defaultValue: hero.titleFallback });
    const tileIds = tileIdsForRoom(activeRoom, visibleTileIds);

    return (
      <div
        className="fe-shell ph-living-shell"
        data-testid="parent-hub-rooms-shell"
        data-ph-mode="entered"
        data-hub-room={activeRoom}
        data-fe-shot={hero.shot}
        data-fe-room="reveal"
        data-fe-presence="settle"
      >
        <div className="fe-ambient" aria-hidden="true">
          <img src={hero.src} alt="" decoding="async" loading="lazy" fetchPriority="low" />
          <div className="fe-ambient-wash" />
        </div>
        <div className="fe-breath fe-breath-a" aria-hidden="true" />
        <div className="fe-breath fe-breath-b" aria-hidden="true" />
        <div className="fe-living-shade" aria-hidden="true" />

        <div className="ph-living-content">
          <button
            type="button"
            className="ph-back-rooms"
            data-testid="parent-hub-exit-room"
            onClick={onExitRoom}
          >
            {t("parent_hub.rooms.back_rooms", {
              defaultValue: "All rooms",
            })}
          </button>

          <p className="ph-room-eyebrow" data-testid={`hub-room-title-${activeRoom}`}>
            {title}
          </p>

          <section id={`hub-room-${activeRoom}`} data-testid={`hub-room-${activeRoom}`}>
            <ParentHubRoomHero hero={hero} feeling={feeling} priority />

            <div
              data-testid={`hub-room-destinations-${activeRoom}`}
              data-pack="secondary-destinations"
              className="ph-dest-list mt-4"
            >
              <p className="ph-room-eyebrow mb-1">
                {t("parent_hub.rooms.paths_label", {
                  defaultValue: "Quiet paths",
                })}
              </p>
              {tileIds.map((tileId) => (
                <ParentHubDestinationRow
                  key={tileId}
                  tileId={tileId}
                  title={tileTitle(t, tileId)}
                  hint={tileHint(t, tileId) || undefined}
                  active={selectedTileId === tileId}
                  onSelect={() =>
                    setSelectedTileId((prev) => (prev === tileId ? null : tileId))
                  }
                />
              ))}
            </div>

            {selectedTileId ? (
              <div
                className="ph-module-quiet"
                data-testid={`hub-room-module-${selectedTileId}`}
                data-section-id={selectedTileId}
              >
                {renderDestination(selectedTileId)}
              </div>
            ) : null}

            <div
              id={`hub-room-deeplink-${activeRoom}`}
              data-testid={`hub-room-deeplink-${activeRoom}`}
              data-pack="deep-link"
              className="sr-only"
              aria-hidden
            />
          </section>
        </div>
      </div>
    );
  }

  // Overview — four photographic doors (not accordion menus)
  return (
    <div
      className="fe-shell ph-living-shell"
      data-testid="parent-hub-rooms-shell"
      data-ph-mode="doors"
      data-fe-shot="reflection"
      data-fe-room="reveal"
      data-fe-presence="settle"
    >
      <div className="fe-ambient" aria-hidden="true">
        <img
          src="/experience/r1/shot-05-reflection.png"
          alt=""
          decoding="async"
          loading="lazy"
          fetchPriority="low"
        />
        <div className="fe-ambient-wash" />
      </div>
      <div className="fe-breath fe-breath-a" aria-hidden="true" />
      <div className="fe-breath fe-breath-b" aria-hidden="true" />
      <div className="fe-living-shade" aria-hidden="true" />

      <div className="ph-living-content">
        <div>
          <h2 className="ph-room-feeling" style={{ fontSize: "1.4rem" }}>
            {t("parent_hub.rooms.header", {
              name: childName,
              defaultValue: `What do you need for ${childName}?`,
            })}
          </h2>
          <p className="ph-dest-row-hint mt-1">
            {t("parent_hub.rooms.header_subtitle_v2", {
              defaultValue: "Enter one calm room.",
            })}
          </p>
        </div>

        <div className="ph-room-doors" role="list">
          {PARENT_HUB_ROOM_IDS.map((roomId) => {
            const hero = heroForRoom(roomId);
            const feeling = t(hero.feelingKey, {
              defaultValue: hero.feelingFallback,
            });
            const title = t(hero.titleKey, { defaultValue: hero.titleFallback });
            const emphasize = isInfant && roomId === "care";

            return (
              <button
                key={roomId}
                type="button"
                role="listitem"
                id={`hub-room-door-${roomId}`}
                data-testid={`hub-room-door-${roomId}`}
                data-hub-room-door={roomId}
                className={
                  emphasize ? "ph-room-door ph-room-door--emphasis" : "ph-room-door"
                }
                onClick={() => onEnterRoom(roomId)}
              >
                <span className="ph-room-door-thumb" aria-hidden>
                  <img src={hero.src} alt="" loading="lazy" decoding="async" />
                  <span className="ph-room-door-thumb-veil" />
                </span>
                <span className="ph-room-door-copy">
                  <span className="ph-room-door-title">{title}</span>
                  <span className="ph-room-door-feeling">{feeling}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
