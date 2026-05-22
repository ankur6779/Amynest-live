import { isCapacitorNative } from "@/lib/capacitor-native";

export interface GeoCoords {
  latitude: number;
  longitude: number;
}

export type GeoPermissionState = "granted" | "denied" | "prompt" | "unknown";

export interface ReverseGeocodeResult {
  countryCode: string;
  countryName: string;
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

export async function requestGeoPermission(): Promise<GeoPermissionState> {
  if (isCapacitorNative()) {
    try {
      const { Geolocation } = await import("@capacitor/geolocation");
      const result = await Geolocation.requestPermissions();
      const state = result.location as string;
      if (state === "granted" || state === "limited") return "granted";
      if (state === "denied") return "denied";
      return "prompt";
    } catch {
      return "unknown";
    }
  }

  return "unknown";
}

export async function getCurrentCoords(options?: { timeout?: number }): Promise<GeoCoords> {
  const timeout = options?.timeout ?? 12_000;

  if (isCapacitorNative()) {
    const { Geolocation } = await import("@capacitor/geolocation");
    const pos = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout,
      maximumAge: 120_000,
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
      { enableHighAccuracy: true, timeout, maximumAge: 120_000 },
    );
  });
}

export async function reverseGeocodeCountry(
  latitude: number,
  longitude: number,
): Promise<ReverseGeocodeResult | null> {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=en&zoom=3`,
    { headers: { "User-Agent": "AmyNest/1.0 (parenting-app)" } },
  );
  if (!res.ok) return null;

  const data = (await res.json()) as {
    address?: { country?: string; country_code?: string };
  };
  const countryCode = data.address?.country_code?.toUpperCase();
  const countryName = data.address?.country?.trim();
  if (!countryCode || countryCode.length !== 2) return null;

  return {
    countryCode,
    countryName: countryName || countryCode,
  };
}
