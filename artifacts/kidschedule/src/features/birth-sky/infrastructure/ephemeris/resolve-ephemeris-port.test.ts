import { describe, expect, it } from "vitest";
import { BIRTH_SKY_ENGINE_VERSION_WRITES } from "../../domain/models/birth-profile";
import { getEphemerisPort } from "./resolve-ephemeris-port";

describe("getEphemerisPort (client stub)", () => {
  it("exposes remote engine version hint and rejects browser compute", async () => {
    const port = getEphemerisPort();
    expect(port.engineVersion).toBe(BIRTH_SKY_ENGINE_VERSION_WRITES);
    expect(port.isTemporaryAdapter).toBe(false);
    await expect(
      port.compute({
        birthDate: "2000-01-01",
        birthTime: "12:00",
        timePrecision: "exact",
        lat: 1,
        lon: 2,
      }),
    ).rejects.toThrow(/ephemeris_server_only/);
  });
});
