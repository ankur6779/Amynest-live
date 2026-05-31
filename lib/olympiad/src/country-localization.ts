import type {
  OlympiadAgeBand,
  OlympiadDifficulty,
  OlympiadQuestion,
  OlympiadSubject,
} from "./types.js";

const SUPPORTED = new Set(["IN", "US", "UK", "AU", "NZ", "AE"]);

/** Align with Smart Study Zone country keys. */
export function normalizeOlympiadCountry(raw?: string | null): string {
  if (!raw?.trim()) return "US";
  const u = raw.trim().toUpperCase();
  if (u === "GB") return "UK";
  return SUPPORTED.has(u) ? u : "DEFAULT";
}

export interface CountryProfile {
  code: string;
  label: string;
  currency: string;
  currencyName: string;
  fruit: string;
  snack: string;
  schoolItem: string;
  transport: string;
  festival: string;
  capital: string;
}

export const COUNTRY_PROFILES: Record<string, CountryProfile> = {
  IN: {
    code: "IN",
    label: "India",
    currency: "₹",
    currencyName: "rupees",
    fruit: "mango",
    snack: "ladoo",
    schoolItem: "school bag",
    transport: "auto-rickshaw",
    festival: "Diwali",
    capital: "New Delhi",
  },
  US: {
    code: "US",
    label: "United States",
    currency: "$",
    currencyName: "dollars",
    fruit: "apple",
    snack: "cookie",
    schoolItem: "school bus",
    transport: "yellow bus",
    festival: "Thanksgiving",
    capital: "Washington, D.C.",
  },
  UK: {
    code: "UK",
    label: "United Kingdom",
    currency: "£",
    currencyName: "pounds",
    fruit: "apple",
    snack: "biscuit",
    schoolItem: "school uniform",
    transport: "double-decker bus",
    festival: "Christmas",
    capital: "London",
  },
  AE: {
    code: "AE",
    label: "UAE",
    currency: "د.إ",
    currencyName: "dirhams",
    fruit: "dates",
    snack: "dates",
    schoolItem: "backpack",
    transport: "metro",
    festival: "Eid",
    capital: "Abu Dhabi",
  },
  AU: {
    code: "AU",
    label: "Australia",
    currency: "A$",
    currencyName: "dollars",
    fruit: "mango",
    snack: "Tim Tam",
    schoolItem: "school hat",
    transport: "tram",
    festival: "Australia Day",
    capital: "Canberra",
  },
  NZ: {
    code: "NZ",
    label: "New Zealand",
    currency: "NZ$",
    currencyName: "dollars",
    fruit: "kiwi fruit",
    snack: "ANZAC biscuit",
    schoolItem: "school bag",
    transport: "ferry",
    festival: "Waitangi Day",
    capital: "Wellington",
  },
  DEFAULT: {
    code: "DEFAULT",
    label: "your country",
    currency: "$",
    currencyName: "dollars",
    fruit: "apple",
    snack: "cookie",
    schoolItem: "backpack",
    transport: "bus",
    festival: "a local festival",
    capital: "the capital city",
  },
};

export function countryProfile(country: string): CountryProfile {
  const key = SUPPORTED.has(country) ? country : "DEFAULT";
  return COUNTRY_PROFILES[key] ?? COUNTRY_PROFILES.DEFAULT!;
}

const LOCALIZE_REPLACEMENTS: Record<string, Array<[RegExp, string]>> = {
  IN: [],
  US: [
    [/₹/g, "$"],
    [/rupees?/gi, "dollars"],
    [/mango/gi, "apple"],
    [/Diwali/g, "Thanksgiving"],
    [/New Delhi/gi, "Washington, D.C."],
    [/India(?:n)?/gi, "American"],
  ],
  UK: [
    [/₹/g, "£"],
    [/rupees?/gi, "pounds"],
    [/India(?:n)?/gi, "British"],
    [/New Delhi/gi, "London"],
  ],
  AE: [
    [/₹/g, "د.إ"],
    [/rupees?/gi, "dirhams"],
    [/mango/gi, "dates"],
    [/school bag/gi, "backpack"],
    [/Diwali/g, "Eid"],
    [/New Delhi/gi, "Abu Dhabi"],
  ],
  AU: [
    [/₹/g, "A$"],
    [/rupees?/gi, "Australian dollars"],
    [/India(?:n)?/gi, "Australian"],
  ],
  NZ: [
    [/₹/g, "NZ$"],
    [/rupees?/gi, "New Zealand dollars"],
    [/India(?:n)?/gi, "New Zealand"],
  ],
};

/** Apply light country swaps — skipped for global-first bank rows. */
export function localizeOlympiadQuestion(
  q: OlympiadQuestion,
  country: string,
): OlympiadQuestion {
  if (q.countryCode === "GLOBAL") return q;
  const key = normalizeOlympiadCountry(country);
  if (key === "IN") return q;
  const rules = LOCALIZE_REPLACEMENTS[key] ?? [];
  let question = q.question;
  let explanation = q.explanation;
  const options = [...q.options] as [string, string, string, string];
  for (const [re, rep] of rules) {
    question = question.replace(re, rep);
    explanation = explanation.replace(re, rep);
    for (let i = 0; i < options.length; i++) {
      options[i] = options[i]!.replace(re, rep);
    }
  }
  return { ...q, question, explanation, options };
}

