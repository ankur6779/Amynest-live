import { getApiUrl } from "@/lib/api";
import {
  detectBrowser,
  detectDeviceName,
  detectDevicePlatform,
  detectOS,
  getAppVersion,
  getOrCreateDeviceId,
} from "@/lib/device-id";
import { track } from "@/lib/analytics";

export type UserDeviceRecord = {
  id: number;
  deviceId: string;
  deviceName: string | null;
  platform: string;
  browser?: string | null;
  os?: string | null;
  appVersion?: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
  isActive: boolean;
  isCurrent: boolean;
  isCurrentDevice?: boolean;
};

function devicePayload() {
  return {
    deviceId: getOrCreateDeviceId(),
    deviceName: detectDeviceName(),
    platform: detectDevicePlatform(),
    browser: detectBrowser(),
    os: detectOS(),
    appVersion: getAppVersion(),
  };
}

export type DeviceRegisterResponse =
  | {
      ok: true;
      device: UserDeviceRecord;
      limit: number;
      registered: boolean;
    }
  | {
      ok: false;
      error: "device_limit_reached";
      message: string;
      limit: number;
      devices: UserDeviceRecord[];
    };

export async function registerCurrentDevice(
  authFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
): Promise<DeviceRegisterResponse> {
  const payload = devicePayload();
  const res = await authFetch(getApiUrl("/api/devices/register"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const body = await res.json().catch(() => ({}));

  if (res.status === 402 && body?.error === "device_limit_reached") {
    track("device_limit_reached", {
      limit: body.limit,
      activeCount: Array.isArray(body.devices) ? body.devices.length : undefined,
      platform: payload.platform,
    });
    track("device_limit_bypass_attempt", {
      activeDeviceCount: Array.isArray(body.devices) ? body.devices.length : undefined,
      attemptedDevicePlatform: payload.platform,
      appVersion: payload.appVersion,
      reason: "register_rejected",
    });
    return {
      ok: false,
      error: "device_limit_reached",
      message:
        body.message ??
        "Your Premium plan supports up to 3 active devices. Remove an existing device to continue.",
      limit: body.limit ?? 3,
      devices: Array.isArray(body.devices) ? body.devices : [],
    };
  }

  if (!res.ok) {
    throw new Error(body?.message ?? "Device registration failed");
  }

  if (body.registered) {
    track("device_registered", { platform: payload.platform });
  }

  return {
    ok: true,
    device: body.device,
    limit: body.limit ?? 1,
    registered: !!body.registered,
  };
}

export async function listUserDevices(
  authFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
): Promise<{ devices: UserDeviceRecord[]; limit: number }> {
  const res = await authFetch(getApiUrl("/api/devices"));
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.message ?? "Could not load devices");
  }
  return res.json();
}

export async function removeUserDevice(
  authFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
  deviceId: string,
): Promise<void> {
  const res = await authFetch(getApiUrl(`/api/devices/${encodeURIComponent(deviceId)}`), {
    method: "DELETE",
  });
  if (!res.ok && res.status !== 204) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.message ?? "Could not remove device");
  }
  track("device_removed", { deviceId });
}

export async function replaceUserDevice(
  authFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
  removeDeviceId: string,
): Promise<DeviceRegisterResponse> {
  const payload = devicePayload();
  track("device_limit_bypass_attempt", {
    attemptedDevicePlatform: payload.platform,
    appVersion: payload.appVersion,
    reason: "replace_initiated",
  });

  const res = await authFetch(getApiUrl("/api/devices/replace"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      removeDeviceId,
      ...payload,
    }),
  });

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (res.status === 402 && body?.error === "device_limit_reached") {
      return {
        ok: false,
        error: "device_limit_reached",
        message: body.message ?? "Device limit reached",
        limit: body.limit ?? 3,
        devices: Array.isArray(body.devices) ? body.devices : [],
      };
    }
    throw new Error(body?.message ?? "Could not replace device");
  }

  track("device_replaced", {
    removedDeviceId: removeDeviceId,
    platform: payload.platform,
  });

  return {
    ok: true,
    device: body.device,
    limit: body.limit ?? 3,
    registered: !!body.registered,
  };
}
