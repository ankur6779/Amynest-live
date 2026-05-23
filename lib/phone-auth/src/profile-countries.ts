import { countryCodeToFlag, getCountryByCode } from "./countries";

/** ISO-2 country entry for parent profile & localization (curated launch + common markets). */
export type ProfileCountry = {
  code: string;
  name: string;
  flag: string;
};

const PROFILE_COUNTRY_ENTRIES: ReadonlyArray<readonly [string, string]> = [
  ["US", "United States"],
  ["GB", "United Kingdom"],
  ["CA", "Canada"],
  ["AU", "Australia"],
  ["AE", "UAE"],
  ["IN", "India"],
  ["NZ", "New Zealand"],
  ["SG", "Singapore"],
  ["MY", "Malaysia"],
  ["PK", "Pakistan"],
  ["BD", "Bangladesh"],
  ["LK", "Sri Lanka"],
  ["NP", "Nepal"],
  ["PH", "Philippines"],
  ["ID", "Indonesia"],
  ["TH", "Thailand"],
  ["VN", "Vietnam"],
  ["JP", "Japan"],
  ["KR", "South Korea"],
  ["CN", "China"],
  ["HK", "Hong Kong"],
  ["DE", "Germany"],
  ["FR", "France"],
  ["IT", "Italy"],
  ["ES", "Spain"],
  ["NL", "Netherlands"],
  ["BE", "Belgium"],
  ["SE", "Sweden"],
  ["NO", "Norway"],
  ["DK", "Denmark"],
  ["FI", "Finland"],
  ["CH", "Switzerland"],
  ["AT", "Austria"],
  ["PT", "Portugal"],
  ["IE", "Ireland"],
  ["PL", "Poland"],
  ["SA", "Saudi Arabia"],
  ["QA", "Qatar"],
  ["KW", "Kuwait"],
  ["BH", "Bahrain"],
  ["OM", "Oman"],
  ["EG", "Egypt"],
  ["TR", "Turkey"],
  ["IL", "Israel"],
  ["JO", "Jordan"],
  ["LB", "Lebanon"],
  ["ZA", "South Africa"],
  ["KE", "Kenya"],
  ["NG", "Nigeria"],
  ["GH", "Ghana"],
  ["MX", "Mexico"],
  ["BR", "Brazil"],
  ["AR", "Argentina"],
  ["CO", "Colombia"],
  ["RU", "Russia"],
  ["MV", "Maldives"],
  ["MM", "Myanmar"],
];

export const PROFILE_COUNTRIES: ProfileCountry[] = PROFILE_COUNTRY_ENTRIES.map(
  ([code, name]) => ({
    code,
    name,
    flag: countryCodeToFlag(code),
  }),
);

export function getProfileCountryByCode(
  code: string | null | undefined,
): ProfileCountry | undefined {
  if (!code?.trim()) return undefined;
  const upper = code.trim().toUpperCase();
  const curated = PROFILE_COUNTRIES.find((c) => c.code === upper);
  if (curated) return curated;
  const phone = getCountryByCode(upper);
  if (phone) {
    return { code: phone.code, name: phone.name, flag: phone.flag };
  }
  return { code: upper, name: upper, flag: countryCodeToFlag(upper) };
}

export function filterProfileCountries(
  countries: readonly ProfileCountry[],
  query: string,
): ProfileCountry[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...countries];
  return countries.filter(
    (c) =>
      c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q),
  );
}
