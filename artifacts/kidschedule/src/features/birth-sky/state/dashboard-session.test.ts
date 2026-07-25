import { describe, expect, it } from "vitest";
import {
  bindSnapshotVersion,
  createDashboardSession,
  selectSkyBody,
} from "./dashboard-session";

describe("dashboard session map selection", () => {
  it("keeps selection across segment switches in-session", () => {
    let s = createDashboardSession("sky");
    s = selectSkyBody(s, "moon");
    s = { ...s, activeSegment: "astronomy" };
    s = { ...s, activeSegment: "sky" };
    expect(s.selectedBody).toBe("moon");
  });

  it("clears selection when snapshotVersion changes", () => {
    let s = createDashboardSession();
    s = bindSnapshotVersion(s, "ss_1");
    s = selectSkyBody(s, "sun");
    s = bindSnapshotVersion(s, "ss_2");
    expect(s.selectedBody).toBeNull();
  });
});