function Q(
  id: string,
  ageBand: OlympiadAgeBand,
  difficulty: OlympiadDifficulty,
  question: string,
  options: [string, string, string, string],
  correct: 0 | 1 | 2 | 3,
  explanation: string,
  countryCode: string,
): OlympiadQuestion {
  return {
    id: `gk-${countryCode}-${id}`,
    subject: "gk",
    ageBand,
    difficulty,
    question,
    options,
    correct,
    explanation,
    tracks: ["gk_olympiad"],
    countryCode,
  };
}

/** Country-specific GK olympiad questions merged into the bank at runtime. */
export function countryGkQuestions(country: string): OlympiadQuestion[] {
  const key = normalizeOlympiadCountry(country);

  const sets: Record<string, OlympiadQuestion[]> = {
    IN: [
      Q("in-cap", "tiny", "easy", "Capital of India?", ["Mumbai", "New Delhi", "Chennai", "Kolkata"], 1, "New Delhi is the capital of India.", "IN"),
      Q("in-animal", "tiny", "medium", "National animal of India?", ["Lion", "Tiger", "Elephant", "Peacock"], 1, "The Royal Bengal Tiger is India's national animal.", "IN"),
      Q("in-flag", "junior", "easy", "Top colour on India's flag?", ["Green", "White", "Saffron", "Blue"], 2, "Saffron is at the top of the Indian flag.", "IN"),
      Q("in-fest", "tiny", "easy", "Festival of lights in India?", ["Holi", "Diwali", "Eid", "Christmas"], 1, "Diwali is the festival of lights.", "IN"),
      Q("in-curr", "junior", "medium", "Currency of India?", ["Dollar", "Pound", "Rupee", "Yen"], 2, "India uses the rupee (₹).", "IN"),
    ],
    US: [
      Q("us-cap", "junior", "easy", "Capital of the United States?", ["New York", "Washington, D.C.", "Los Angeles", "Chicago"], 1, "Washington, D.C. is the US capital.", "US"),
      Q("us-bird", "junior", "easy", "National bird of the US?", ["Robin", "Bald eagle", "Parrot", "Owl"], 1, "The bald eagle is the national bird.", "US"),
      Q("us-flag", "junior", "medium", "Stars on the US flag stand for?", ["Cities", "States", "Presidents", "Oceans"], 1, "Each star represents a state.", "US"),
      Q("us-curr", "tiny", "easy", "US money is called?", ["Pounds", "Rupees", "Dollars", "Euros"], 2, "The US uses dollars ($).", "US"),
    ],
    UK: [
      Q("uk-cap", "junior", "easy", "Capital of the United Kingdom?", ["Paris", "London", "Dublin", "Edinburgh"], 1, "London is the UK capital.", "UK"),
      Q("uk-flag", "junior", "medium", "The UK flag is called the ___?", ["Stars and Stripes", "Union Jack", "Tricolour", "Maple Leaf"], 1, "The Union Jack is the UK flag.", "UK"),
      Q("uk-curr", "junior", "easy", "UK currency?", ["Dollars", "Pounds", "Rupees", "Euros"], 1, "The UK uses pounds (£).", "UK"),
    ],
    AE: [
      Q("ae-cap", "junior", "easy", "Capital of the UAE?", ["Dubai", "Abu Dhabi", "Sharjah", "Riyadh"], 1, "Abu Dhabi is the UAE capital.", "AE"),
      Q("ae-curr", "junior", "easy", "UAE currency?", ["Riyal", "Dirham", "Dollar", "Dinar"], 1, "The UAE uses dirhams.", "AE"),
      Q("ae-fruit", "tiny", "easy", "Famous fruit in the UAE?", ["Apple", "Dates", "Mango", "Grapes"], 1, "Dates are famous in the UAE.", "AE"),
      Q("ae-bird", "junior", "medium", "National bird of the UAE?", ["Peacock", "Falcon", "Eagle", "Parrot"], 1, "The falcon is the UAE national bird.", "AE"),
    ],
    DEFAULT: [
      Q("def-cap-us", "junior", "easy", "Capital of the United States?", ["New York", "Washington, D.C.", "Los Angeles", "Chicago"], 1, "Washington, D.C. is the capital.", "DEFAULT"),
      Q("def-cap-uk", "junior", "easy", "Capital of the United Kingdom?", ["Paris", "London", "Dublin", "Berlin"], 1, "London is the capital.", "DEFAULT"),
      Q("def-cap-fr", "junior", "medium", "Capital of France?", ["Rome", "Berlin", "Paris", "Madrid"], 2, "Paris is the capital of France.", "DEFAULT"),
    ],
  };

  return sets[key] ?? sets.DEFAULT!;
}

export function countryLabel(country: string): string {
  return countryProfile(normalizeOlympiadCountry(country)).label;
}
