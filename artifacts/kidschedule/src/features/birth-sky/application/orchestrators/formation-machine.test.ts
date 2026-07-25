import { describe, expect, it } from "vitest";
import {
  createFormationMachine,
  isBackDisabled,
  tickFormationMachine,
} from "./formation-machine";

describe("formation machine", () => {
  it("stays forming until min ceremony even if snapshot ready early", () => {
    let m = createFormationMachine();
    m = tickFormationMachine(m, { now: 0, snapshotReady: true });
    m = tickFormationMachine(m, { now: 800, snapshotReady: true });
    expect(m.state).toBe("forming");
    expect(isBackDisabled(m.state)).toBe(true);
    m = tickFormationMachine(m, { now: 3200, snapshotReady: true });
    expect(m.state).toBe("converging");
    m = tickFormationMachine(m, { now: 3600, snapshotReady: true });
    expect(m.state).toBe("ready");
  });

  it("enters soft_wait after 5000ms without snapshot", () => {
    let m = createFormationMachine();
    m = tickFormationMachine(m, { now: 0, snapshotReady: false });
    m = tickFormationMachine(m, { now: 5000, snapshotReady: false });
    expect(m.state).toBe("soft_wait");
  });

  it("fails at 15000ms without snapshot", () => {
    let m = createFormationMachine();
    m = tickFormationMachine(m, { now: 0, snapshotReady: false });
    m = tickFormationMachine(m, { now: 15000, snapshotReady: false });
    expect(m.state).toBe("failed");
    expect(m.errorCode).toBe("formation_timeout");
  });
});
