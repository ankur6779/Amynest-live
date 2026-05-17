import { useEffect } from "react";
import { firebaseAuth } from "@/lib/firebase";
import {
  ensureRecaptchaContainer,
  setupPhoneRecaptcha,
} from "@workspace/phone-auth";

/**
 * Initializes invisible reCAPTCHA once at app root (outside sign-in modal).
 * #recaptcha-container also exists in index.html — never unmount with routes.
 */
export function PhoneRecaptchaBootstrap() {
  useEffect(() => {
    ensureRecaptchaContainer();
    void setupPhoneRecaptcha(firebaseAuth).catch((err) => {
      console.warn("[phone-recaptcha-bootstrap] setup failed", err);
    });
  }, []);

  return null;
}
