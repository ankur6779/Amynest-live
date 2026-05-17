import { describe, expect, it, beforeEach } from "vitest";
import { RECAPTCHA_CONTAINER_ID, resetRecaptcha } from "./recaptcha";

describe("recaptcha container", () => {
  beforeEach(() => {
    document.body.innerHTML = `<div id="root"></div><div id="${RECAPTCHA_CONTAINER_ID}"></div>`;
    resetRecaptcha();
  });

  it("expects static container in document", () => {
    expect(document.getElementById(RECAPTCHA_CONTAINER_ID)).toBeTruthy();
  });
});
