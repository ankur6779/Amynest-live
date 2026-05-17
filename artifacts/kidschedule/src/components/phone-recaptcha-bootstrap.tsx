import { useEffect } from "react";
import { firebaseAuth } from "@/lib/firebase";
import {
  ensureRecaptchaContainer,
  ensureRecaptchaReady,
  shouldPreRenderPhoneRecaptcha,
} from "@workspace/phone-auth";

/**
 * Pre-render reCAPTCHA at app root — skipped on Android PWA (iframe crashes WebView).
 */
export function PhoneRecaptchaBootstrap() {
  useEffect(() => {
    ensureRecaptchaContainer();
    if (!shouldPreRenderPhoneRecaptcha()) {
      console.info("[phone-recaptcha-bootstrap] skip pre-render (Android PWA)");
      return;
    }
    void ensureRecaptchaReady(firebaseAuth).catch((err) => {
      console.warn("[phone-recaptcha-bootstrap] setup failed", err);
    });
  }, []);

  return null;
}
