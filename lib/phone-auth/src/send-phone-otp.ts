import { signInWithPhoneNumber, type Auth, type ConfirmationResult } from "firebase/auth";
import {
  canRunInAppPhoneRecaptcha,
  isStandalonePwa,
  shouldUseBrowserForPhoneOtp,
} from "./mobile-phone-environment";
import { logPhoneOtpDomainContext } from "./site-domain";
import {
  getRecaptchaVerifierForSend,
  isRecaptchaReady,
  logRecaptchaState,
  resetRecaptcha,
} from "./recaptcha";

const OTP_TIMEOUT_MS = 30_000;

const HARD_FAIL_MESSAGE =
  "Verification failed. Please refresh the page and try again.";

const NOT_READY_MESSAGE =
  "Security check is still loading. Wait a moment, then try again.";

const PWA_MESSAGE =
  "Please open in browser for OTP verification. The installed app cannot complete phone security checks.";

export type SendPhoneOtpResult =
  | { success: true; confirmation: ConfirmationResult }
  | { success: false; error: string; suggestBrowser?: boolean; needsRefresh?: boolean };

declare global {
  interface Window {
    confirmationResult?: ConfirmationResult;
  }
}

/**
 * Send phone OTP using preloaded invisible reCAPTCHA only — no visible fallback.
 */
export async function sendPhoneOtpSafely(
  auth: Auth,
  phoneNumber: string,
): Promise<SendPhoneOtpResult> {
  const phone = phoneNumber?.trim();
  if (!phone) {
    return { success: false, error: "Invalid phone number" };
  }

  if (!canRunInAppPhoneRecaptcha() || isStandalonePwa()) {
    return {
      success: false,
      error: PWA_MESSAGE,
      suggestBrowser: true,
    };
  }

  if (!isRecaptchaReady()) {
    return {
      success: false,
      error: NOT_READY_MESSAGE,
    };
  }

  try {
    logPhoneOtpDomainContext("sendPhoneOtp");
    logRecaptchaState();

    const appVerifier = getRecaptchaVerifierForSend();

    const confirmation = await Promise.race([
      signInWithPhoneNumber(auth, phone, appVerifier),
      new Promise<ConfirmationResult>((_, reject) => {
        setTimeout(
          () => reject(new Error("Request timed out. Please try again.")),
          OTP_TIMEOUT_MS,
        );
      }),
    ]);

    window.confirmationResult = confirmation;
    console.log("[phone-otp] OTP sent successfully");

    return { success: true, confirmation };
  } catch (error: unknown) {
    console.error("OTP blocked:", error);
    resetRecaptcha();
    if (typeof window !== "undefined") {
      window.recaptchaPreloadFailed = true;
    }

    const message =
      error instanceof Error && error.message === "Recaptcha not ready"
        ? NOT_READY_MESSAGE
        : HARD_FAIL_MESSAGE;

    return {
      success: false,
      error: message,
      needsRefresh: true,
      suggestBrowser: shouldUseBrowserForPhoneOtp(),
    };
  }
}

/** @deprecated */
export const sendPhoneOtp = sendPhoneOtpSafely;
