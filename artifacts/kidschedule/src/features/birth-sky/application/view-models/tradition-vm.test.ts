import { describe, expect, it } from "vitest";
import { buildTraditionSegmentVM } from "./tradition-vm";
import type { TraditionalData } from "../../domain/models/traditional-data";
import { TRADITIONAL_CONTENT_VERSION } from "../../constants/traditional-content";

const data: TraditionalData = {
  lens: "tradition",
  profileId: "p1",
  snapshotVersion: "ss_1",
  traditionalContentVersion: TRADITIONAL_CONTENT_VERSION,
  mode: "day_sky",
  lunarMansionKey: "mansion_01",
  sunSign: "Cancer",
  moonSign: "Libra",
  moonPhaseLabel: "Full Moon",
  risingSign: null,
  timePrecision: "unknown",
};

describe("buildTraditionSegmentVM", () => {
  it("keeps astronomy and tradition separated with disclaimers", () => {
    const vm = buildTraditionSegmentVM(data, { showTradition: true });
    expect(vm.status).toBe("ready");
    expect(vm.disclaimer.toLowerCase()).toContain("not scientific");
    expect(vm.traditionLimited).toBe(true);
    expect(vm.visibleCards.every((c) => c.eyebrow === "In tradition")).toBe(true);
    expect(vm.traditionalContentVersion).toBe(TRADITIONAL_CONTENT_VERSION);
  });

  it("locks time-dependent cards on Day Sky", () => {
    const vm = buildTraditionSegmentVM(data, { showTradition: true });
    const rising = [...vm.visibleCards, ...vm.moreCards].find(
      (c) => c.id === "trad_rising_theme",
    );
    expect(rising?.locked).toBe(true);
  });

  it("hides content when astronomy-only path selected", () => {
    const vm = buildTraditionSegmentVM(data, { showTradition: false });
    expect(vm.status).toBe("empty_hidden");
    expect(vm.visibleCards).toHaveLength(0);
  });

  it("does not alter snapshotVersion when content version is present", () => {
    const vm = buildTraditionSegmentVM(data, { showTradition: true });
    expect(vm.snapshotVersion).toBe("ss_1");
    expect(vm.traditionalContentVersion).not.toBe(vm.snapshotVersion);
  });
});
