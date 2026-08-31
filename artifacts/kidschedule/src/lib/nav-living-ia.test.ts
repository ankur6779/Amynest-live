import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_MOBILE_MENU, NAV_ITEMS } from "@/lib/mobile-menu-config";
import {
  LIVING_NAV_BRAND,
  LIVING_NAV_HOME_LINE,
  buildLivingNavSections,
  parentingHubRoomHref,
  preservedLivingNavHrefs,
} from "@/lib/nav-living-ia";
import { PARENT_HUB_ROOM_IDS } from "@/lib/parent-hub/rooms";
import { LIVING_NAV_CONTAINED_HREFS } from "@/lib/living-leave-containment";

describe("living home navigation IA", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });
  it("keeps the approved home line rather than a new slogan", () => {
    expect(LIVING_NAV_BRAND).toBe("AmyNest");
    expect(LIVING_NAV_HOME_LINE).toBe("Today's next right thing");
  });

  it("prioritizes Home, Today's plan, and companion surfaces", () => {
    const sections = buildLivingNavSections(NAV_ITEMS);
    const flat = sections.flatMap((s) => s.items.map((i) => `${s.id}:${i.href}:${i.label}`));
    expect(flat[0]).toBe("home:/dashboard:Home");
    expect(flat.some((row) => row === "care:/routines:Today's plan")).toBe(true);
    expect(flat.some((row) => row.startsWith("beside_you:/amy-coach:"))).toBe(true);
    expect(flat.some((row) => row === "beside_you:/assistant:Amy")).toBe(true);
  });

  it("treats Rooms as Help / Understand / Care / Moments over the hub route", () => {
    const rooms = buildLivingNavSections(NAV_ITEMS).find((s) => s.id === "rooms");
    expect(rooms?.items.map((i) => i.roomId)).toEqual([...PARENT_HUB_ROOM_IDS]);
    expect(rooms?.items.map((i) => i.href)).toEqual(
      PARENT_HUB_ROOM_IDS.map((room) => parentingHubRoomHref(room)),
    );
    expect(rooms?.items.every((i) => i.href.startsWith("/parenting-hub"))).toBe(true);
    expect(rooms?.items.map((i) => i.description)).toEqual([
      "You are not alone.",
      "See your child more clearly.",
      "Take care of today.",
      "Spend one meaningful moment.",
    ]);
  });

  it("does not use catalogue group labels on primary destinations", () => {
    const sections = buildLivingNavSections(NAV_ITEMS);
    expect(sections.find((s) => s.id === "home")?.label).toBeNull();
    expect(sections.find((s) => s.id === "care")?.label).toBeNull();
    expect(sections.find((s) => s.id === "beside_you")?.label).toBeNull();
    expect(sections.find((s) => s.id === "rooms")?.label).toBe("Rooms");
    expect(sections.find((s) => s.id === "more")?.label).toBe("More");
  });

  it("does not present Birth Sky or Nutrition as equal primary products", () => {
    const sections = buildLivingNavSections(NAV_ITEMS);
    const primary = sections
      .filter((s) => s.id !== "more")
      .flatMap((s) => s.items.map((i) => i.href));
    expect(primary).not.toContain("/birth-sky");
    expect(primary).not.toContain("/nutrition");
    const more = sections.find((s) => s.id === "more")?.items.map((i) => i.href) ?? [];
    expect(more).toContain("/birth-sky");
    expect(more).toContain("/nutrition");
  });

  it("preserves every current nav href including the fallback menu", () => {
    for (const source of [NAV_ITEMS, DEFAULT_MOBILE_MENU]) {
      const preserved = new Set(preservedLivingNavHrefs(source));
      for (const item of source) {
        expect(preserved.has(item.href)).toBe(true);
      }
    }
  });

  it("hides leftover catalogues from living More without dropping Home or Rooms", async () => {
    vi.stubEnv("VITE_FF_AMYNEST_LIVING_UNIVERSE", "living");
    vi.resetModules();
    const { buildLivingNavSections: build } = await import("./nav-living-ia");
    const { NAV_ITEMS: items } = await import("./mobile-menu-config");
    const sections = build(items);
    const more = sections.find((s) => s.id === "more")?.items.map((i) => i.href) ?? [];
    for (const href of LIVING_NAV_CONTAINED_HREFS) {
      expect(more).not.toContain(href);
    }
    expect(sections.flatMap((s) => s.items.map((i) => i.href))).toContain("/dashboard");
    expect(sections.flatMap((s) => s.items.map((i) => i.href.split("#")[0]))).toContain(
      "/parenting-hub",
    );
    expect(more).toContain("/nutrition");
    expect(more).toContain("/games");
  });

  it("uses companion wording for Amy, not assistant SaaS copy", () => {
    const amy = buildLivingNavSections(NAV_ITEMS)
      .flatMap((s) => s.items)
      .find((i) => i.href === "/assistant");
    expect(amy?.label).toBe("Amy");
    expect(amy?.description).toBe("Talk whenever you need");
    expect(amy?.mark).toBe("amy-ai");
  });
});
