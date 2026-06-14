import { createHash } from "node:crypto";

export type DeviceMetadataInput = {
  deviceName?: string | null;
  platform?: string | null;
  browser?: string | null;
  os?: string | null;
  appVersion?: string | null;
  clientIp?: string | null;
};

export type ParsedDeviceMetadata = {
  deviceName: string | null;
  platform: string;
  browser: string | null;
  os: string | null;
  appVersion: string | null;
  lastIpHash: string | null;
};

export function hashClientIp(ip: string | null | undefined): string | null {
  if (!ip?.trim()) return null;
  const normalized = ip.split(",")[0]?.trim() ?? "";
  if (!normalized) return null;
  return createHash("sha256").update(normalized).digest("hex").slice(0, 32);
}

export function resolveClientIp(
  forwardedFor: string | string[] | undefined,
  socketIp: string | undefined,
): string | null {
  if (typeof forwardedFor === "string" && forwardedFor.trim()) {
    return forwardedFor.split(",")[0]?.trim() ?? null;
  }
  if (Array.isArray(forwardedFor) && forwardedFor[0]) {
    return forwardedFor[0].split(",")[0]?.trim() ?? null;
  }
  return socketIp?.trim() || null;
}

/** Normalize registration metadata from client body + request context. */
export function normalizeDeviceMetadata(input: DeviceMetadataInput): ParsedDeviceMetadata {
  const platform = input.platform?.trim() || "unknown";
  const browser = input.browser?.trim() || null;
  const os = input.os?.trim() || null;
  const appVersion = input.appVersion?.trim() || null;
  const deviceName =
    input.deviceName?.trim() ||
    (browser && os ? `${browser} on ${os}` : null);

  return {
    deviceName,
    platform,
    browser,
    os,
    appVersion,
    lastIpHash: hashClientIp(input.clientIp),
  };
}

export function formatDeviceSubtitle(browser: string | null, os: string | null, platform: string): string {
  if (browser && os) return `${browser} on ${os}`;
  if (browser) return browser;
  if (os) return os;
  return platform;
}
