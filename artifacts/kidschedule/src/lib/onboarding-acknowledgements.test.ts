import { describe, expect, it } from "vitest";
import { getAmyAcknowledgement, prependAcknowledgement } from "./onboarding-acknowledgements";

const t = ((key: string, opts?: Record<string, string>) => {
  if (opts) {
    return `${key}:${Object.entries(opts).map(([, v]) => v).join("|")}`;
  }
  return key;
}) as import("i18next").TFunction;

describe("onboarding-acknowledgements", () => {
  it("returns age acknowledgement with child name", () => {
    const ack = getAmyAcknowledgement("age", { childName: "Aarav", t });
    expect(ack).toContain("Aarav");
    expect(ack).toContain("ack_age");
  });

  it("returns sleep acknowledgement without extra steps", () => {
    const ack = getAmyAcknowledgement("sleep", { t });
    expect(ack).toContain("ack_sleep");
  });

  it("prepends acknowledgement before next Amy message", () => {
    const result = prependAcknowledgement("Next question?", "Great choice.");
    expect(result).toEqual(["Great choice.", "Next question?"]);
  });

  it("returns messages unchanged when acknowledgement is null", () => {
    expect(prependAcknowledgement("Only one", null)).toBe("Only one");
    expect(prependAcknowledgement(undefined, null)).toBeUndefined();
  });
});
