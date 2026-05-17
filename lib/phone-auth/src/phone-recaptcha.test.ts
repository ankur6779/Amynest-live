import { describe, expect, it, beforeEach } from "vitest";
import {
  RECAPTCHA_CONTAINER_ID,
  ensureRecaptchaContainer,
  resetRecaptchaOnFailure,
} from "./phone-recaptcha";

describe("ensureRecaptchaContainer", () => {
  beforeEach(() => {
    document.body.innerHTML = `<div id="${RECAPTCHA_CONTAINER_ID}"></div>`;
    resetRecaptchaOnFailure();
  });

  it("finds static container in index.html", () => {
    const el = ensureRecaptchaContainer();
    expect(el.id).toBe(RECAPTCHA_CONTAINER_ID);
    ensureRecaptchaContainer();
    expect(document.querySelectorAll(`#${RECAPTCHA_CONTAINER_ID}`).length).toBe(1);
  });
});
