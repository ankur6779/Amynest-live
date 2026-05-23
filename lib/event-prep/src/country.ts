import type { CountryConfig, EventPrepCountry } from "./eventTypes";

const TIMEZONE_TO_COUNTRY: Partial<Record<string, EventPrepCountry>> = {
  "Asia/Kolkata": "IN",
  "Asia/Calcutta": "IN",
  "America/New_York": "US",
  "America/Chicago": "US",
  "America/Denver": "US",
  "America/Los_Angeles": "US",
  "America/Phoenix": "US",
  "America/Anchorage": "US",
  "America/Boise": "US",
  "America/Indiana/Indianapolis": "US",
  "America/Detroit": "US",
  "America/Kentucky/Louisville": "US",
  "America/Indiana/Vincennes": "US",
  "America/Juneau": "US",
  "Pacific/Honolulu": "US",
  "Europe/London": "GB",
  "Europe/Belfast": "GB",
  "Australia/Sydney": "AU",
  "Australia/Melbourne": "AU",
  "Australia/Brisbane": "AU",
  "Australia/Perth": "AU",
  "Australia/Adelaide": "AU",
  "Australia/Darwin": "AU",
  "Australia/Hobart": "AU",
  "Australia/Canberra": "AU",
  "America/Toronto": "CA",
  "America/Vancouver": "CA",
  "America/Edmonton": "CA",
  "America/Winnipeg": "CA",
  "America/Regina": "CA",
  "America/Halifax": "CA",
  "America/St_Johns": "CA",
  "America/Whitehorse": "CA",
  "Pacific/Auckland": "NZ",
  "Pacific/Chatham": "NZ",
};

const LOCALE_TO_COUNTRY: Partial<Record<string, EventPrepCountry>> = {
  "en-IN": "IN",
  "hi-IN": "IN",
  "en-US": "US",
  "en-GB": "GB",
  "en-AU": "AU",
  "en-CA": "CA",
  "en-NZ": "NZ",
};

export const COUNTRY_CONFIGS: Record<EventPrepCountry, CountryConfig> = {
  IN: { code: "IN", flag: "🇮🇳", label: "India" },
  US: { code: "US", flag: "🇺🇸", label: "United States" },
  GB: { code: "GB", flag: "🇬🇧", label: "United Kingdom" },
  AU: { code: "AU", flag: "🇦🇺", label: "Australia" },
  CA: { code: "CA", flag: "🇨🇦", label: "Canada" },
  NZ: { code: "NZ", flag: "🇳🇿", label: "New Zealand" },
  global: { code: "global", flag: "🌍", label: "Global" },
};

/** Fallback hierarchy: explicit override → locale → timezone → global. */
export function detectEventPrepCountry(
  override?: EventPrepCountry | null,
): EventPrepCountry {
  if (override && override !== "global") return override;

  try {
    const locales =
      typeof navigator !== "undefined" && navigator.language
        ? [navigator.language, ...(navigator.languages ?? [])]
        : [];
    for (const loc of locales) {
      const hit = LOCALE_TO_COUNTRY[loc] ?? LOCALE_TO_COUNTRY[loc.split("-")[0] + "-" + loc.split("-")[1]?.toUpperCase()];
      if (hit) return hit;
    }
  } catch {
    /* ignore */
  }

  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const fromTz = TIMEZONE_TO_COUNTRY[tz];
    if (fromTz) return fromTz;
  } catch {
    /* ignore */
  }

  return "global";
}

export function countryConfig(code: EventPrepCountry): CountryConfig {
  return COUNTRY_CONFIGS[code];
}
