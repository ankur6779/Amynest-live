import { signInWithPhoneNumber, type Auth, type ConfirmationResult } from "firebase/auth";
import {
  canRunInAppPhoneRecaptcha,
  isAndroidPwa,
  shouldUseBrowserForPhoneOtp,
} from "./mobile-phone-environment";
import { logPhoneOtpDomainContext } from "./site-domain";
import {
  prepareRecaptchaForSend,
  resetRecaptchaOnFailure,
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
 * Lazy reCAPTCHA: load only on Send OTP (never at app boot).
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
    return {
      success: false,
      error: "Installed app cannot run security check here. Use Open in Chrome below.",
      suggestBrowser: true,
    };
  }

  try {
    logPhoneOtpDomainContext("sendOTP");
    logRecaptchaState();

    const verifier = await prepareRecaptchaForSend(auth);

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
