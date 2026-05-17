import { firebaseAuth } from "@/lib/firebase";
import { getApiUrl } from "@/lib/api";

export type SendOtpResponse =
  | { ok: true; cooldownSeconds: number; devOtp?: string }
  | { error: string; message?: string; cooldownSeconds?: number };

export type VerifyOtpResponse =
  | { ok: true; user: { uid: string; email: string; emailVerified: true } }
  | { error: string; message?: string; attemptsRemaining?: number };

async function authHeaders(): Promise<HeadersInit> {
  const user = firebaseAuth.currentUser;
  if (!user) throw new Error("not_signed_in");
  const token = await user.getIdToken();
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export async function sendEmailOtpApi(email: string): Promise<SendOtpResponse> {
  if (import.meta.env.DEV) {
    console.info("[email-otp] Sending OTP to:", email.trim());
  }

  const headers = await authHeaders();
  const url = getApiUrl("/api/auth/send-otp");
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ email: email.trim() }),
    });
  } catch (err) {
    console.error("[email-otp] Network error:", err);
    return {
      error: "network_error",
      message: err instanceof Error ? err.message : "Network request failed",
    };
  }

  let data: Record<string, unknown>;
  try {
    data = (await res.json()) as Record<string, unknown>;
  } catch {
    console.error("[email-otp] Non-JSON response", res.status, url);
    return {
      error: "invalid_response",
      message: `Server returned ${res.status} without JSON`,
    };
  }

  if (import.meta.env.DEV) {
    console.info("[email-otp] Response:", res.status, data);
  }

  if (res.ok && data.ok === true) {
    const devOtp = typeof data.devOtp === "string" ? data.devOtp : undefined;
    return {
      ok: true,
      cooldownSeconds: Number(data.cooldownSeconds ?? 45),
      devOtp,
    };
  }
  return {
    error: String(data.error ?? "send_failed"),
    message: typeof data.message === "string" ? data.message : undefined,
    cooldownSeconds:
      typeof data.cooldownSeconds === "number" ? data.cooldownSeconds : undefined,
  };
}

export async function verifyEmailOtpApi(
  email: string,
  otp: string,
): Promise<VerifyOtpResponse> {
  const headers = await authHeaders();
  const res = await fetch(getApiUrl("/api/auth/verify-otp"), {
    method: "POST",
    headers,
    body: JSON.stringify({ email: email.trim(), otp: otp.trim() }),
  });
  const data = (await res.json()) as Record<string, unknown>;
  if (res.ok && data.ok === true && data.user && typeof data.user === "object") {
    const user = data.user as { uid: string; email: string; emailVerified: boolean };
    return {
      ok: true,
      user: {
        uid: user.uid,
        email: user.email,
        emailVerified: true,
      },
    };
  }
  return {
    error: String(data.error ?? "verify_failed"),
    message: typeof data.message === "string" ? data.message : undefined,
    attemptsRemaining:
      typeof data.attemptsRemaining === "number" ? data.attemptsRemaining : undefined,
  };
}
