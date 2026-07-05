import { describe, expect, it } from "vitest";
import { amy3dToStageState, stageStateToAssetKey } from "./amy-stage-state";

describe("amy-stage-state", () => {
  it("maps Amy3D states to stage states", () => {
    expect(amy3dToStageState("speaking")).toBe("talking");
    expect(amy3dToStageState("idle", { speaking: true })).toBe("talking");
    expect(amy3dToStageState("listening")).toBe("listening");
    expect(amy3dToStageState("thinking")).toBe("thinking");
    expect(amy3dToStageState("celebrating")).toBe("celebrating");
    expect(amy3dToStageState("encouraging")).toBe("idle");
  });

  it("maps stage states to asset keys", () => {
    expect(stageStateToAssetKey("listening")).toBe("listening");
    expect(stageStateToAssetKey("thinking")).toBe("thinking");
    expect(stageStateToAssetKey("celebrating")).toBe("happy");
    expect(stageStateToAssetKey("idle")).toBe("idle");
  });
});
