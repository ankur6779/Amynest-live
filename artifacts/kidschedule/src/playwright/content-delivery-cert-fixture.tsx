/**
 * Content delivery + age-matrix fixture.
 * Open: /playwright-content-delivery-cert.html
 */
import { StrictMode, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { Router } from "wouter";
import "../index.css";
import "../i18n";
import { ThemeProvider } from "@/contexts/theme-context";
import { ParentHubRoomsShell } from "@/components/parent-hub/parent-hub-rooms-shell";
import { RoomLivingStream } from "@/components/parent-hub/room-living-stream";
import { MomentsLivingStream } from "@/components/moments/moments-living-stream";
import {
  isHubSectionVisible,
  type HubSectionVisibilityInput,
} from "@/lib/hub-visibility";
import {
  CONTENT_DELIVERY_MODULE_IDS,
  contentModuleVisibility,
} from "@/lib/content-delivery-visibility";
import { CURIOSITY_CATALOG } from "@/lib/content-catalog-inventory";
import {
  ageBandFromTotalMonths,
  isInfantCareAge,
} from "@/lib/parent-hub/eligibility";
import type { ParentHubRoomId } from "@/lib/parent-hub/rooms";
import { syncAmynestLivingUniverseDocumentClass } from "@/lib/amynest-living-universe";

const CHILDREN = [
  { id: 1, name: "Newborn", ageMonths: 1 },
  { id: 2, name: "Three Mo", ageMonths: 3 },
  { id: 3, name: "Six Mo", ageMonths: 6 },
  { id: 4, name: "Nine Mo", ageMonths: 9 },
  { id: 5, name: "Twelve Mo", ageMonths: 12 },
  { id: 6, name: "Eighteen Mo", ageMonths: 18 },
  { id: 7, name: "Toddler", ageMonths: 30 },
  { id: 8, name: "Preschool", ageMonths: 48 },
  { id: 9, name: "School", ageMonths: 72 },
  { id: 10, name: "Older", ageMonths: 120 },
] as const;

const ROOM_SECTIONS: readonly HubSectionVisibilityInput[] = [
  { id: "infant-hub", bands: ["0-2"] },
  { id: "nutrition", alwaysCurrent: true },
  { id: "health-lab", alwaysCurrent: true },
  { id: "worksheets", alwaysCurrent: true },
  {
    id: "coloring-books",
    bands: ["2-4", "4-6", "6-8", "8-10", "10-12", "12-15"],
  },
  { id: "fun-sheets", bands: ["2-4", "4-6", "6-8", "8-10", "10-12", "12-15"] },
  { id: "answer-to-kids-how", alwaysCurrent: true },
  { id: "art-craft", alwaysCurrent: true },
  { id: "story-hub", bands: ["0-2", "2-4", "4-6", "6-8"] },
  { id: "activities", alwaysCurrent: true },
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
  const [activeRoom, setActiveRoom] = useState<ParentHubRoomId | null>(
    (params.get("room") as ParentHubRoomId | null) ?? null,
  );
  const [focusTileId, setFocusTileId] = useState<string | null>(
    params.get("tile"),
  );
  const child = CHILDREN.find((c) => c.id === childId) ?? CHILDREN[0];
  const isInfant = isInfantCareAge(child.ageMonths);
  const visibleTileIds = useMemo(
    () => visibleTilesForAge(child.ageMonths),
    [child.ageMonths],
  );

  useEffect(() => {
    document.documentElement.classList.add("amynest-living-universe");
    document.body.classList.add("amynest-living-universe");
    syncAmynestLivingUniverseDocumentClass();
  }, []);

  return (
    <div
      data-testid="content-delivery-cert-root"
      data-child-id={String(child.id)}
      data-age-months={String(child.ageMonths)}
      data-is-infant={isInfant ? "true" : "false"}
    >
      <header style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: 12 }}>
        {CHILDREN.map((entry) => (
          <button
            key={entry.id}
            type="button"
            data-testid={`cert-child-${entry.id}`}
            data-age-months={String(entry.ageMonths)}
            onClick={() => {
              setChildId(entry.id);
              setFocusTileId(null);
            }}
          >
            {entry.name}
          </button>
        ))}
      </header>
      <div data-testid="cert-age-matrix">
        {CONTENT_DELIVERY_MODULE_IDS.map((id) => (
          <span
            key={id}
            data-testid={`matrix-${id}`}
            data-visibility={contentModuleVisibility(id, child.ageMonths)}
          >
            {id}:{contentModuleVisibility(id, child.ageMonths)}
          </span>
        ))}
      </div>
      <div data-testid="cert-curiosity-count">
        {CURIOSITY_CATALOG.length}
      </div>
      <button
        type="button"
        data-testid="cert-enter-care"
        onClick={() => {
          setActiveRoom("care");
          setFocusTileId(null);
        }}
      >
        Care
      </button>
      <button
        type="button"
        data-testid="cert-enter-moments"
        onClick={() => {
          setActiveRoom("moments");
          setFocusTileId(null);
        }}
      >
        Moments
      </button>
      <button
        type="button"
        data-testid="cert-enter-understand"
        onClick={() => {
          setActiveRoom("understand");
          setFocusTileId("answer-to-kids-how");
        }}
      >
        Curiosity
      </button>
      <ParentHubRoomsShell
        childName={child.name}
        childId={child.id}
        isInfant={isInfant}
        activeRoom={activeRoom}
        onEnterRoom={(room) => {
          setActiveRoom(room);
          setFocusTileId(null);
        }}
        onExitRoom={() => {
          setActiveRoom(null);
          setFocusTileId(null);
        }}
        focusTileId={focusTileId}
        onDeepenTile={setFocusTileId}
        visibleTileIds={visibleTileIds}
        renderDestination={(tileId) => {
          if (!visibleTileIds.includes(tileId)) return null;
          if (tileId === "infant-hub" && !isInfant) return null;
          return (
            <div
              data-testid={`dest-${tileId}`}
              data-child-id={String(child.id)}
              data-age-months={String(child.ageMonths)}
            >
              {tileId === "infant-hub" ? (
                <div data-testid="infant-care-living">
                  <div data-testid="infant-module-sleep">Sleep</div>
                  <div data-testid="infant-module-feeding">Feeding</div>
                  <div data-testid="infant-module-growth">Growth</div>
                </div>
              ) : null}
              {tileId === "coloring-books" ? (
                <div data-testid="coloring-books-section">Coloring library</div>
              ) : null}
              {tileId === "worksheets" ? (
                <div data-testid="worksheets-section">Worksheet library</div>
              ) : null}
              {tileId === "answer-to-kids-how" ? (
                <div data-testid="curiosity-library">
                  {CURIOSITY_CATALOG.length} books
                </div>
              ) : null}
              {tileId === "art-craft" ? (
                <video
                  data-testid="art-craft-video"
                  src="/api/reels/stream/artcraft-1"
                  poster="/favicon.ico"
                  preload="none"
                />
              ) : null}
              {tileId === "story-hub" ? (
                <video
                  data-testid="story-video"
                  src="/api/stories/stream/demo"
                  preload="none"
                />
              ) : null}
              {tileId}
            </div>
          );
        }}
        renderMomentsStream={({ activeTileId, onSelectTile }) => (
          <MomentsLivingStream
            childName={child.name}
            activeTileId={activeTileId}
            onSelectTile={onSelectTile}
            visibleTileIds={visibleTileIds}
          />
        )}
        renderRoomLivingStream={({ room, activeTileId, onSelectTile }) => (
          <RoomLivingStream
            room={room}
            childName={child.name}
            isInfant={isInfant}
            ageMonths={child.ageMonths}
            visibleTileIds={visibleTileIds}
            activeTileId={activeTileId}
            onSelectTile={onSelectTile}
          />
        )}
      />
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <Router>
        <Fixture />
      </Router>
    </ThemeProvider>
  </StrictMode>,
);
