import { describe, expect, it } from "vitest";
import {
  V2_PREPARE_BLOCK,
  V2_PREPARE_COPY,
  V2_PULSE_BAR,
  V2_PULSE_INLINE,
} from "./preparation";

describe("Wave C calm preparation", () => {
  it("uses one Nest skeleton language (v2-prepare-skeleton)", () => {
    for (const token of [V2_PULSE_BAR, V2_PREPARE_BLOCK, V2_PULSE_INLINE]) {
      expect(token).toMatch(/v2-prepare-skeleton/);
      expect(token).not.toMatch(/premium-skeleton|route-shimmer/);
      expect(token.toLowerCase()).not.toMatch(/spin|bounce/);
    }
  });

  it("copy communicates preparation, not delay", () => {
    const values = Object.values(V2_PREPARE_COPY).join(" ").toLowerCase();
    expect(values).toMatch(/prepar|continu|saving|shaping|looking/);
    expect(values).not.toMatch(/please wait|loading\.\.\.|almost there/);
    expect(V2_PREPARE_COPY.quiet).toMatch(/quietly preparing/);
    expect(V2_PREPARE_COPY.continueWays).toMatch(/Preparing ways/);
    expect(V2_PREPARE_COPY.signupBusy).toMatch(/Saving your place/);
  });
});
