/** Supported notification locales (BCP 47). */
export const SUPPORTED_LOCALES = [
  "en-US",
  "en-GB",
  "es",
  "pt",
  "fr",
  "de",
  "ar",
  "hi",
  "ja",
  "ko",
  "id",
] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export function normalizeLocale(raw: string | null | undefined): SupportedLocale {
  const s = (raw ?? "en-US").trim();
  if ((SUPPORTED_LOCALES as readonly string[]).includes(s)) return s as SupportedLocale;
  const lang = s.split("-")[0]?.toLowerCase();
  const byLang: Record<string, SupportedLocale> = {
    en: s.toUpperCase().includes("GB") ? "en-GB" : "en-US",
    es: "es",
    pt: "pt",
    fr: "fr",
    de: "de",
    ar: "ar",
    hi: "hi",
    ja: "ja",
    ko: "ko",
    id: "id",
  };
  return byLang[lang ?? ""] ?? "en-US";
}

export function isRtlLocale(locale: SupportedLocale): boolean {
  return locale === "ar";
}

/** Nutrition / cultural region buckets. */
export type CulturalRegion =
  | "south_asia"
  | "north_america"
  | "europe"
  | "latin_america"
  | "middle_east"
  | "east_asia"
  | "southeast_asia"
  | "oceania"
  | "africa";

export function culturalRegionFromCountry(countryCode: string | null | undefined): CulturalRegion {
  const cc = (countryCode ?? "IN").toUpperCase();
  if (["IN", "PK", "BD", "LK", "NP"].includes(cc)) return "south_asia";
  if (["US", "CA"].includes(cc)) return "north_america";
  if (["GB", "IE", "DE", "FR", "ES", "IT", "NL", "BE", "AT", "CH", "SE", "NO", "DK", "FI", "PL"].includes(cc)) {
    return "europe";
  }
  if (["BR", "MX", "AR", "CO", "CL", "PE"].includes(cc)) return "latin_america";
  if (["AE", "SA", "QA", "KW", "BH", "OM", "EG", "JO", "LB"].includes(cc)) return "middle_east";
  if (["JP", "KR", "CN", "TW", "HK"].includes(cc)) return "east_asia";
  if (["ID", "SG", "MY", "TH", "VN", "PH"].includes(cc)) return "southeast_asia";
  if (["AU", "NZ"].includes(cc)) return "oceania";
  if (["ZA", "NG", "KE", "GH"].includes(cc)) return "africa";
  return "south_asia";
}

export function defaultLocaleForCountry(countryCode: string | null | undefined): SupportedLocale {
  const cc = (countryCode ?? "").toUpperCase();
  const map: Record<string, SupportedLocale> = {
    US: "en-US",
    GB: "en-GB",
    IN: "hi",
    AE: "ar",
    SA: "ar",
    DE: "de",
    FR: "fr",
    ES: "es",
    BR: "pt",
    MX: "es",
    JP: "ja",
    KR: "ko",
    ID: "id",
    AU: "en-US",
  };
  return map[cc] ?? "en-US";
}
