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
import {
  orderDestinationsForFlow,
  recommendForRoom,
} from "@/lib/parent-hub/flow";
import { ParentHubRoomHero } from "@/components/parent-hub/parent-hub-room-hero";
import { ParentHubDestinationRow } from "@/components/parent-hub/parent-hub-destination-row";
import { ParentHubExitPanel } from "@/components/parent-hub/parent-hub-exit-panel";
import { AppLink } from "@/components/app-link";
import { ParentHubQuietModuleProvider } from "@/lib/parent-hub/quiet-module-context";
import {
  GUIDANCE_STREAM_TILE_ID,
  isGuidanceLivingV1Enabled,
} from "@/lib/guidance/living-room";
import {
  MOMENTS_STREAM_TILE_ID,
  isMomentsLivingV1Enabled,
  momentsPathForTile,
} from "@/lib/moments/living-room";
import {
  GROW_STREAM_TILE_ID,
  isGrowLivingV1Enabled,
  isGrowTileId,
} from "@/lib/grow/living-room";
import {
  ASK_AMY_STREAM_TILE_ID,
  askAmyPathForDestination,
  askAmyPathForTile,
  destinationIdForAskAmyPath,
  isAskAmyLivingV1Enabled,
  type AskAmyPathId,
} from "@/lib/ask-amy/living-room";
import "@/pages/first-experience-material.css";
import "./parent-hub-living-room.css";

export type MomentsStreamRenderApi = {
  activeTileId: string | null;
  onSelectTile: (tileId: string) => void;
};

export type GrowStreamRenderApi = {
  activeTileId: string | null;
  onSelectTile: (tileId: string) => void;
};

