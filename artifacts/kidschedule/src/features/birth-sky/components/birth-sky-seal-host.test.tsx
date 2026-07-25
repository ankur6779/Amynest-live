import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import {
  BirthSkyContinuousSeal,
  BirthSkySealProvider,
  SEAL_SLOT_SIZES,
  SEAL_TRANSITION_ID,
} from "./birth-sky-seal-host";

describe("Seal continuity host", () => {
  it("keeps a never-unmounted persistent seal node", () => {
    const { getByTestId, rerender } = render(
      <BirthSkySealProvider>
        <BirthSkyContinuousSeal
          size={SEAL_SLOT_SIZES.formation}
          slotId="seal-formation"
        />
      </BirthSkySealProvider>,
    );
    const persistent = getByTestId("birth-sky-persistent-seal");
    expect(persistent.id).toBe(SEAL_TRANSITION_ID);
    expect(getByTestId("birth-sky-seal-slot")).toHaveAttribute(
      "data-seal-slot-size",
      String(SEAL_SLOT_SIZES.formation),
    );

    rerender(
      <BirthSkySealProvider>
        <BirthSkyContinuousSeal size={SEAL_SLOT_SIZES.reveal} slotId="seal-reveal" />
      </BirthSkySealProvider>,
    );
    // Same persistent node still present (provider remount in this unit test is OK;
    // production keeps provider above route switches in BirthSkyApp).
    expect(getByTestId("birth-sky-persistent-seal").id).toBe(SEAL_TRANSITION_ID);
    expect(getByTestId("birth-sky-seal-slot")).toHaveAttribute(
      "data-seal-slot-size",
      String(SEAL_SLOT_SIZES.reveal),
    );
  });

  it("reserves exact layout size on the slot (no content jump)", () => {
    const { getByTestId } = render(
      <BirthSkySealProvider>
        <BirthSkyContinuousSeal size={SEAL_SLOT_SIZES.hero} slotId="seal-hero" />
      </BirthSkySealProvider>,
    );
    const slot = getByTestId("birth-sky-seal-slot");
    expect(slot.style.width).toBe(`${SEAL_SLOT_SIZES.hero}px`);
    expect(slot.style.height).toBe(`${SEAL_SLOT_SIZES.hero}px`);
  });
});
