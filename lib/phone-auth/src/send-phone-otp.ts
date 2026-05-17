import { signInWithPhoneNumber, type Auth, type ConfirmationResult } from "firebase/auth";
import { logPhoneOtpDomainContext } from "./site-domain";
import { getRecaptcha, logRecaptchaState, resetRecaptcha } from "./recaptcha";

const OTP_TIMEOUT_MS = 30_000;

export type SendPhoneOtpResult =
  | { success: true; confirmation: ConfirmationResult }
  | { success: false; error: string };

declare global {
  interface Window {
    confirmationResult?: ConfirmationResult;
  }
}

/**
 * Send phone OTP — no throw; resets recaptcha only on failure.
 */
export async function sendPhoneOtp(
  auth: Auth,
  phoneNumber: string,
): Promise<SendPhoneOtpResult> {
  try {
    const phone = phoneNumber?.trim();
    if (!phone) {
      throw new Error("Invalid phone number");
    }

    logPhoneOtpDomainContext("sendPhoneOtp");
    logRecaptchaState();

    const appVerifier = getRecaptcha(auth);

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

    return { success: false, error: message };
  }
}

/** @deprecated */
export const sendPhoneOtpSafely = sendPhoneOtp;