export type AskAmyStreamRenderApi = {
  activePath: AskAmyPathId;
  onSelectPath: (pathId: AskAmyPathId) => void;
};

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
  /**
   * Guidance Phase 2 — one calm stream instead of nested tip/article catalogue.
   * When provided + living flag ON, Guidance merge skips nested tiles.
   */
  renderGuidanceStream?: () => ReactNode;
  /**
   * Moments Phase 2 — one emotional room instead of peer product doors.
   * When provided + living flag ON, Moments skips Presence/Story/Make catalogue.
   */
  renderMomentsStream?: (api: MomentsStreamRenderApi) => ReactNode;
  /**
   * Grow Phase 2 — one calm educational room instead of six-SKU nest.
   * When provided + living flag ON, Grow merge skips nested catalogue.
   */
  renderGrowStream?: (api: GrowStreamRenderApi) => ReactNode;
  /**
   * Ask Amy Phase 2 — Help companionship (Ask Amy + Emotional).
   * When provided + living flag ON, skips emoji shelf / chatbot first impression.
   */
  renderAskAmyStream?: (api: AskAmyStreamRenderApi) => ReactNode;
  homeHref?: string;
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
 * Pack 2–4 — living rooms + destinations + living flow.
 * Enter → hero → one recommendation → quiet paths → complete → Home / life.
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
  renderGuidanceStream,
  renderMomentsStream,
  renderGrowStream,
  renderAskAmyStream,
  homeHref = "/dashboard",
}: ParentHubRoomsShellProps) {
  const { t } = useTranslation();
  const [openDestinationId, setOpenDestinationId] = useState<string | null>(null);
  const [selectedTileId, setSelectedTileId] = useState<string | null>(null);
  /** Grow living — deepened learning tile under the educational room */
  const [growDeepenTileId, setGrowDeepenTileId] = useState<string | null>(null);
  /** Ask Amy living — ask vs feelings path inside companionship room */
  const [askAmyPath, setAskAmyPath] = useState<AskAmyPathId>("ask");
  /** Exit Law — show return-to-life after a destination has been opened */
  const [pathCompleted, setPathCompleted] = useState(false);
  const guidanceLiving =
    Boolean(renderGuidanceStream) && isGuidanceLivingV1Enabled();
  const momentsLiving =
    Boolean(renderMomentsStream) && isMomentsLivingV1Enabled();
  const growLiving = Boolean(renderGrowStream) && isGrowLivingV1Enabled();
  const askAmyLiving =
    Boolean(renderAskAmyStream) && isAskAmyLivingV1Enabled();

  const recommendation = useMemo(
    () => (activeRoom ? recommendForRoom(activeRoom, { isInfant }) : null),
    [activeRoom, isInfant],
  );

  const resolvedDestinations = useMemo(() => {
    if (!activeRoom || !recommendation) return [];
    const raw = destinationsForRoom(activeRoom, visibleTileIds);
    return orderDestinationsForFlow(raw, recommendation.destinationId);
  }, [activeRoom, visibleTileIds, recommendation]);

  useEffect(() => {
    if (!activeRoom) {
      setOpenDestinationId(null);
      setSelectedTileId(null);
      setGrowDeepenTileId(null);
      setAskAmyPath("ask");
      setPathCompleted(false);
      return;
    }
    if (!focusTileId) {
      setOpenDestinationId(null);
      setSelectedTileId(null);
      setGrowDeepenTileId(null);
      setAskAmyPath("ask");
      setPathCompleted(false);
      return;
    }
    const destId = destinationIdForTile(focusTileId);
    setOpenDestinationId(destId);
    if (destId === "guidance" && guidanceLiving) {
      setSelectedTileId(GUIDANCE_STREAM_TILE_ID);
      setGrowDeepenTileId(null);
    } else if (destId === "grow" && growLiving) {
      setSelectedTileId(GROW_STREAM_TILE_ID);
      setGrowDeepenTileId(isGrowTileId(focusTileId) ? focusTileId : null);
    } else if (
      askAmyLiving &&
      (destId === "ask-amy" || destId === "emotional")
    ) {
      setSelectedTileId(ASK_AMY_STREAM_TILE_ID);
      setAskAmyPath(
        askAmyPathForTile(focusTileId) ??
          askAmyPathForDestination(destId) ??
          "ask",
      );
      setGrowDeepenTileId(null);
    } else if (activeRoom === "moments" && momentsLiving) {
      // Deep-link into Moments room — preserve legacy tile deepen
      setSelectedTileId(focusTileId);
      setOpenDestinationId(destId ?? "presence");
      setGrowDeepenTileId(null);
    } else {
      setSelectedTileId(focusTileId);
      setGrowDeepenTileId(null);
    }
    setPathCompleted(true);
  }, [activeRoom, focusTileId, guidanceLiving, momentsLiving, growLiving, askAmyLiving]);

  const selectDestination = (dest: ResolvedDestination) => {
    if (dest.kind === "single") {
      // Ask Amy living — companionship room for Ask Amy + Emotional.
      if (
        askAmyLiving &&
        (dest.id === "ask-amy" || dest.id === "emotional")
      ) {
        const path = askAmyPathForDestination(dest.id) ?? "ask";
        const closing =
          openDestinationId === dest.id &&
          selectedTileId === ASK_AMY_STREAM_TILE_ID &&
          askAmyPath === path;
        setOpenDestinationId(closing ? null : dest.id);
        setSelectedTileId(closing ? null : ASK_AMY_STREAM_TILE_ID);
        setAskAmyPath(path);
        setGrowDeepenTileId(null);
        if (!closing) setPathCompleted(true);
        return;
      }
      const tileId = dest.visibleTileIds[0] ?? null;
      const closing = openDestinationId === dest.id && selectedTileId === tileId;
      setOpenDestinationId(closing ? null : dest.id);
      setSelectedTileId(closing ? null : tileId);
      setGrowDeepenTileId(null);
      if (!closing && tileId) setPathCompleted(true);
      return;
    }
    // Guidance living — open one stream; no nested catalogue.
    if (dest.id === "guidance" && guidanceLiving) {
      const closing =
        openDestinationId === dest.id &&
        selectedTileId === GUIDANCE_STREAM_TILE_ID;
      setOpenDestinationId(closing ? null : dest.id);
      setSelectedTileId(closing ? null : GUIDANCE_STREAM_TILE_ID);
      setGrowDeepenTileId(null);
      if (!closing) setPathCompleted(true);
      return;
    }
    // Grow living — one educational room; no six-SKU nest.
    if (dest.id === "grow" && growLiving) {
      const closing =
        openDestinationId === dest.id &&
        selectedTileId === GROW_STREAM_TILE_ID;
      setOpenDestinationId(closing ? null : dest.id);
      setSelectedTileId(closing ? null : GROW_STREAM_TILE_ID);
      setGrowDeepenTileId(null);
      if (!closing) setPathCompleted(true);
      return;
    }
    setOpenDestinationId((prev) => (prev === dest.id ? null : dest.id));
    setSelectedTileId(null);
    setGrowDeepenTileId(null);
  };

  const selectMember = (tileId: string, destId: string) => {
    const closing = selectedTileId === tileId;
    setOpenDestinationId(destId);
    setSelectedTileId(closing ? null : tileId);
    setGrowDeepenTileId(null);
    if (!closing) setPathCompleted(true);
  };

  const selectMomentsTile = (tileId: string) => {
    const closing = selectedTileId === tileId;
    const path = momentsPathForTile(tileId);
    const destId =
      path === "story"
        ? "story"
        : path === "make"
          ? "make"
          : path === "talking-amy"
            ? "presence"
            : "presence";
    setOpenDestinationId(closing ? null : destId);
    setSelectedTileId(closing ? null : tileId);
    if (!closing) setPathCompleted(true);
  };

  const selectGrowTile = (tileId: string) => {
    const closing = growDeepenTileId === tileId;
    setOpenDestinationId("grow");
    setSelectedTileId(GROW_STREAM_TILE_ID);
    setGrowDeepenTileId(closing ? null : tileId);
    if (!closing) setPathCompleted(true);
  };

  const selectAskAmyPath = (pathId: AskAmyPathId) => {
    setOpenDestinationId(destinationIdForAskAmyPath(pathId));
    setSelectedTileId(ASK_AMY_STREAM_TILE_ID);
    setAskAmyPath(pathId);
    setPathCompleted(true);
  };

  const clearDestination = () => {
    setSelectedTileId(null);
    setOpenDestinationId(null);
    setGrowDeepenTileId(null);
    setAskAmyPath("ask");
  };

  // Moments Phase 2 — one emotional room (skip peer product doors).
  if (
    activeRoom === "moments" &&
    momentsLiving &&
    renderMomentsStream &&
    recommendation
  ) {
    const hero = heroForRoom(activeRoom);
    const title = t(hero.titleKey, { defaultValue: hero.titleFallback });
    const deepenTile =
      selectedTileId &&
      selectedTileId !== MOMENTS_STREAM_TILE_ID &&
      selectedTileId !== GUIDANCE_STREAM_TILE_ID
        ? selectedTileId
        : null;

    return (
      <div
        className="fe-shell ph-living-shell"
        data-testid="parent-hub-rooms-shell"
        data-ph-mode="entered"
        data-ph-pack="4"
        data-hub-room="moments"
        data-mo-living="1"
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

          <p className="ph-room-eyebrow" data-testid="hub-room-title-moments">
            {title}
          </p>

          <section id="hub-room-moments" data-testid="hub-room-moments">
            <div
              data-testid="hub-room-destinations-moments"
              data-pack="living-flow"
              data-mo-mode="one-room"
            >
              <ParentHubQuietModuleProvider>
                {renderMomentsStream({
                  activeTileId: deepenTile,
                  onSelectTile: selectMomentsTile,
                })}
              </ParentHubQuietModuleProvider>
            </div>

            {deepenTile ? (
              <div
                className="ph-module-quiet"
                data-testid={`hub-room-module-${deepenTile}`}
                data-section-id={deepenTile}
                data-ph-pack="5"
              >
                <ParentHubQuietModuleProvider>
                  {renderDestination(deepenTile)}
                </ParentHubQuietModuleProvider>
              </div>
            ) : null}

            {pathCompleted ? (
              <ParentHubExitPanel
                homeHref={homeHref}
                onContinueInRoom={clearDestination}
                onAnotherRoom={onExitRoom}
              />
            ) : null}

            <div
              id="hub-room-deeplink-moments"
              data-testid="hub-room-deeplink-moments"
              data-pack="deep-link"
              className="sr-only"
              aria-hidden
            />
          </section>
        </div>
      </div>
    );
  }

  if (activeRoom && recommendation) {
    const hero = heroForRoom(activeRoom);
    const feeling = t(hero.feelingKey, { defaultValue: hero.feelingFallback });
    const title = t(hero.titleKey, { defaultValue: hero.titleFallback });
    const intention = ROOM_INTENTION[activeRoom];
    const intentionText = t(intention.key, { defaultValue: intention.fallback });
    const recommendLabel = t(recommendation.labelKey, {
      defaultValue: recommendation.labelFallback,
    });

    return (
      <div
        className="fe-shell ph-living-shell"
        data-testid="parent-hub-rooms-shell"
        data-ph-mode="entered"
        data-ph-pack="4"
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
              data-pack="living-flow"
              className="ph-dest-list mt-3"
            >
              <p className="ph-room-eyebrow mb-1">
                {t("parent_hub.rooms.paths_label", {
                  defaultValue: "Quiet paths",
                })}
              </p>

              {resolvedDestinations.map((dest) => {
                const isOpen = openDestinationId === dest.id;
                const isRecommended = dest.id === recommendation.destinationId;
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
                      recommendLabel={isRecommended ? recommendLabel : undefined}
                      onSelect={() => selectDestination(dest)}
                    />

                    {dest.kind === "merge" &&
                    isOpen &&
                    !(dest.id === "guidance" && guidanceLiving) &&
                    !(dest.id === "grow" && growLiving) ? (
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

            {selectedTileId === GUIDANCE_STREAM_TILE_ID &&
            guidanceLiving &&
            renderGuidanceStream ? (
              <div
                className="ph-module-quiet"
                data-testid="hub-room-module-guidance"
                data-section-id="guidance"
                data-ph-pack="5"
              >
                <ParentHubQuietModuleProvider>
                  {renderGuidanceStream()}
                </ParentHubQuietModuleProvider>
              </div>
            ) : selectedTileId === ASK_AMY_STREAM_TILE_ID &&
              askAmyLiving &&
              renderAskAmyStream ? (
              <div
                className="ph-module-quiet"
                data-testid="hub-room-module-ask-amy"
                data-section-id={
                  askAmyPath === "feelings" ? "emotional" : "amy-ai"
                }
                data-ph-pack="5"
                data-aa-living="1"
              >
                <ParentHubQuietModuleProvider>
                  {renderAskAmyStream({
                    activePath: askAmyPath,
                    onSelectPath: selectAskAmyPath,
                  })}
                </ParentHubQuietModuleProvider>
              </div>
            ) : selectedTileId === GROW_STREAM_TILE_ID &&
              growLiving &&
              renderGrowStream ? (
              <>
                <div
                  className="ph-module-quiet"
                  data-testid="hub-room-module-grow"
                  data-section-id="grow"
                  data-ph-pack="5"
                  data-gw-living="1"
                >
                  <ParentHubQuietModuleProvider>
                    {renderGrowStream({
                      activeTileId: growDeepenTileId,
                      onSelectTile: selectGrowTile,
                    })}
                  </ParentHubQuietModuleProvider>
                </div>
                {growDeepenTileId ? (
                  <div
                    className="ph-module-quiet"
                    data-testid={`hub-room-module-${growDeepenTileId}`}
                    data-section-id={growDeepenTileId}
                    data-ph-pack="5"
                  >
                    <ParentHubQuietModuleProvider>
                      {renderDestination(growDeepenTileId)}
                    </ParentHubQuietModuleProvider>
                  </div>
                ) : null}
              </>
            ) : selectedTileId &&
              selectedTileId !== GUIDANCE_STREAM_TILE_ID &&
              selectedTileId !== GROW_STREAM_TILE_ID &&
              selectedTileId !== ASK_AMY_STREAM_TILE_ID ? (
              <div
                className="ph-module-quiet"
                data-testid={`hub-room-module-${selectedTileId}`}
                data-section-id={selectedTileId}
                data-ph-pack="5"
              >
                <ParentHubQuietModuleProvider>
                  {renderDestination(selectedTileId)}
                </ParentHubQuietModuleProvider>
              </div>
            ) : null}

            {pathCompleted ? (
              <ParentHubExitPanel
                homeHref={homeHref}
                onContinueInRoom={clearDestination}
                onAnotherRoom={onExitRoom}
              />
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
      data-ph-pack="4"
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

        <div className="pt-2 text-center">
          <AppLink href={homeHref} source="parent-hub-doors-home">
            <button
              type="button"
              className="ph-exit-tertiary"
              data-testid="parent-hub-doors-home-link"
            >
              {t("parent_hub.rooms.back_home", {
                defaultValue: "Back to Today Home",
              })}
            </button>
          </AppLink>
        </div>
      </div>
    </div>
  );
}
