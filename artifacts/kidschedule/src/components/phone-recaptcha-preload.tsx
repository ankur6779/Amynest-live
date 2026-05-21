import { useEffect } from "react";
import { firebaseAuth } from "@/lib/firebase";
import { canRunInAppPhoneRecaptcha, preloadInvisibleRecaptcha } from "@workspace/phone-auth";

/**
 * Preload invisible reCAPTCHA on auth page mount (browser tab only — never in PWA).
 * Container lives in index.html outside React.
 */
export function PhoneRecaptchaPreload() {
  useEffect(() => {
    if (!canRunInAppPhoneRecaptcha()) {
      console.info("[phone-recaptcha-preload] skipped — browser OTP required for this shell");
      return;
    }

    void preloadInvisibleRecaptcha(firebaseAuth).catch((err) => {
      console.error("[phone-recaptcha-preload]", err);
    });
  }, []);

  return null;
}
