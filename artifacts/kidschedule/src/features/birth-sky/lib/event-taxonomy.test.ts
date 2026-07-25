import { describe, expect, it } from "vitest";
import {
  BIRTH_SKY_EVENT_NAMES,
  BIRTH_SKY_IM0_EMITTED_EVENTS,
  isBirthSkyEventName,
} from "./event-taxonomy";

describe("birth sky event taxonomy placeholder", () => {
  it("has unique frozen event names", () => {
    expect(new Set(BIRTH_SKY_EVENT_NAMES).size).toBe(BIRTH_SKY_EVENT_NAMES.length);
  });

  it("IM-0 emitted events are a subset of the frozen registry", () => {
    for (const name of BIRTH_SKY_IM0_EMITTED_EVENTS) {
      expect(isBirthSkyEventName(name)).toBe(true);
    }
  });

  it("rejects unknown names", () => {
    expect(isBirthSkyEventName("birth_sky.typo_event")).toBe(false);
  });

  it("includes setup + ceremony names IM-1 must not rename", () => {
    expect(isBirthSkyEventName("birth_sky.setup_completed")).toBe(true);
    expect(isBirthSkyEventName("birth_sky.formation_started")).toBe(true);
    expect(isBirthSkyEventName("birth_sky.reveal_viewed")).toBe(true);
    expect(isBirthSkyEventName("birth_sky.dashboard_entered")).toBe(true);
  });

  it("IM-6: includes Pack 9–10 lens platform lifecycle events", () => {
    expect(isBirthSkyEventName("birth_sky.lens_registered")).toBe(true);
    expect(isBirthSkyEventName("birth_sky.lens_loaded")).toBe(true);
    expect(isBirthSkyEventName("birth_sky.lens_failed")).toBe(true);
    expect(isBirthSkyEventName("birth_sky.lens_unloaded")).toBe(true);
  });
});
