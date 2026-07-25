import assert from "node:assert/strict";
import { describe, it, mock } from "node:test";
import {
  PYTHON_EPHEMERIS_ADAPTER_ID,
  createPythonEphemerisAdapter,
} from "./python-ephemeris-adapter.js";

describe("createPythonEphemerisAdapter", () => {
  it("is engine-agnostic and maps daemon response", async () => {
    assert.equal(PYTHON_EPHEMERIS_ADAPTER_ID, "python-ephemeris-adapter");
    const astronomy = {
      bodies: [
        { id: "sun", eclipticLongitudeDeg: 100, sign: "Cancer" },
        { id: "moon", eclipticLongitudeDeg: 200, sign: "Libra" },
      ],
      sunSign: "Cancer",
      moonSign: "Libra",
      moonPhase: "full",
      moonPhaseLabel: "Full Moon",
      risingSign: "Aries",
      houses: null,
      precision: { timePrecision: "exact", placeProvided: true },
      quality: "high",
      metadata: {
        calculationSource: "Skyfield",
        kernel: "DE440",
      },
    };

    const fetchMock = mock.method(globalThis, "fetch", async () =>
      new Response(
        JSON.stringify({
          ok: true,
          mode: "full",
          engineVersion: "skyfield-jpl/1.0.0",
          astronomy,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    try {
      const port = createPythonEphemerisAdapter();
      assert.equal(port.isTemporaryAdapter, false);
      const result = await port.compute({
        birthDate: "2000-01-01",
        birthTime: "12:00",
        timePrecision: "exact",
        lat: 1,
        lon: 2,
        timezoneOffsetMinutes: 0,
      });
      assert.equal(result.mode, "full");
      assert.equal(result.engineVersion, "skyfield-jpl/1.0.0");
      assert.equal(result.astronomy.sunSign, "Cancer");
      assert.equal(port.engineVersion, "skyfield-jpl/1.0.0");
    } finally {
      fetchMock.mock.restore();
    }
  });
});
