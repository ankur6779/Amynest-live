import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { ReactNode } from "react";
import { PARENT_HUB_ROOM_IDS, type ParentHubRoomId } from "@/lib/parent-hub/rooms";
import { heroForRoom } from "@/lib/parent-hub/room-heroes";
import {
  ROOM_INTENTION,
  destinationIdForTile,
  destinationsForRoom,
  type ResolvedDestination,
} from "@/lib/parent-hub/destinations";
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
  /** Existing module render — shown quietly after a path is chosen */
  renderDestination: (tileId: string) => ReactNode;
};

function memberTitle(
  t: (key: string, opts?: Record<string, string>) => string,
  tileId: string,
): string {
  if (tileId === "infant-hub") {
    return t("parent_hub.destinations.infant_care.title", {
      defaultValue: "Infant Care",
    });
  }
  return t(`parent_hub.web_tiles.${tileId}.title`, {
    defaultValue: tileId.replace(/-/g, " "),
  });
}

/**
 * Pack 2 living rooms + Pack 3 destination merges.
 * Room stays the emotional hero. Destinations are quiet, merged paths.
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
  const [openDestinationId, setOpenDestinationId] = useState<string | null>(null);
  const [selectedTileId, setSelectedTileId] = useState<string | null>(null);

  const resolvedDestinations = useMemo(
    () => (activeRoom ? destinationsForRoom(activeRoom, visibleTileIds) : []),
    [activeRoom, visibleTileIds],
  );

  useEffect(() => {
    if (!activeRoom) {
      setOpenDestinationId(null);
      setSelectedTileId(null);
      return;
    }
    if (!focusTileId) {
      setOpenDestinationId(null);
      setSelectedTileId(null);
      return;
    }
    const destId = destinationIdForTile(focusTileId);
    setOpenDestinationId(destId);
    setSelectedTileId(focusTileId);
  }, [activeRoom, focusTileId]);

  const selectDestination = (dest: ResolvedDestination) => {
    if (dest.kind === "single") {
      const tileId = dest.visibleTileIds[0] ?? null;
      setOpenDestinationId((prev) => (prev === dest.id && selectedTileId === tileId ? null : dest.id));
      setSelectedTileId((prev) => (prev === tileId ? null : tileId));
      return;
    }
    // Merge door — toggle nested quiet paths; clear module until a member is chosen
    setOpenDestinationId((prev) => (prev === dest.id ? null : dest.id));
    setSelectedTileId(null);
  };

  const selectMember = (tileId: string, destId: string) => {
    setOpenDestinationId(destId);
    setSelectedTileId((prev) => (prev === tileId ? null : tileId));
  };

  if (activeRoom) {
    const hero = heroForRoom(activeRoom);
    const feeling = t(hero.feelingKey, { defaultValue: hero.feelingFallback });
    const title = t(hero.titleKey, { defaultValue: hero.titleFallback });
    const intention = ROOM_INTENTION[activeRoom];
    const intentionText = t(intention.key, { defaultValue: intention.fallback });

    return (
      <div
        className="fe-shell ph-living-shell"
        data-testid="parent-hub-rooms-shell"
        data-ph-mode="entered"
        data-ph-pack="3"
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

            <p
              className="ph-room-intention"
              data-testid={`hub-room-intention-${activeRoom}`}
            >
              {intentionText}
            </p>

            <div
              data-testid={`hub-room-destinations-${activeRoom}`}
              data-pack="secondary-destinations"
              className="ph-dest-list mt-3"
            >
              <p className="ph-room-eyebrow mb-1">
                {t("parent_hub.rooms.paths_label", {
                  defaultValue: "Quiet paths",
                })}
              </p>

              {resolvedDestinations.map((dest) => {
                const isOpen = openDestinationId === dest.id;
                const titleText = t(dest.titleKey, { defaultValue: dest.titleFallback });
                const purposeText = t(dest.purposeKey, {
                  defaultValue: dest.purposeFallback,
                });

                return (
                  <div key={dest.id} data-destination={dest.id} data-kind={dest.kind}>
                    <ParentHubDestinationRow
                      tileId={dest.id}
                      title={titleText}
                      hint={purposeText}
                      active={isOpen}
                      onSelect={() => selectDestination(dest)}
                    />

                    {dest.kind === "merge" && isOpen ? (
                      <div
                        className="ph-dest-nested"
                        data-testid={`hub-dest-nested-${dest.id}`}
                      >
                        {dest.visibleTileIds.map((tileId) => (
                          <ParentHubDestinationRow
                            key={tileId}
                            tileId={tileId}
                            title={memberTitle(t, tileId)}
                            nested
                            active={selectedTileId === tileId}
                            onSelect={() => selectMember(tileId, dest.id)}
                          />
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              })}
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

  // Overview — four photographic doors
  return (
    <div
      className="fe-shell ph-living-shell"
      data-testid="parent-hub-rooms-shell"
      data-ph-mode="doors"
      data-ph-pack="3"
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
            const doorTitle = t(hero.titleKey, { defaultValue: hero.titleFallback });
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
                  <span className="ph-room-door-title">{doorTitle}</span>
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
