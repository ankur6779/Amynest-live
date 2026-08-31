import { describe, expect, it } from "vitest";
import { NAV_ITEMS } from "@/lib/mobile-menu-config";
import { NAV_DRAWER_GROUPS } from "@/lib/nav-premium-config";
import { LIVING_DIRECT_URL_CONTAINMENT, LIVING_NAV_CONTAINED_HREFS } from "@/lib/living-leave-containment";
import { ROOM_DESTINATIONS, destinationIdForTile } from "@/lib/parent-hub/destinations";
import { TILE_TO_ROOM, isHubTileRemovedFromRooms, roomForTile } from "@/lib/parent-hub/rooms";
import { GAMES_MODULE_HREF, destinationIdForMomentsPath, momentsPathForTile } from "@/lib/moments/living-room";
import { parseParentingHubDeepLink } from "@/lib/hub-activity-cross-link";
import { getParentRoute, isHubModuleRoute } from "@/lib/navigation-stack";
import { DISCOVERY_POOL } from "@/components/feature-discovery-strip";

describe("navigation integrity — label → tile → route", () => {
  it("never routes Games to Routine or Home", () => {
    expect(GAMES_MODULE_HREF).toBe("/games");
    expect(GAMES_MODULE_HREF).not.toBe("/routines");
    expect(GAMES_MODULE_HREF).not.toBe("/dashboard");
    expect(LIVING_DIRECT_URL_CONTAINMENT["/games"]).toBeUndefined();
    expect((LIVING_NAV_CONTAINED_HREFS as readonly string[]).includes("/games")).toBe(false);
    expect(getParentRoute("/games")).toBe("/parenting-hub");
    expect(getParentRoute("/games")).not.toBe("/dashboard");
    expect(getParentRoute("/games")).not.toBe("/routines");
    expect(isHubModuleRoute("/games")).toBe(true);
  });

  it("maps hamburger Games href to /games", () => {
    const games = NAV_ITEMS.find((item) => item.labelKey === "nav.games");
    expect(games?.href).toBe("/games");
    const routines = NAV_ITEMS.find((item) => item.labelKey === "nav.routines");
    expect(routines?.href).toBe("/routines");
    expect(games?.href).not.toBe(routines?.href);
  });

  it("keeps Games in the Learning drawer group, not Primary/Routines", () => {
    const learning = NAV_DRAWER_GROUPS.find((g) => g.id === "learning");
    const primary = NAV_DRAWER_GROUPS.find((g) => g.id === "primary");
    expect(learning?.hrefs).toContain("/games");
    expect(primary?.hrefs).toContain("/routines");
    expect(primary?.hrefs).not.toContain("/games");
    expect(learning?.hrefs).not.toContain("/routines");
  });

  it("places gaming-rewards in Moments Games destination", () => {
    expect(isHubTileRemovedFromRooms("gaming-rewards")).toBe(false);
    expect(roomForTile("gaming-rewards")).toBe("moments");
    expect(TILE_TO_ROOM["gaming-rewards"]).toBe("moments");
    expect(destinationIdForTile("gaming-rewards")).toBe("games");
    expect(momentsPathForTile("gaming-rewards")).toBe("games");
    expect(destinationIdForMomentsPath("games")).toBe("games");
    const gamesDoor = ROOM_DESTINATIONS.moments.find((d) => d.id === "games");
    expect(gamesDoor?.tileIds).toEqual(["gaming-rewards"]);
    expect(gamesDoor?.titleFallback).toBe("Games");
  });

  it("does not share generate-routine with Games", () => {
    expect(isHubTileRemovedFromRooms("generate-routine")).toBe(true);
    expect(roomForTile("generate-routine")).toBeNull();
    expect(destinationIdForTile("generate-routine")).toBeNull();
    expect(momentsPathForTile("generate-routine")).toBeNull();
  });

  it("parses Games deep links into Moments, not Today/Routine", () => {
    const target = parseParentingHubDeepLink("#tile-gaming-rewards");
    expect(target).toEqual({ group: "moments", tileId: "gaming-rewards" });
    expect(parseParentingHubDeepLink("#gaming-rewards")).toBeNull();
  });

  it("feature discovery hashes match the hub parser", () => {
    const games = DISCOVERY_POOL.find((entry) => entry.id === "hub_gaming_rewards");
    expect(games?.href).toBe("/parenting-hub#tile-gaming-rewards");
    expect(games?.href).not.toContain("/routines");
    const story = DISCOVERY_POOL.find((entry) => entry.id === "hub_story_hub");
    expect(story?.href).toBe("/parenting-hub#tile-story-hub");
    expect(parseParentingHubDeepLink("#tile-story-hub")).toEqual({
      group: "stories",
      tileId: "story-hub",
    });
  });

  it("maps Speech Coach to Help, not Moments/Games", () => {
    expect(roomForTile("speech-coach")).toBe("help");
    expect(destinationIdForTile("speech-coach")).toBe("speech-coach");
    expect(momentsPathForTile("speech-coach")).toBeNull();
  });

  it("maps Story and Activities to Moments without colliding with Games", () => {
    expect(roomForTile("story-hub")).toBe("moments");
    expect(destinationIdForTile("story-hub")).toBe("story");
    expect(roomForTile("activities")).toBe("moments");
    expect(destinationIdForTile("activities")).toBe("presence");
    expect(destinationIdForTile("activities")).not.toBe("games");
  });
});
