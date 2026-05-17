import { describe, expect, it, beforeEach } from "vitest";
import {
  RECAPTCHA_CONTAINER_ID,
  ensureRecaptchaContainer,
  clearPhoneRecaptchaVerifier,
} from "./phone-recaptcha";

describe("ensureRecaptchaContainer", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    clearPhoneRecaptchaVerifier();
  });

  it("creates a single hidden container", () => {
    ensureRecaptchaContainer();
    ensureRecaptchaContainer();
    expect(document.querySelectorAll(`#${RECAPTCHA_CONTAINER_ID}`).length).toBe(1);
  });
});
