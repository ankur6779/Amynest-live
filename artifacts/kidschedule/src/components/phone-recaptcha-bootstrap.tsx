import { useEffect } from "react";
import { firebaseAuth } from "@/lib/firebase";
import {
  ensureRecaptchaContainer,
  ensureRecaptchaReady,
} from "@workspace/phone-auth";

/**
 * Pre-render invisible reCAPTCHA once at app root (#recaptcha-container in index.html).
 */
export function PhoneRecaptchaBootstrap() {
  useEffect(() => {
    ensureRecaptchaContainer();
    void ensureRecaptchaReady(firebaseAuth).catch((err) => {
      console.warn("[phone-recaptcha-bootstrap] setup failed", err);
    });
  }, []);

  return null;
}
