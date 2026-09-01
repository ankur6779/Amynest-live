/**
 * Visual fixture — Rooms V1 door title/subtitle hierarchy only.
 * Open: /playwright-rooms-door-typography.html
 */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../index.css";
import "@/components/parent-hub/parent-hub-living-room.css";
import { ROOM_HEROES } from "@/lib/parent-hub/room-heroes";
import { PARENT_HUB_ROOM_IDS } from "@/lib/parent-hub/rooms";

function Fixture() {
  return (
    <div
      className="parent-hub-sanctuary min-h-screen p-4"
      data-testid="rooms-door-typography-fixture"
    >
      <div className="ph-room-doors" role="list">
        {PARENT_HUB_ROOM_IDS.map((roomId) => {
          const hero = ROOM_HEROES[roomId];
          return (
            <button
              key={roomId}
              type="button"
              role="listitem"
              data-testid={`hub-room-door-${roomId}`}
              className="ph-room-door"
            >
              <span className="ph-room-door-thumb" aria-hidden>
                <img src={hero.src} alt="" />
                <span className="ph-room-door-thumb-veil" />
              </span>
              <span className="ph-room-door-copy">
                <span className="ph-room-door-title">{hero.titleFallback}</span>
                <span className="ph-room-door-feeling">{hero.feelingFallback}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Fixture />
  </StrictMode>,
);
