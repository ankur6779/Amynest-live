import { useEffect } from "react";
import { firebaseAuth } from "@/lib/firebase";
import {
  ensureRecaptchaContainer,
  warmUpRecaptcha,
  warnIfPhoneAuthDomainMissingFromFirebase,
} from "@workspace/phone-auth";

/**
 * Create + render invisible reCAPTCHA once at app load (not on Send OTP click).
 */
export function PhoneRecaptchaBootstrap() {
  useEffect(() => {
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
