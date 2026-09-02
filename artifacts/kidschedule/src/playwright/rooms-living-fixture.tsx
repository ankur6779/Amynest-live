/**
 * Isolated Rooms living-room fixture — no Firebase, no production data.
 * Open: /playwright-rooms-living.html
 */
import { StrictMode, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { Router } from "wouter";
import "../index.css";
import "../i18n";
import { ThemeProvider } from "@/contexts/theme-context";
import { MobileTabBar } from "@/components/mobile-tab-bar";
import { ParentHubRoomsShell } from "@/components/parent-hub/parent-hub-rooms-shell";
import { RoomLivingStream } from "@/components/parent-hub/room-living-stream";
import { GrowLivingStream } from "@/components/grow/grow-living-stream";
import { MomentsLivingStream } from "@/components/moments/moments-living-stream";
import { monthsToAgeGroupId } from "@/features/nutrition/lib/age-band-map";
import {
  isHubSectionVisible,
  type HubSectionVisibilityInput,
} from "@/lib/hub-visibility";
import {
  parseParentingHubDeepLink,
  pushParentingHubLocationHash,
  replaceParentingHubLocationHash,
  resolveRoomsDeepLinkHash,
  roomsHashAfterChildSwitch,
} from "@/lib/hub-activity-cross-link";
import {
  HELP_ROOM_HUB_SECTIONS,
  ageBandFromTotalMonths,
  isInfantCareAge,
  isUrlSafeRoomTileId,
} from "@/lib/parent-hub/eligibility";
import {
  roomForLegacyGroup,
  roomForTile,
  type ParentHubRoomId,
} from "@/lib/parent-hub/rooms";
import { syncAmynestLivingUniverseDocumentClass } from "@/lib/amynest-living-universe";

const CHILDREN = [
  { id: 1, name: "Aria", ageMonths: 8 },
  { id: 2, name: "Devan", ageMonths: 36 },
  { id: 3, name: "Kai Montgomery-Anastasia", ageMonths: 72 },
] as const;

const ROOM_SECTIONS: readonly HubSectionVisibilityInput[] = [
  ...HELP_ROOM_HUB_SECTIONS,
  { id: "infant-hub", bands: ["0-2"] },
  { id: "nutrition", alwaysCurrent: true },
  { id: "health-lab", alwaysCurrent: true },
  { id: "daily-tips", alwaysCurrent: true },
  { id: "articles", alwaysCurrent: true },
  { id: "birth-sky", alwaysCurrent: true },
  { id: "answer-to-kids-how", alwaysCurrent: true },
  { id: "phonics", bands: ["2-4", "4-6"] },
  { id: "smart-math-tricks", bands: ["2-4", "4-6", "6-8"] },
  { id: "abacus", bands: ["2-4", "4-6", "6-8", "8-10"] },
  { id: "spelling-mastery", bands: ["2-4", "4-6", "6-8", "8-10", "10-12", "12-15"] },
  { id: "smart-study", bands: ["4-6", "6-8", "8-10", "10-12", "12-15"] },
  { id: "olympiad", bands: ["4-6", "6-8", "8-10", "10-12", "12-15"] },
  { id: "activities", alwaysCurrent: true },
  { id: "story-hub", bands: ["0-2", "2-4", "4-6", "6-8"] },
  { id: "worksheets", alwaysCurrent: true },
  { id: "gaming-rewards", alwaysCurrent: true },
  { id: "talking-amy", bands: ["0-2", "2-4", "4-6", "6-8"] },
];

function visibleTilesForAge(ageMonths: number): string[] {
  const band = ageBandFromTotalMonths(ageMonths);
  return ROOM_SECTIONS.filter((section) =>
    isHubSectionVisible(section, band, ageMonths),
  ).map((section) => section.id);
}

function Fixture() {
  const params = new URLSearchParams(window.location.search);
  const initialChild = Number(params.get("child") ?? "1");
  const [childId, setChildId] = useState(
    CHILDREN.some((c) => c.id === initialChild) ? initialChild : 1,
  );
  const [activeRoom, setActiveRoom] = useState<ParentHubRoomId | null>(null);
  const [focusTileId, setFocusTileId] = useState<string | null>(null);
  const child = CHILDREN.find((c) => c.id === childId) ?? CHILDREN[0];
  const isInfant = isInfantCareAge(child.ageMonths);
  const visibleTileIds = useMemo(
    () => visibleTilesForAge(child.ageMonths),
    [child.ageMonths],
  );

  useEffect(() => {
    document.documentElement.classList.add("amynest-living-universe");
    document.body.classList.add("amynest-living-universe", "has-tabbar");
    syncAmynestLivingUniverseDocumentClass();
  }, []);

  const applyFromLocation = (fromUserNav: boolean) => {
    const target = parseParentingHubDeepLink();
    if (!target) {
      if (fromUserNav) {
        setFocusTileId(null);
        setActiveRoom(null);
      }
      return;
    }
    const room =
      roomForTile(target.tileId || undefined) ??
      roomForLegacyGroup(target.group) ??
      ("help" as ParentHubRoomId);
    setActiveRoom(room);
    setFocusTileId(target.tileId || null);
  };

  useEffect(() => {
    const frame = requestAnimationFrame(() => applyFromLocation(false));
    const onHash = () => applyFromLocation(true);
    window.addEventListener("hashchange", onHash);
    window.addEventListener("popstate", onHash);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("hashchange", onHash);
      window.removeEventListener("popstate", onHash);
    };
    // Mount + child change re-applies after child-switch hash rewrite.
  }, [childId]);

  const enterRoom = (roomId: ParentHubRoomId) => {
    setFocusTileId(null);
    setActiveRoom(roomId);
    pushParentingHubLocationHash(resolveRoomsDeepLinkHash({ room: roomId, tileId: null }));
  };

  const exitRoom = () => {
    setFocusTileId(null);
    setActiveRoom(null);
    replaceParentingHubLocationHash("");
  };

  const deepenRoomsTile = (tileId: string | null) => {
    const nextFocus = tileId && isUrlSafeRoomTileId(tileId) ? tileId : null;
    setFocusTileId(nextFocus);
    pushParentingHubLocationHash(
      resolveRoomsDeepLinkHash({ room: activeRoom, tileId: nextFocus }),
    );
  };

  const selectChild = (id: number) => {
    setChildId(id);
    setFocusTileId(null);
    const nextHash = roomsHashAfterChildSwitch({
      activeRoom,
      currentHash: window.location.hash,
    });
    if (nextHash != null) replaceParentingHubLocationHash(nextHash);
  };

  return (
    <Router hook={() => ["/parenting-hub", () => {}]}>
      <div
        className="app-shell main-container relative w-full max-w-full min-w-0 overflow-x-clip box-border min-h-screen"
        data-testid="rooms-fixture-root"
        data-child-id={String(child.id)}
        data-age-months={String(child.ageMonths)}
      >
        <header className="flex flex-wrap gap-2 px-3 pt-3 pb-2">
          {CHILDREN.map((entry) => (
            <button
              key={entry.id}
              type="button"
              data-testid={`rooms-child-${entry.id}`}
              data-active={entry.id === child.id ? "true" : "false"}
              className="rounded-full px-3 py-2 text-sm"
              style={{
                background:
                  entry.id === child.id
                    ? "rgba(232,212,184,0.28)"
                    : "rgba(255,255,255,0.06)",
                color: "rgba(244,238,230,0.94)",
              }}
              onClick={() => selectChild(entry.id)}
            >
              {entry.name}
            </button>
          ))}
          <button
            type="button"
            data-testid="rooms-force-missing"
            className="rounded-full px-3 py-2 text-sm"
            style={{ color: "rgba(244,238,230,0.7)" }}
            onClick={() => {
              setActiveRoom("care");
              setFocusTileId("not-a-module");
              pushParentingHubLocationHash("#tile-not-a-module");
            }}
          >
            Force missing
          </button>
        </header>
        <main className="app-shell-main flex min-h-0 w-full max-w-full min-w-0 flex-1 flex-col pb-28">
          <ParentHubRoomsShell
            childName={child.name}
            childId={child.id}
            isInfant={isInfant}
            activeRoom={activeRoom}
            onEnterRoom={enterRoom}
            onExitRoom={exitRoom}
            focusTileId={focusTileId}
            onDeepenTile={deepenRoomsTile}
            visibleTileIds={visibleTileIds}
            renderDestination={(tileId) => {
              if (tileId === "not-a-module") return null;
              if (tileId === "infant-hub" && !isInfant) return null;
              return (
                <div
                  data-testid={`dest-${tileId}`}
                  data-child-id={String(child.id)}
                  data-child-name={child.name}
                  data-age-months={String(child.ageMonths)}
                  data-nutrition-band={
                    tileId === "nutrition"
                      ? monthsToAgeGroupId(child.ageMonths)
                      : undefined
                  }
                  data-speech-mode={
                    tileId === "speech-coach"
                      ? child.ageMonths < 24
                        ? "preview"
                        : "full"
                      : undefined
                  }
                >
                  {tileId} for {child.name}
                </div>
              );
            }}
            renderGuidanceStream={() => (
              <div data-testid="dest-guidance" data-child-id={String(child.id)}>
                Guidance for {child.name}
              </div>
            )}
            renderAskAmyStream={({ activePath }) => (
              <div
                data-testid="dest-ask-amy"
                data-path={activePath ?? "open"}
                data-child-id={String(child.id)}
              >
                Ask Amy for {child.name}
              </div>
            )}
            renderMomentsStream={({ activeTileId, onSelectTile }) => (
              <MomentsLivingStream
                key={child.id}
                childName={child.name}
                activeTileId={activeTileId}
                onSelectTile={onSelectTile}
              />
            )}
            renderGrowStream={({ activeTileId, onSelectTile }) => (
              <GrowLivingStream
                key={child.id}
                childName={child.name}
                ageMonths={child.ageMonths}
                activeTileId={activeTileId}
                onSelectTile={onSelectTile}
              />
            )}
            renderRoomLivingStream={({ room, activeTileId, onSelectTile }) => (
              <RoomLivingStream
                key={`${child.id}:${room}`}
                room={room}
                childName={child.name}
                isInfant={isInfant}
                visibleTileIds={visibleTileIds}
                activeTileId={activeTileId}
                onSelectTile={onSelectTile}
              />
            )}
          />
        </main>
        <button
          type="button"
          data-testid="rooms-amy-fab"
          aria-label="Ask Amy"
          style={{
            position: "fixed",
            right: 16,
            bottom: 88,
            width: 52,
            height: 52,
            borderRadius: 999,
            zIndex: 40,
            background: "rgba(232,212,184,0.92)",
          }}
        />
        <MobileTabBar visible />
      </div>
    </Router>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <Fixture />
    </ThemeProvider>
  </StrictMode>,
);
