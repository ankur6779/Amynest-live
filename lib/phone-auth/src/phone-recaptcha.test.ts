import { describe, expect, it, beforeEach } from "vitest";
import {
  RECAPTCHA_CONTAINER_ID,
  ensureRecaptchaContainer,
  clearRecaptchaOnFailure,
} from "./phone-recaptcha";

describe("ensureRecaptchaContainer", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    clearRecaptchaOnFailure();
  });

  it("creates a single hidden container", () => {
    ensureRecaptchaContainer();
    ensureRecaptchaContainer();
    expect(document.querySelectorAll(`#${RECAPTCHA_CONTAINER_ID}`).length).toBe(1);
  });
});
