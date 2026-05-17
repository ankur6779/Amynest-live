import { signInWithPhoneNumber, type Auth, type ConfirmationResult } from "firebase/auth";
import { isAndroidPwa, shouldUseBrowserForPhoneOtp } from "./mobile-phone-environment";
import { logPhoneOtpDomainContext } from "./site-domain";
import { ensureRecaptchaReady, hardResetRecaptcha } from "./phone-recaptcha";

export const PHONE_OTP_SEND_TIMEOUT_MS = 10_000;

export type SendPhoneOtpResult =
  | { success: true; confirmation: ConfirmationResult }
  | { success: false; error: string; suggestBrowser?: boolean };

declare global {
  interface Window {
    confirmationResult?: ConfirmationResult;
  }
}

/**
 * Crash-proof phone OTP send — never throws; hard-resets reCAPTCHA on failure.
 */
export async function sendPhoneOtpSafely(
  auth: Auth,
  phoneNumber: string,
): Promise<SendPhoneOtpResult> {
  try {
    const phone = phoneNumber?.trim();
    if (!phone) {
      return { success: false, error: "No phone number" };
    }

    logPhoneOtpDomainContext("sendPhoneOtpSafely");
    const verifier = await ensureRecaptchaReady(auth);
    if (!verifier) {
      return {
        success: false,
        error: "Recaptcha failed. Please try again.",
        suggestBrowser: shouldUseBrowserForPhoneOtp(),
      };
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
    console.error("OTP crash:", err);

    try {
      hardResetRecaptcha();
    } catch (resetErr) {
      console.warn("[phone-otp] hard reset after failure", resetErr);
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
