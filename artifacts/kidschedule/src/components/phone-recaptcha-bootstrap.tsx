import { useEffect } from "react";
import { firebaseAuth } from "@/lib/firebase";
import {
  canRunInAppPhoneRecaptcha,
  ensureRecaptchaContainer,
  warmUpRecaptcha,
  warnIfPhoneAuthDomainMissingFromFirebase,
} from "@workspace/phone-auth";

/**
 * Warm up invisible reCAPTCHA at app load — skipped on Android PWA (WebView crash).
 */
export function PhoneRecaptchaBootstrap() {
  useEffect(() => {
    if (!canRunInAppPhoneRecaptcha()) {
      console.info(
        "[phone-recaptcha-bootstrap] skip warmUp — Android PWA uses Chrome for OTP",
      );
      return;
    }
    try {
      ensureRecaptchaContainer();
      warnIfPhoneAuthDomainMissingFromFirebase();
      void warmUpRecaptcha(firebaseAuth).catch((err) => {
        console.warn("[phone-recaptcha-bootstrap] warmUp failed", err);
      });
    } catch (err) {
      console.error("[phone-recaptcha-bootstrap] container missing", err);
    }
  }, []);

  return null;
}
