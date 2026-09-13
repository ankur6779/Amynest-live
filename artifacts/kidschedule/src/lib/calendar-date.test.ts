import { describe, expect, it } from "vitest";
import { localCalendarDateKey } from "./calendar-date";

describe("localCalendarDateKey", () => {
  it("pads the Date object's local calendar parts", () => {
    expect(localCalendarDateKey(new Date(2026, 0, 9, 8, 0, 0))).toBe("2026-01-09");
    expect(localCalendarDateKey(new Date(2026, 8, 13, 23, 45, 0))).toBe("2026-09-13");
  });

  it("stays on the local calendar day around UTC midnight", () => {
    const justAfterLocalMidnight = new Date(2026, 8, 14, 0, 15, 0);
    expect(localCalendarDateKey(justAfterLocalMidnight)).toBe("2026-09-14");
    const utcStamp = justAfterLocalMidnight.toISOString().slice(0, 10);
    if (justAfterLocalMidnight.getTimezoneOffset() > 0) {
      expect(utcStamp).toBe("2026-09-13");
    }
  });

  it("is not the UTC ISO date when local and UTC days differ", () => {
    const utcEvening = new Date(Date.UTC(2026, 8, 13, 22, 30, 0));
    const local = localCalendarDateKey(utcEvening);
    const utc = utcEvening.toISOString().slice(0, 10);
    expect(utc).toBe("2026-09-13");
    expect(local).toBe(
      [
        utcEvening.getFullYear(),
        String(utcEvening.getMonth() + 1).padStart(2, "0"),
        String(utcEvening.getDate()).padStart(2, "0"),
      ].join("-"),
    );
    if (utcEvening.getTimezoneOffset() < 0) {
      expect(local).not.toBe(utc);
    }
  });
});
