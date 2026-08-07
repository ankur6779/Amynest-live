import { describe, expect, it } from "vitest";
import {
  ASK_AMY_COMPANION_QUERY,
  ASK_AMY_QUIET_PATHS,
  ASK_AMY_STREAM_TILE_ID,
  askAmyPathForDestination,
  askAmyPathForTile,
  assistantCompanionshipHref,
  isAskAmyLivingV1Enabled,
  recommendAskAmyAction,
} from "./living-room";

describe("ask-amy living-room", () => {
  it("covers Ask Amy + Emotional as one companionship spine", () => {
    expect(ASK_AMY_QUIET_PATHS.map((p) => p.id)).toEqual(["ask", "feelings"]);
    expect(ASK_AMY_QUIET_PATHS[0]?.destinationId).toBe("ask-amy");
    expect(ASK_AMY_QUIET_PATHS[1]?.destinationId).toBe("emotional");
  });

  it("recommends companionship — not chatbot language", () => {
    const r = recommendAskAmyAction("Emma");
    expect(r.title.toLowerCase()).toContain("here");
    expect(r.title.toLowerCase()).not.toContain("assistant");
    expect(r.title.toLowerCase()).not.toContain("chatbot");
    expect(r.pathId).toBe("ask");
  });

  it("maps tiles and destinations", () => {
    expect(askAmyPathForTile("amy-ai")).toBe("ask");
    expect(askAmyPathForTile("emotional")).toBe("feelings");
    expect(askAmyPathForDestination("emotional")).toBe("feelings");
  });

  it("builds companion soft-enter href without rewriting APIs", () => {
    expect(assistantCompanionshipHref("hello")).toContain(ASK_AMY_COMPANION_QUERY);
    expect(assistantCompanionshipHref("hello")).toContain("q=hello");
    expect(ASK_AMY_STREAM_TILE_ID).toBe("__ask_amy_stream__");
  });

  it("living flag defaults ON", () => {
    expect(isAskAmyLivingV1Enabled()).toBe(true);
  });
});
