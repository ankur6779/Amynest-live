import { useEffect } from "react";
import { firebaseAuth } from "@/lib/firebase";
import { isStandalonePwa, preloadInvisibleRecaptcha } from "@workspace/phone-auth";

/**
 * Preload invisible reCAPTCHA on auth page mount (browser tab only — never in PWA).
 * Container lives in index.html outside React.
 */
export function PhoneRecaptchaPreload() {
  useEffect(() => {
    if (isStandalonePwa()) {
      console.info("[phone-recaptcha-preload] skipped — standalone PWA");
      return;
    }

    void preloadInvisibleRecaptcha(firebaseAuth).catch((err) => {
      console.error("[phone-recaptcha-preload]", err);
    });
  }, []);

  return null;
}
