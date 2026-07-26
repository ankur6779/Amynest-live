import { parseApiJson } from "@/lib/safe-json-response";
import { isCapacitorNative } from "@/lib/capacitor-native";

export interface GeoCoords {
  latitude: number;
  longitude: number;
}

export type LocationSource = "gps" | "ip" | "manual";

export type GeoPermissionState = "granted" | "denied" | "prompt" | "unknown";

export interface ReverseGeocodeResult {
  countryCode: string;
  countryName: string;
}

export interface ResolvedLocation {
  coords: GeoCoords | null;
  country: ReverseGeocodeResult;
  source: LocationSource;
}

export function isGeoPermissionDenied(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = (error as { code?: number }).code;
  return code === 1; // PERMISSION_DENIED
}

export async function checkGeoPermission(): Promise<GeoPermissionState> {
  if (typeof window === "undefined") return "unknown";

  if (isCapacitorNative()) {
    try {
      const { Geolocation } = await import("@capacitor/geolocation");
      const result = await Geolocation.checkPermissions();
      const state = result.location as string;
      if (state === "granted" || state === "limited") return "granted";
      if (state === "denied") return "denied";
      return "prompt";
    } catch {
      return "unknown";
    }
  }

  if (navigator.permissions?.query) {
    try {
      const status = await navigator.permissions.query({ name: "geolocation" });
      if (status.state === "granted") return "granted";
      if (status.state === "denied") return "denied";
      return "prompt";
    } catch {
      return "unknown";
    }
  }

  return "unknown";
}

async function getCoordsFromGps(timeout = 10_000): Promise<GeoCoords> {
  if (isCapacitorNative()) {
    const { Geolocation } = await import("@capacitor/geolocation");
    const pos = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout,
      maximumAge: 0,
    });
    return {
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
    };
  }

  if (!navigator.geolocation) {
    throw new Error("geolocation-unavailable");
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      }),
      reject,
      { enableHighAccuracy: true, timeout, maximumAge: 0 },
    );
  });
}

/**
 * Request location inside a user gesture (button click).
 * Capacitor: requestPermissions → getCurrentPosition.
 * Web: getCurrentPosition directly (triggers the browser prompt).
 */
export async function requestLocationWithUserGesture(): Promise<ResolvedLocation> {
  if (isCapacitorNative()) {
    const { Geolocation } = await import("@capacitor/geolocation");
    const perm = await Geolocation.requestPermissions();
    const state = perm.location as string;
    if (state !== "granted" && state !== "limited") {
      throw new Error("permission-denied");
    }
  }

  const coords = await getCoordsFromGps();
  const country = await reverseGeocodeCountry(coords.latitude, coords.longitude);
  if (!country) throw new Error("geocode-failed");

  return { coords, country, source: "gps" };
}

/** Silent GPS read when permission was already granted (no new prompt). */
export async function fetchGrantedLocation(): Promise<ResolvedLocation> {
  const coords = await getCoordsFromGps();
  const country = await reverseGeocodeCountry(coords.latitude, coords.longitude);
  if (!country) throw new Error("geocode-failed");
  return { coords, country, source: "gps" };
}

const GEOCODE_TIMEOUT_MS = 3_000;

export async function reverseGeocodeCountry(
  latitude: number,
  longitude: number,
  timeoutMs = GEOCODE_TIMEOUT_MS,
): Promise<ReverseGeocodeResult | null> {
  const controller = new AbortController();
  const tid = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=en&zoom=3`,
      {
        headers: { "User-Agent": "AmyNest/1.0 (parenting-app)" },
        signal: controller.signal,
      },
    );
    if (!res.ok) return null;

    const data = await parseApiJson<{
      address?: { country?: string; country_code?: string };
    }>(res);
    const countryCode = data.address?.country_code?.toUpperCase();
    const countryName = data.address?.country?.trim();
    if (!countryCode || countryCode.length !== 2) return null;

    return {
      countryCode,
      countryName: countryName || countryCode,
    };
  } catch {
    return null;
  } finally {
    window.clearTimeout(tid);
  }
}

export async function detectCountryFromIp(): Promise<ReverseGeocodeResult | null> {
  try {
    const controller = new AbortController();
    const tid = window.setTimeout(() => controller.abort(), 4000);
    const res = await fetch("https://ipapi.co/json/", { signal: controller.signal });
    window.clearTimeout(tid);
    if (!res.ok) return null;

    const data = await parseApiJson<{ country_code?: string;country_name?: string }>(res);
    if (!data.country_code || !data.country_name) return null;

    return {
      countryCode: data.country_code.toUpperCase(),
      countryName: data.country_name,
    };
  } catch {
    return null;
  }
}

export async function resolveLocationFallback(): Promise<ResolvedLocation | null> {
  const ipCountry = await detectCountryFromIp();
  if (!ipCountry) return null;
  return { coords: null, country: ipCountry, source: "ip" };
}
