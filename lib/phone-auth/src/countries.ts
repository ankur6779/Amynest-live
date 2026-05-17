import { getCountries, getCountryCallingCode } from "libphonenumber-js";
import type { CountryCode } from "libphonenumber-js";

export type PhoneCountry = {
  code: CountryCode;
  name: string;
  dialCode: string;
  flag: string;
};

const displayNames =
  typeof Intl !== "undefined"
    ? new Intl.DisplayNames(["en"], { type: "region" })
    : null;

export function countryCodeToFlag(code: string): string {
  return code
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));
}

function countryName(code: CountryCode): string {
  return displayNames?.of(code) ?? code;
}

/** All supported countries, sorted by name. */
export const PHONE_COUNTRIES: PhoneCountry[] = getCountries()
  .map((code) => ({
    code,
    name: countryName(code),
    dialCode: `+${getCountryCallingCode(code)}`,
    flag: countryCodeToFlag(code),
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

export const DEFAULT_COUNTRY_CODE: CountryCode = "IN";

export function getCountryByCode(code: string): PhoneCountry | undefined {
  return PHONE_COUNTRIES.find((c) => c.code === code);
}

export function getDefaultCountry(): PhoneCountry {
  return getCountryByCode(DEFAULT_COUNTRY_CODE) ?? PHONE_COUNTRIES[0]!;
}
