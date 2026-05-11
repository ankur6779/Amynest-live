// Resolves the lat/lng the engine should fetch weather for.
//
// Until the parent profile UI gathers a precise address, we use a small
// country/region → major-city mapping so the orchestrator works
// out-of-the-box for the existing user base (predominantly India).

interface DefaultLocation {
  latitude: number;
  longitude: number;
  label: string;
  timezone: string;
}

const COUNTRY_DEFAULTS: Record<string, DefaultLocation> = {
  IN: { latitude: 28.6139, longitude: 77.2090,  label: "Delhi, IN",       timezone: "Asia/Kolkata" },
  US: { latitude: 40.7128, longitude: -74.0060, label: "New York, US",    timezone: "America/New_York" },
  GB: { latitude: 51.5074, longitude: -0.1278,  label: "London, UK",      timezone: "Europe/London" },
  AE: { latitude: 25.2048, longitude: 55.2708,  label: "Dubai, AE",       timezone: "Asia/Dubai" },
  SG: { latitude: 1.3521,  longitude: 103.8198, label: "Singapore",       timezone: "Asia/Singapore" },
  AU: { latitude: -33.8688,longitude: 151.2093, label: "Sydney, AU",      timezone: "Australia/Sydney" },
  CA: { latitude: 43.6532, longitude: -79.3832, label: "Toronto, CA",     timezone: "America/Toronto" },
};

const REGION_DEFAULTS: Record<string, DefaultLocation> = {
  north_indian:    { latitude: 28.6139, longitude: 77.2090, label: "Delhi, IN",     timezone: "Asia/Kolkata" },
  south_indian:    { latitude: 12.9716, longitude: 77.5946, label: "Bengaluru, IN", timezone: "Asia/Kolkata" },
  bengali:         { latitude: 22.5726, longitude: 88.3639, label: "Kolkata, IN",   timezone: "Asia/Kolkata" },
  gujarati:        { latitude: 23.0225, longitude: 72.5714, label: "Ahmedabad, IN", timezone: "Asia/Kolkata" },
  maharashtrian:   { latitude: 19.0760, longitude: 72.8777, label: "Mumbai, IN",    timezone: "Asia/Kolkata" },
  punjabi:         { latitude: 30.7333, longitude: 76.7794, label: "Chandigarh, IN",timezone: "Asia/Kolkata" },
  pan_indian:      { latitude: 28.6139, longitude: 77.2090, label: "Delhi, IN",     timezone: "Asia/Kolkata" },
};

const FALLBACK: DefaultLocation = COUNTRY_DEFAULTS.IN!;

export function resolveDefaultLocation(input: {
  latitude?: number | null;
  longitude?: number | null;
  country?: string | null;
  region?: string | null;
}): DefaultLocation {
  if (input.latitude != null && input.longitude != null) {
    return {
      latitude: input.latitude,
      longitude: input.longitude,
      label: "User location",
      timezone: "auto",
    };
  }
  if (input.country) {
    const normalized = input.country.trim().toUpperCase().slice(0, 2);
    const hit = COUNTRY_DEFAULTS[normalized];
    if (hit) return hit;
  }
  if (input.region) {
    const hit = REGION_DEFAULTS[input.region.trim().toLowerCase()];
    if (hit) return hit;
  }
  return FALLBACK;
}
