import { signInWithPhoneNumber, type Auth, type ConfirmationResult } from "firebase/auth";
import { shouldUseBrowserForPhoneOtp } from "./mobile-phone-environment";
import { logPhoneOtpDomainContext } from "./site-domain";
import {
  resetRecaptchaOnFailure,
  setupRecaptcha,
  warmUpRecaptcha,
  logRecaptchaState,
} from "./phone-recaptcha";

export const PHONE_OTP_SEND_TIMEOUT_MS = 30_000;

export type SendPhoneOtpResult =
  | { success: true; confirmation: ConfirmationResult }
  | { success: false; error: string; suggestBrowser?: boolean };

declare global {
  interface Window {
    confirmationResult?: ConfirmationResult;
  }
}

/**
 * Replit-style OTP: reuse verifier created on page load, reset only on failure.
 */
export async function sendPhoneOtpSafely(
  auth: Auth,
  phoneNumber: string,
): Promise<SendPhoneOtpResult> {
  const phone = phoneNumber?.trim();
  if (!phone) {
    return { success: false, error: "No phone number" };
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
      suggestBrowser: shouldUseBrowserForPhoneOtp(),
    };
  }
}
