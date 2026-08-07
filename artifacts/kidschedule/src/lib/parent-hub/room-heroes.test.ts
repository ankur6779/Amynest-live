import { describe, expect, it } from "vitest";
import { PARENT_HUB_ROOM_IDS } from "./rooms";
import { ROOM_HEROES, heroForRoom } from "./room-heroes";

describe("room heroes Pack 2", () => {
  it("assigns one FE photograph per room", () => {
    for (const room of PARENT_HUB_ROOM_IDS) {
      const hero = heroForRoom(room);
      expect(hero.src.startsWith("/experience/r1/")).toBe(true);
      expect(hero.src.endsWith(".png")).toBe(true);
      expect(hero.feelingFallback.length).toBeGreaterThan(0);
    }
  });

  it("reuses only Welcome FE shots — no new asset paths", () => {
    const srcs = Object.values(ROOM_HEROES).map((h) => h.src);
    expect(new Set(srcs).size).toBe(4);
    for (const src of srcs) {
      expect(src).toMatch(/^\/experience\/r1\/shot-0[1-5]-/);
    }
  });

  it("maps Help to relationship photography", () => {
    expect(ROOM_HEROES.help.shot).toBe("relationship");
    expect(ROOM_HEROES.help.feelingFallback).toBe("You are not alone.");
  });
});
