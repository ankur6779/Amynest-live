import { describe, expect, it } from "vitest";
import { getTtsProvider } from "../env.js";

describe("getTtsProvider", () => {
  it("always returns openai", () => {
    expect(getTtsProvider()).toBe("openai");
  });
});
