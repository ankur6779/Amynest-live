import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { NAV_ITEMS } from "@/lib/mobile-menu-config";
import { NAV_DRAWER_GROUPS } from "@/lib/nav-premium-config";
import {
  LIVING_DIRECT_URL_CONTAINMENT,
  LIVING_NAV_CONTAINED_HREFS,
  LIVING_NEVER_DUMP_HREFS,
} from "@/lib/living-leave-containment";
import { ROOM_DESTINATIONS, destinationIdForTile } from "@/lib/parent-hub/destinations";
import {
  TILE_TO_ROOM,
  fallbackHrefForRemovedHubTile,
  isHubTileRemovedFromRooms,
  roomForTile,
} from "@/lib/parent-hub/rooms";
import { GAMES_MODULE_HREF, destinationIdForMomentsPath, momentsPathForTile } from "@/lib/moments/living-room";
import { parseParentingHubDeepLink } from "@/lib/hub-activity-cross-link";
import { getParentRoute, isHubModuleRoute } from "@/lib/navigation-stack";
import { DISCOVERY_POOL } from "@/components/feature-discovery-strip";
import { CREATIVITY_CARD_VISUALS } from "@/lib/creativity-card-config";

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

  it("keeps Progress, Insights, and Study as their own modules", () => {
    expect(NAV_ITEMS.find((item) => item.href === "/progress")?.href).toBe("/progress");
    expect(NAV_ITEMS.find((item) => item.href === "/insights")?.href).toBe("/insights");
    expect(NAV_ITEMS.find((item) => item.href === "/study")?.href).toBe("/study");
    expect(LIVING_DIRECT_URL_CONTAINMENT["/progress"]).toBeUndefined();
    expect(LIVING_DIRECT_URL_CONTAINMENT["/insights"]).toBeUndefined();
    expect(LIVING_DIRECT_URL_CONTAINMENT["/study"]).toBeUndefined();
    expect((LIVING_NAV_CONTAINED_HREFS as readonly string[]).includes("/progress")).toBe(false);
    expect((LIVING_NAV_CONTAINED_HREFS as readonly string[]).includes("/insights")).toBe(false);
    expect((LIVING_NAV_CONTAINED_HREFS as readonly string[]).includes("/study")).toBe(false);
    expect(getParentRoute("/progress")).toBe("/dashboard");
    expect(getParentRoute("/insights")).toBe("/dashboard");
    expect(getParentRoute("/study")).toBe("/parenting-hub");
    expect(isHubModuleRoute("/study")).toBe(true);
  });

  it("never dumps a valid module through generic living containment", () => {
    for (const href of LIVING_NEVER_DUMP_HREFS) {
      expect(LIVING_DIRECT_URL_CONTAINMENT[href], href).toBeUndefined();
    }
    for (const [from, to] of Object.entries(LIVING_DIRECT_URL_CONTAINMENT)) {
      expect(to, `${from} dumped to Home`).not.toBe("/dashboard");
    }
  });

  it("sends generate-routine to Today's plan generate, not a Rooms no-op", () => {
    expect(isHubTileRemovedFromRooms("generate-routine")).toBe(true);
    expect(fallbackHrefForRemovedHubTile("generate-routine")).toBe("/routines/generate");
    expect(fallbackHrefForRemovedHubTile("generate-routine")).not.toBe("/games");
    expect(getParentRoute("/routines/generate")).toBe("/routines");
  });

  it("labels the Activities card chip Play, never Games", () => {
    const chip = CREATIVITY_CARD_VISUALS.activities.chips[0];
    expect(chip?.defaultLabel).toBe("Play");
    expect(chip?.defaultLabel).not.toBe("Games");
    expect(chip?.labelKey).toBe("parent_hub.creativity_cards.activities.chip_1");
    const en = JSON.parse(
      readFileSync(resolve(import.meta.dirname, "../i18n/en.json"), "utf8"),
    ) as { parent_hub: { creativity_cards: { activities: { chip_1: string } } } };
    expect(en.parent_hub.creativity_cards.activities.chip_1).toBe("Play");
    expect(en.parent_hub.creativity_cards.activities.chip_1).not.toBe("Games");
  });

  it("does not wrap never-dump modules in LivingLeaveRedirect", () => {
    const appCore = readFileSync(resolve(import.meta.dirname, "../AppCore.tsx"), "utf8");
    const hub = readFileSync(resolve(import.meta.dirname, "../pages/parenting-hub.tsx"), "utf8");
    for (const href of LIVING_NEVER_DUMP_HREFS) {
      expect(appCore).not.toContain(`<LivingLeaveRedirect path="${href}"`);
      expect(appCore).not.toContain(`path="${href}"\n              Legacy=`);
    }
    expect(appCore).toContain('path="/progress" component={ProgressRoute}');
    expect(appCore).toContain('path="/insights" component={InsightsRoute}');
    expect(appCore).toContain('path="/study" component={StudyRoute}');
    expect(appCore).toContain('path="/games" component={GamesRoute}');
    expect(hub).toContain("fallbackHrefForRemovedHubTile");
    expect(hub).not.toMatch(/isHubTileRemovedFromRooms\(tileId\)\) return;/);
  });

  it("keeps the Rooms destination doors distinct", () => {
    expect(ROOM_DESTINATIONS.help.map((d) => d.id)).toEqual(
      expect.arrayContaining(["ask-amy", "speech-coach", "emotional", "ptm-prep", "life-skills"]),
    );
    expect(ROOM_DESTINATIONS.understand.map((d) => d.id)).toEqual([
      "guidance",
      "birth-sky",
      "curiosity",
      "grow",
    ]);
    expect(ROOM_DESTINATIONS.care.map((d) => d.id)).toEqual(
      expect.arrayContaining(["nutrition", "health-lab", "infant-care"]),
    );
    expect(ROOM_DESTINATIONS.moments.map((d) => d.id)).toEqual([
      "presence",
      "story",
      "make",
      "games",
    ]);
    expect(destinationIdForTile("smart-study")).toBe("grow");
  });
});
