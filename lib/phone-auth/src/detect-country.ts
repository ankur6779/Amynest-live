import type { CountryCode } from "libphonenumber-js";
import {
  DEFAULT_COUNTRY_CODE,
  getCountryByCode,
  getDefaultCountry,
  type PhoneCountry,
} from "./countries";

/** IANA timezone → ISO country (common zones; first match used for detection). */
const TIMEZONE_COUNTRY: Record<string, CountryCode> = {
  "Asia/Kolkata": "IN",
  "Asia/Calcutta": "IN",
  "America/New_York": "US",
  "America/Chicago": "US",
  "America/Denver": "US",
  "America/Los_Angeles": "US",
  "America/Phoenix": "US",
  "America/Anchorage": "US",
  "Pacific/Honolulu": "US",
  "Europe/London": "GB",
  "Asia/Dubai": "AE",
  "America/Toronto": "CA",
  "America/Vancouver": "CA",
  "Australia/Sydney": "AU",
  "Asia/Singapore": "SG",
  "Asia/Tokyo": "JP",
  "Europe/Berlin": "DE",
  "Europe/Paris": "FR",
};

function regionFromNavigatorLocale(): CountryCode | null {
  if (typeof navigator === "undefined") return null;
  const locales = navigator.languages?.length
    ? navigator.languages
    : [navigator.language];
  for (const locale of locales) {
    const match = locale.match(/-([A-Za-z]{2})\b/);
    if (match?.[1]) {
      const code = match[1].toUpperCase() as CountryCode;
      if (getCountryByCode(code)) return code;
    }
  }
  return null;
}

function regionFromTimezone(): CountryCode | null {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return TIMEZONE_COUNTRY[tz] ?? null;
  } catch {
    return null;
  }
}

/** Prefer browser locale, then timezone, then India fallback. */
export function detectDefaultCountry(): PhoneCountry {
  const fromLocale = regionFromNavigatorLocale();
  if (fromLocale) {
    const c = getCountryByCode(fromLocale);
    if (c) return c;
  }
  const fromTz = regionFromTimezone();
  if (fromTz) {
    const c = getCountryByCode(fromTz);
    if (c) return c;
  }
  return getCountryByCode(DEFAULT_COUNTRY_CODE) ?? getDefaultCountry();
}
