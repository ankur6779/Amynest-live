import { signInWithPhoneNumber, type Auth, type ConfirmationResult } from "firebase/auth";
import {
  canRunInAppPhoneRecaptcha,
  isAndroidPwa,
  shouldUseBrowserForPhoneOtp,
} from "./mobile-phone-environment";
import { logPhoneOtpDomainContext } from "./site-domain";
import { logRecaptchaState, prepareRecaptchaForSend, resetRecaptcha } from "./recaptcha";

const OTP_TIMEOUT_MS = 30_000;

export type SendPhoneOtpResult =
  | { success: true; confirmation: ConfirmationResult }
  | { success: false; error: string; suggestBrowser?: boolean };

declare global {
  interface Window {
    confirmationResult?: ConfirmationResult;
  }
}

/**
 * Send phone OTP — await reCAPTCHA render before signInWithPhoneNumber.
 * Never throws; resets recaptcha on failure.
 */
export async function sendPhoneOtpSafely(
  auth: Auth,
  phoneNumber: string,
): Promise<SendPhoneOtpResult> {
  const phone = phoneNumber?.trim();
  if (!phone) {
    return { success: false, error: "Invalid phone number" };
  }

  if (!canRunInAppPhoneRecaptcha()) {
    return {
      success: false,
      error:
        "Installed app cannot run the security check here. Tap Open in Chrome below.",
      suggestBrowser: true,
    };
  }

  try {
    logPhoneOtpDomainContext("sendPhoneOtp");
    logRecaptchaState();

    const appVerifier = await prepareRecaptchaForSend(auth);

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
    console.error("OTP FAILED:", error);
    resetRecaptcha();

    const message =
      error instanceof Error ? error.message : "OTP failed. Please try again.";

    return {
      success: false,
      error: message,
      suggestBrowser: isAndroidPwa() || shouldUseBrowserForPhoneOtp(),
    };
  }
}

/** @deprecated Use sendPhoneOtpSafely */
export const sendPhoneOtp = sendPhoneOtpSafely;
