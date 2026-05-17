import { useEffect } from "react";
import {
  applyRecaptchaContainerLayout,
  ensureRecaptchaContainer,
  warnIfPhoneAuthDomainMissingFromFirebase,
} from "@workspace/phone-auth";

/**
 * Domain diagnostics only — do NOT load reCAPTCHA here (crashes Chrome + PWA on boot).
 */
export function PhoneRecaptchaBootstrap() {
  useEffect(() => {
    try {
      const el = ensureRecaptchaContainer();
      applyRecaptchaContainerLayout(el);
      warnIfPhoneAuthDomainMissingFromFirebase();
    } catch (err) {
      console.error("[phone-recaptcha-bootstrap] container missing", err);
    }
  }, []);

  return null;
}
