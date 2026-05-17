import { signInWithPhoneNumber, type Auth, type ConfirmationResult } from "firebase/auth";
import {
  canRunInAppPhoneRecaptcha,
  isAndroidPwa,
  shouldUseBrowserForPhoneOtp,
} from "./mobile-phone-environment";
import { logPhoneOtpDomainContext } from "./site-domain";
import {
  resetRecaptchaOnFailure,
  setupRecaptcha,
  warmUpRecaptcha,
  logRecaptchaState,
} from "./phone-recaptcha";

export const PHONE_OTP_SEND_TIMEOUT_MS = 30_000;

const ANDROID_PWA_OTP_MESSAGE =
  "Phone login in the installed app opens Chrome for security. Tap the button below.";

export type SendPhoneOtpResult =
  | { success: true; confirmation: ConfirmationResult }
  | { success: false; error: string; suggestBrowser?: boolean };

declare global {
  interface Window {
    confirmationResult?: ConfirmationResult;
  }
}

/**
 * Replit-style OTP in browser; never loads reCAPTCHA in Android PWA (process crash).
 */
export async function sendPhoneOtpSafely(
  auth: Auth,
  phoneNumber: string,
): Promise<SendPhoneOtpResult> {
  const phone = phoneNumber?.trim();
  if (!phone) {
    return { success: false, error: "No phone number" };
  }

  if (!canRunInAppPhoneRecaptcha()) {
    console.warn("[phone-otp] Blocked in-app OTP — Android PWA cannot run reCAPTCHA");
    return {
      success: false,
      error: ANDROID_PWA_OTP_MESSAGE,
      suggestBrowser: true,
    };
  }

  try {
    logPhoneOtpDomainContext("sendOTP");
    logRecaptchaState();

    let verifier = setupRecaptcha(auth);
    if (window.recaptchaWidgetId === undefined) {
      verifier = await warmUpRecaptcha(auth);
    }

    const confirmation = await Promise.race([
      signInWithPhoneNumber(auth, phone, verifier),
      new Promise<ConfirmationResult>((_, reject) => {
        setTimeout(
          () => reject(new Error("Request timed out. Please try again.")),
          PHONE_OTP_SEND_TIMEOUT_MS,
        );
      }),
    ]);

    window.confirmationResult = confirmation;
    console.log("[phone-otp] OTP sent successfully");
    return { success: true, confirmation };
  } catch (err: unknown) {
    console.error("OTP error:", err);

    try {
      resetRecaptchaOnFailure();
    } catch (resetErr) {
      console.warn("[phone-otp] reset after failure", resetErr);
    }

    const message =
      err instanceof Error ? err.message : "Failed to send OTP. Please try again.";

    return {
      success: false,
      error: message,
      suggestBrowser: isAndroidPwa() || shouldUseBrowserForPhoneOtp(),
    };
  }
}
