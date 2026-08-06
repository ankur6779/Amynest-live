import { describe, expect, it } from "vitest";
import {
  V2_TAB_HREFS,
  createV2NavHistory,
  isV2TabActive,
} from "./v2-nav-history";

describe("V2 nav history regression", () => {
  it("Today → Ask Amy → For Child → Back returns to Ask Amy, then Today", () => {
    const nav = createV2NavHistory("/today");
    expect(nav.location).toBe("/today");
    expect(nav.stack).toEqual(["/today"]);

    nav.push("/ask-amy");
    expect(nav.location).toBe("/ask-amy");
    expect(nav.stack).toEqual(["/today", "/ask-amy"]);

    nav.push("/for-child");
    expect(nav.location).toBe("/for-child");
    expect(nav.stack).toEqual(["/today", "/ask-amy", "/for-child"]);

    expect(nav.back()).toBe("/ask-amy");
    expect(nav.location).toBe("/ask-amy");
    expect(nav.stack).toEqual(["/today", "/ask-amy"]);

    expect(nav.back()).toBe("/today");
    expect(nav.location).toBe("/today");
    expect(nav.stack).toEqual(["/today"]);
  });

  it("back at root stays on Today", () => {
    const nav = createV2NavHistory("/today");
    expect(nav.back()).toBe("/today");
    expect(nav.stack).toEqual(["/today"]);
  });

  it("does not push duplicate consecutive paths", () => {
    const nav = createV2NavHistory("/today");
    nav.push("/today");
    expect(nav.stack).toEqual(["/today"]);
  });
});

describe("V2 tab active highlighting helpers", () => {
  it("exposes the three primary tab hrefs", () => {
    expect(V2_TAB_HREFS).toEqual(["/today", "/ask-amy", "/for-child"]);
  });

  it("marks only the matching tab active for each shell path", () => {
    expect(isV2TabActive("/today", "/today")).toBe(true);
    expect(isV2TabActive("/today", "/ask-amy")).toBe(false);
    expect(isV2TabActive("/today", "/for-child")).toBe(false);

    expect(isV2TabActive("/ask-amy", "/ask-amy")).toBe(true);
    expect(isV2TabActive("/ask-amy", "/today")).toBe(false);

    expect(isV2TabActive("/for-child", "/for-child")).toBe(true);
    expect(isV2TabActive("/for-child", "/today")).toBe(false);
  });

  it("treats nested paths under a tab as active", () => {
    expect(isV2TabActive("/today/extra", "/today")).toBe(true);
    expect(isV2TabActive("/ask-amy/thread", "/ask-amy")).toBe(true);
  });
});
