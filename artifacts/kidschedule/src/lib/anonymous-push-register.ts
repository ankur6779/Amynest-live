/**
 * Registers FCM token for pre-signup CRM (Segment 2) when user is not signed in.
 * Gated by NOTIF_PRESIGNUP_SERVER_FCM server flag + client feature flag.
 */
import { getApiUrl } from "@/lib/api";
import { getDeviceMetadata, getOrCreateDeviceId } from "@/lib/device-id";
import {
  ensureNativePushReady,
  getBrowserNotificationPermission,
  getNativePushBridge,
  getNativePushToken,
  isAmyNestWrapper,
} from "@/lib/native-push-bridge";

const RC_CACHE_MS = 60_000;
let rcCache: { at: number; preSignupServerFcm: boolean } | null = null;

async function isPreSignupServerFcmEnabled(): Promise<boolean> {
  const now = Date.now();
  if (rcCache && now - rcCache.at < RC_CACHE_MS) {
    return rcCache.preSignupServerFcm;
  }
  try {
    const res = await fetch(getApiUrl("/api/remote-config/notifications"));
    if (!res.ok) return false;
    const data = (await res.json()) as { preSignupServerFcm?: boolean };
    rcCache = { at: now, preSignupServerFcm: Boolean(data.preSignupServerFcm) };
    return rcCache.preSignupServerFcm;
  } catch {
    return false;
  }
}

export async function registerAnonymousPushToken(token: string): Promise<boolean> {
  if (!isAmyNestWrapper()) return false;
  if (getBrowserNotificationPermission() === "denied") return false;
  if (!(await isPreSignupServerFcmEnabled())) return false;

  const meta = getDeviceMetadata();
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata";

  try {
    const res = await fetch(getApiUrl("/api/push/register-anonymous"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deviceId: getOrCreateDeviceId(),
        token,
        platform: meta.platform,
        deviceName: meta.deviceName,
        locale: navigator.language?.slice(0, 5) ?? "en",
        timezone,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Best-effort server FCM registration for pre-signup CRM when permission is granted. */
export async function registerAnonymousPushFromNative(): Promise<boolean> {
  const facade = getNativePushBridge();
  if (!facade) return false;
  await ensureNativePushReady();
  if (facade.getPermissionStatus() !== "granted") return false;
  const token = await getNativePushToken(facade);
  if (!token) return false;
  return registerAnonymousPushToken(token);
}
