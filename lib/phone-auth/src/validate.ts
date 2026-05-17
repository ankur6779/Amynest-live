import {
  parsePhoneNumberFromString,
  isValidPhoneNumber,
  type CountryCode,
} from "libphonenumber-js";
import type { PhoneCountry } from "./countries";

/** Build E.164 (+14155552671) from national digits and country. */
export function formatPhoneE164(
  nationalDigits: string,
  countryCode: CountryCode,
): string | null {
  const digits = nationalDigits.replace(/\D/g, "");
  if (!digits) return null;
  const parsed = parsePhoneNumberFromString(digits, countryCode);
  if (parsed?.isValid()) return parsed.format("E.164");
  return null;
}

export function isValidNationalPhone(
  nationalDigits: string,
  countryCode: CountryCode,
): boolean {
  const digits = nationalDigits.replace(/\D/g, "");
  if (!digits) return false;
  try {
    return isValidPhoneNumber(digits, countryCode);
  } catch {
    return false;
  }
}

export function filterCountries(
  countries: readonly PhoneCountry[],
  query: string,
): PhoneCountry[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...countries];
  return countries.filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      c.dialCode.includes(q) ||
      c.code.toLowerCase().includes(q),
  );
}
